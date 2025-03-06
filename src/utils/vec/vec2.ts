import { Vec } from './vec';

export class Vec2 implements Vec<Vec2> {
    [index: number]: number;
    public readonly length: number = 2;
    constructor(public x: number = 0, public y: number = 0) {
        this[0] = x;
        this[1] = y;
    }
    ToArray(): Array<number> {
        return [this.x, this.y];
    }

    FromArray(arr: Array<number>): Vec2 {
        if (arr.length !== 2) {
            throw new Error('Array must have exactly two elements.');
        }
        this.x = arr[0];
        this.y = arr[1];
        return this;
    }

    get(index: number): number {
        if (index === 0) return this.x;
        if (index === 1) return this.y;
        throw new Error('Index out of bounds');
    }

    set(index: number, value: number): void {
        if (index === 0) this.x = value;
        else if (index === 1) this.y = value;
        else throw new Error('Index out of bounds');
    }

    Dot(v: Vec2) {
        return this.x * v.x + this.y * v.y;
    }

    Dist(p: Vec2) {
        return Math.sqrt(Math.pow(p.x - this.x, 2) + Math.pow(p.y - this.y, 2));
    }

    sub(s: number) {
        return new Vec2(this.x - s, this.y - s);
    }

    Sub(v: Vec2) {
        return new Vec2(this.x - v.x, this.y - v.y);
    }

    add(s: number) {
        return new Vec2(this.x + s, this.y + s);
    }

    Add(v: Vec2) {
        return new Vec2(this.x + v.x, this.y + v.y);
    }

    mul(s: number) {
        return new Vec2(this.x * s, this.y * s);
    }

    Mul(v: Vec2) {
        return new Vec2(this.x * v.x, this.y * v.y);
    }

    div(s: number) {
        return new Vec2(this.x / s, this.y / s);
    }

    Div(v: Vec2) {
        return new Vec2(this.x / v.x, this.y / v.y);
    }

    Len() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    min() {
        return Math.min(this.x, this.y);
    }

    Min(v: Vec2) {
        return new Vec2(Math.min(this.x, v.x), Math.min(this.y, v.y));
    }

    max() {
        return Math.max(this.x, this.y);
    }

    Max(v: Vec2) {
        return new Vec2(Math.max(this.x, v.x), Math.max(this.y, v.y));
    }

    Norm() {
        return this.div(this.Len());
    }

    Neg() {
        return new Vec2(-this.x, -this.y);
    }

    toString(): string {
        return `(${this.x}, ${this.y})`;
    }
}