import { Vec } from "./vec";

export class Vec3 implements Vec<Vec3> {
    [index: number]: number;
    public readonly length: number = 3;
    constructor(public x: number = 0, public y: number = 0, public z: number = 0) {
        this[0] = x;
        this[1] = y;
        this[2] = z;
    }
    ToArray(): Array<number> {
        return [this.x, this.y, this.z];
    }

    FromArray(arr: Array<number>): Vec3 {
        if (arr.length !== 3) {
            throw new Error("Array must have exactly three elements.");
        }
        this.x = arr[0];
        this.y = arr[1];
        this.z = arr[2];
        return this;
    }

    get(index: number): number {
        if (index === 0) return this.x;
        if (index === 1) return this.y;
        if (index === 2) return this.z;
        throw new Error('Index out of bounds');
    }

    set(index: number, value: number): void {
        if (index === 0) this.x = value;
        else if (index === 1) this.y = value;
        else if (index === 2) this.z = value;
        else throw new Error('Index out of bounds');
    }

    Dot(v: Vec3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    Dist(v: Vec3): number {
        return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2) + Math.pow(this.z - v.z, 2));
    }

    sub(s: number): Vec3 {
        return new Vec3(this.x - s, this.y - s, this.z - s);
    }

    Sub(v: Vec3): Vec3 {
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    add(s: number): Vec3 {
        return new Vec3(this.x + s, this.y + s, this.z + s);
    }

    Add(v: Vec3): Vec3 {
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    mul(s: number): Vec3 {
        return new Vec3(this.x * s, this.y * s, this.z * s);
    }

    Mul(v: Vec3): Vec3 {
        return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
    }

    div(s: number): Vec3 {
        return new Vec3(this.x / s, this.y / s, this.z / s);
    }

    Div(v: Vec3): Vec3 {
        return new Vec3(this.x / v.x, this.y / v.y, this.z / v.z);
    }

    Len(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    min(): number {
        return Math.min(this.x, this.y, this.z);
    }

    Min(v: Vec3): Vec3 {
        return new Vec3(Math.min(this.x, v.x), Math.min(this.y, v.y), Math.min(this.z, v.z));
    }

    max(): number {
        return Math.max(this.x, this.y, this.z);
    }

    Max(v: Vec3): Vec3 {
        return new Vec3(Math.max(this.x, v.x), Math.max(this.y, v.y), Math.max(this.z, v.z));
    }

    Norm(): Vec3 {
        const len = this.Len();
        return new Vec3(this.x / len, this.y / len, this.z / len);
    }

    rotateX(rad: number): Vec3 {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return new Vec3(this.x, this.y * c - this.z * s, this.y * s + this.z * c);
    }

    rotateY(rad: number): Vec3 {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return new Vec3(this.x * c + this.z * s, this.y, -this.x * s + this.z * c);
    }

    rotateZ(rad: number): Vec3 {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return new Vec3(this.x * c - this.y * s, this.x * s + this.y * c, this.z);
    }

    rotateAxis(rad: number, axis: Vec3): Vec3 {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        const t = 1 - c;
        const x = this.x;
        const y = this.y;
        const z = this.z;
        const u = axis.x;
        const v = axis.y;
        const w = axis.z;
        const x2 = u * (u * x + v * y + w * z) * t;
        const y2 = v * (u * x + v * y + w * z) * t;
        const z2 = w * (u * x + v * y + w * z) * t;
        const x3 = x * c + x2 - w * y * s + v * z * s;
        const y3 = y * c + y2 + w * x * s - u * z * s;
        const z3 = z * c + z2 - v * x * s + u * y * s;
        return new Vec3(x3, y3, z3);
    }

    Cross(v: Vec3): Vec3 {
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }

    toString(): string {
        return `(${this.x}, ${this.y}, ${this.z})`;
    }
}