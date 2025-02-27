import { Vec } from "./vec";

export class Vec3 implements Vec<Vec3> {
    [index: number]: number;
    public readonly length: number = 3;
    constructor(public x: number, public y: number, public z: number) {
        this[0] = x;
        this[1] = y;
        this[2] = z;
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
}