import { Vec } from "./vec";

export class Vec3 extends Vec {
    public get x(): number { return this._data[0]; }
    public get y(): number { return this._data[1]; }
    public get z(): number { return this._data[2]; }
    public set x(value: number) { this._data[0] = value; }
    public set y(value: number) { this._data[1] = value; }
    public set z(value: number) { this._data[2] = value; }
    constructor(x: number = 0, y: number = 0, z: number = 0) {
        super(3);
        this._data[0] = x;
        this._data[1] = y;
        this._data[2] = z;
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
}