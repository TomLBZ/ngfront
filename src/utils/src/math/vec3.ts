import { RectangularCoords } from "../../geo";
import { Vec } from "./vec";

export class Vec3 extends Vec {
    public get x(): number { return this._data[0]; }
    public get y(): number { return this._data[1]; }
    public get z(): number { return this._data[2]; }
    public set x(value: number) { this._data[0] = value; }
    public set y(value: number) { this._data[1] = value; }
    public set z(value: number) { this._data[2] = value; }
    constructor(length: number = 3, initValue: number = 0, arr: Array<number> = []) {
        if (length !== 3) throw new Error("Vec3 constructor: length must be 3");
        if (arr.length > 0 && arr.length !== 3) throw new Error("Vec3 constructor: arr must be of length 3");
        super(length, initValue, arr);
    }

    static New(x: number, y: number, z: number): Vec3 {
        return new Vec3(3, 0, [x, y, z]);
    }
    static FromRectangularCoords(coords: RectangularCoords): Vec3 {
        return new Vec3(3, 0, [coords[0], coords[1], coords[2]]);
    }
    static FromArray(arr: number[]): Vec3 {
        return new Vec3(3, 0, arr);
    }

    rotateX(rad: number): Vec3 {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return Vec3.New(this.x, this.y * c - this.z * s, this.y * s + this.z * c);
    }
    rotateY(rad: number): Vec3 {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return Vec3.New(this.x * c + this.z * s, this.y, -this.x * s + this.z * c);
    }
    rotateZ(rad: number): Vec3 {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return Vec3.New(this.x * c - this.y * s, this.x * s + this.y * c, this.z);
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
        return Vec3.New(x3, y3, z3);
    }
    Cross(v: Vec3): Vec3 {
        return Vec3.New(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }
    ToRectangularCoords(): RectangularCoords {
        return [this.x, this.y, this.z] as RectangularCoords;
    }
}