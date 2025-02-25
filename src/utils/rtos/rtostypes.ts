export enum MissedDeadlinePolicy {
    SKIP = 'SKIP',         // If the task is overdue, skip running it altogether this cycle
    CATCH_UP = 'CATCH_UP', // If the task is overdue by N intervals, run it N+1 times (if time allows)
    RUN_ONCE = 'RUN_ONCE', // If overdue by N intervals, run only once
}

export interface RTOSOptions {
    // The scheduling cycle in ms. call `runLoop()` at this interval.
    cycleIntervalMs: number;
    //  If true, after an interrupt fires, continue with normal tasks in the same cycle.
    continueAfterInterrupt: boolean;
    // If true, measure how long each task runs, and skip new tasks if we exceed the cycle time.
    timeSlicePerCycle: boolean;
}

export type RTOSTaskCallback = () => void;
export type RTOSInterruptCheck = () => boolean;

export interface RTOSTaskOptions {
    name?: string;
    priority: number;
    deadlineMs: number;
}

export interface RTOSIntervalOptions {
    name?: string;
    priority: number;
    intervalMs: number;
    missedPolicy: MissedDeadlinePolicy;
}

export interface RTOSTask {
    id: number;
    name?: string;
    callback: RTOSTaskCallback;
    // Priority-based:
    priority: number; // Higher = run first
    // EDF-based:
    deadlineMs: number; // Smaller = run first among same priority
    // Round-robin tie-break:
    roundRobinIndex: number;
    // Fixed-interval:
    fixedInterval: boolean;
    intervalMs: number;
    nextRunTime: number; // absolute time offset from start (ms)
    missedPolicy: MissedDeadlinePolicy;
    // Statistics:
    lastRunDuration: number; // ms
    totalRuntime: number;    // ms accumulated
    totalRuns: number;       // how many times we've called callback
    averageRuntime: number;  // totalRuntime / totalRuns
}

export interface RTOSInterrupt {
    id: number;
    checkFn: RTOSInterruptCheck;
    callback: RTOSTaskCallback;
    priority: number;
}