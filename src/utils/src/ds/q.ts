export class Queue<T> {
    private queue: T[] = [];
    constructor(public maxLength: number = 10) {}
    public size(): number {
        return this.queue.length;
    }
    public isEmpty(): boolean {
        return this.size() === 0;
    }
    public peek(): T | undefined {
        return this.queue[0];
    }
    public enqueue(item: any) {
        this.queue.push(item);
        if (this.size() > this.maxLength) {
            this.dequeue();
        }
    }
    public dequeue(): T | undefined {
        if (this.isEmpty()) return undefined;
        return this.queue.shift();
    }
    public clear() {
        this.queue = [];
    }
    public toArray(): T[] {
        return this.queue;
    }
    public toString(): string {
        return this.queue.toString();
    }
    public sum(): number {
        if (this.isEmpty()) return 0;
        if (this.queue.some((val) => typeof val !== "number")) return NaN;
        return this.queue.reduce((acc, val) => acc + (val as number), 0);
    }
    public average(): number {
        return this.sum() / this.size();
    }
}