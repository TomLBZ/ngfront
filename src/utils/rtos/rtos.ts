import { RTOSTask, RTOSInterrupt, RTOSTaskOptions, RTOSOptions, RTOSTaskCallback, MissedDeadlinePolicy, RTOSInterruptCheck, RTOSIntervalOptions } from "./rtostypes";
import { PriorityQueue } from "../pq/pq";

export class RTOS {
    private tasks: RTOSTask[] = [];
    private interrupts: RTOSInterrupt[] = [];
    private running = false;
    private timerId: number | null = null;
    private startTime = 0;
    private nextTaskId = 1;
    private nextInterruptId = 1;
    private globalRRIndexCounter = 0; // a global round-robin counter to assign to tasks that tie
    constructor(private options: RTOSOptions) {}

    public addTask(callback: RTOSTaskCallback, options: RTOSTaskOptions | RTOSIntervalOptions): number {
        const fixedInterval : boolean = (options as RTOSIntervalOptions).intervalMs !== undefined;
        const deadlineMs = fixedInterval ? 0 : (options as RTOSTaskOptions).deadlineMs;
        const intervalMs = fixedInterval ? (options as RTOSIntervalOptions).intervalMs : 0;
        const missedPolicy = fixedInterval ? (options as RTOSIntervalOptions).missedPolicy : MissedDeadlinePolicy.SKIP;
        const task: RTOSTask = {
            id: this.nextTaskId++,
            name: options.name,
            callback,
            priority: options.priority,
            deadlineMs,
            roundRobinIndex: this.globalRRIndexCounter++,
            fixedInterval,
            intervalMs,
            nextRunTime: fixedInterval ? deadlineMs : 0,
            missedPolicy,
            // Stats
            lastRunDuration: 0,
            totalRuntime: 0,
            totalRuns: 0,
            averageRuntime: 0,
        };
        this.tasks.push(task);
        return task.id;
    }
    public addInterrupt(checkFn: RTOSInterruptCheck, callback: RTOSTaskCallback, priority: number = 1): number {
        const intr: RTOSInterrupt = {
            id: this.nextInterruptId++,
            checkFn,
            callback,
            priority,
        };
        this.interrupts.push(intr);
        return intr.id;
    }

    public start(): void {
        if (this.running) return;
        this.running = true;
        this.startTime = performance.now();
        this.timerId = window.setInterval(
            () => this.runLoop(),
            this.options.cycleIntervalMs
        );
    }
    public stop(): void {
        if (!this.running) return;
        this.running = false;
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
    public get stats(): string {
        const stats: string[] = [];
        for (const task of this.tasks) {
            stats.push(`${task.name || task.id}: ${task.totalRuns} runs, ${task.totalRuntime.toFixed(4)} ms total, ${task.averageRuntime.toFixed(4)} ms avg`);
        }
        return stats.join("\n");
    }

    private runLoop(): void {
        if (!this.running) return;
        const cycleStartTime = performance.now(); // marks the start of the cycle
        const cycleEndTime = cycleStartTime + this.options.cycleIntervalMs - this.startTime; // end time since start
        const isTriggered = this.handleInterrupts(); // Check interrupts first
        if (!this.options.continueAfterInterrupt && isTriggered) return; // if don't continue, we're done
        const elapsed = performance.now() - this.startTime; // time since start
        if (elapsed >= cycleEndTime) return; // if we're already over time, don't run tasks
        const readyQueue = this.buildReadyQueue(elapsed, this.tasks); // collect tasks into ready queue
        while (!readyQueue.isEmpty()) { // try to run all tasks in the ready queue
            if (this.options.timeSlicePerCycle && (performance.now() - this.startTime) >= cycleEndTime) {
                break; // no time left in this cycle and we're time-slicing
            }
            const task = readyQueue.pop();
            if (!task) break; // no more tasks to run
            this.runOneTask(task);
        }
    }

    private handleInterrupts(): boolean {
        const triggered = this.interrupts.filter((i) => i.checkFn()).sort((a, b) => b.priority - a.priority);
        if (triggered.length > 0) {
            for (const intr of triggered) {
                intr.callback();
            }
            return true; // any interrupt was triggered
        }
        return false; // no interrupts were triggered
    }
    private taskComparator(a: RTOSTask, b: RTOSTask): number {
        if (a.deadlineMs !== b.deadlineMs) { // 1. Compare deadline (ASC).
            return (a.deadlineMs - b.deadlineMs);
        }
        if (a.priority !== b.priority) { // 2. Compare priority (DESC). If a has bigger priority, a < b
            return (b.priority - a.priority);
        }
        return (a.roundRobinIndex - b.roundRobinIndex); // 3. Compare round-robin index (ASC).
    }
    private buildReadyQueue(elapsed: number, tasks: Array<RTOSTask>): PriorityQueue<RTOSTask> {
        const queue = new PriorityQueue<RTOSTask>(this.taskComparator);
        for (const task of tasks) {
            if (task.fixedInterval) { // Check how many intervals are missed. 
                if (elapsed >= task.nextRunTime) {
                    const interval = task.intervalMs;
                    const intervalsMissed = Math.floor((elapsed - task.nextRunTime) / interval);
                    if (intervalsMissed > 0) { // overdue at least 1 full interval
                        switch (task.missedPolicy) {
                            case MissedDeadlinePolicy.SKIP:
                                task.nextRunTime += (intervalsMissed + 1) * interval; // udpate nextRunTime without queuing
                                break;
                            case MissedDeadlinePolicy.RUN_ONCE:
                                queue.push(task); // push once, update `nextRunTime` in `runOneTask()`.
                                break;
                            case MissedDeadlinePolicy.CATCH_UP:
                                const runsToQueue = intervalsMissed + 1; // queue it N+1 times
                                for (let i = 0; i < runsToQueue; i++) {
                                    queue.push(task); // updates nextRunTime each time we run it, if out of time mid-cycle, we won't run them all
                                }
                                break;
                        }
                    } else { // intervalsMissed == 0 means it's due right now (not behind schedule)
                        queue.push(task);
                    }
                }
            } else { // Non-fixed-interval => run it once per cycle
                queue.push(task);
            }
        }
        return queue;
    }
    private runOneTask(task: RTOSTask) {
        const start = performance.now();
        task.callback(); // run the task
        const end = performance.now();
        const duration = end - start;
        // Update stats
        task.lastRunDuration = duration;
        task.totalRuntime += duration;
        task.totalRuns += 1;
        task.averageRuntime = task.totalRuntime / task.totalRuns;
        if (task.fixedInterval) { // for fix-interal tasks, update nextRunTime (post-run update)
            const interval = task.intervalMs;
            if (interval <= 0) return; // invalid interval
            const currentElapsed = end - this.startTime; // where we ended the task
            const intervalsBehind = Math.floor((currentElapsed - task.nextRunTime) / interval);
            switch (task.missedPolicy) {
                case MissedDeadlinePolicy.SKIP: // overdue tasks were skipped in the queue
                    task.nextRunTime += interval; // since we're running it now, it is not overdue, do standard increment
                    break;
                case MissedDeadlinePolicy.RUN_ONCE:
                    if (intervalsBehind > 0) { // overdue at least 1 full interval
                        task.nextRunTime += (intervalsBehind + 1) * interval; // increment by N+1 intervals
                    } else { // intervalsBehind <= 0, we move one interval ahead
                        task.nextRunTime += interval;
                    }
                    break;
                case MissedDeadlinePolicy.CATCH_UP: // multiple runs were queued in the queue
                    task.nextRunTime += interval; // increment by 1 interval for each run
                    break;
            }
        }
    }
}
