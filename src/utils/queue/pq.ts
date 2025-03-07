export class PriorityQueue<T> {
    private heap: T[] = [];
  
    constructor(private comparator: (a: T, b: T) => number) {}
  
    public size(): number {
        return this.heap.length;
    }
  
    public isEmpty(): boolean {
        return this.size() === 0;
    }
  
    public peek(): T | undefined {
        return this.heap[0];
    }
  
    public push(item: T) {
        this.heap.push(item);
        this.bubbleUp(this.heap.length - 1);
    }
  
    public pop(): T | undefined {
        if (this.isEmpty()) return undefined;
        this.swap(0, this.heap.length - 1);
        const popped = this.heap.pop();
        this.bubbleDown(0);
        return popped;
    }
  
    private bubbleUp(index: number) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.comparator(this.heap[index], this.heap[parentIndex]) < 0) {
                this.swap(index, parentIndex);
                index = parentIndex;
            } else {
                break;
            }
      }
    }
  
    private bubbleDown(index: number) {
        const length = this.heap.length;
        while (true) {
            const left = 2 * index + 1;
            const right = 2 * index + 2;
            let smallest = index;
            if (left < length && this.comparator(this.heap[left], this.heap[smallest]) < 0) {
                smallest = left;
            }
            if (right < length && this.comparator(this.heap[right], this.heap[smallest]) < 0) {
                smallest = right;
            }
            if (smallest !== index) {
                this.swap(index, smallest);
                index = smallest;
            } else {
                break;
            }
        }
    }
  
    private swap(i: number, j: number) {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }
}  