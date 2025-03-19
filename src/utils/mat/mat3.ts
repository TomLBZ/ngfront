import { Vec3 } from "../vec/vec3";
import { Mat } from "./mat";

export class Mat3 extends Mat {
    constructor(arr: Array<number> = [0, 0, 0, 0, 0, 0, 0, 0, 0]) {
        super(3, 3);
        this._data = arr;
    }
    static override fromArray(arr: Array<number>): Mat3 {
        return new Mat3(arr);
    }
    MulV(v: Vec3): Vec3 {
        return new Vec3(
            this.get(0, 0) * v.x + this.get(0, 1) * v.y + this.get(0, 2) * v.z,
            this.get(1, 0) * v.x + this.get(1, 1) * v.y + this.get(1, 2) * v.z,
            this.get(2, 0) * v.x + this.get(2, 1) * v.y + this.get(2, 2) * v.z
        );
    }
    VMul(v: Vec3): Vec3 {
        return new Vec3(
            this.get(0, 0) * v.x + this.get(1, 0) * v.y + this.get(2, 0) * v.z,
            this.get(0, 1) * v.x + this.get(1, 1) * v.y + this.get(2, 1) * v.z,
            this.get(0, 2) * v.x + this.get(1, 2) * v.y + this.get(2, 2) * v.z
        );
    }
    override T(): Mat3 {
        return new Mat3([
            this.get(0, 0), this.get(1, 0), this.get(2, 0),
            this.get(0, 1), this.get(1, 1), this.get(2, 1),
            this.get(0, 2), this.get(1, 2), this.get(2, 2)
        ]);
    }
    static fromEuler(roll: number, pitch: number, yaw: number): Mat3 {
        const cr = Math.cos(roll);
        const sr = Math.sin(roll);
        const cp = Math.cos(pitch);
        const sp = Math.sin(pitch);
        const cy = Math.cos(yaw);
        const sy = Math.sin(yaw);
        return new Mat3([
            cp * cy, sr * sp * cy - cr * sy, cr * sp * cy + sr * sy,
            cp * sy, sr * sp * sy + cr * cy, cr * sp * sy - sr * cy,
            -sp, sr * cp, cr * cp
        ]);
    }
    static fromAxisAngle(axis: Vec3, angle: number): Mat3 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const t = 1 - c;
        const x = axis.x;
        const y = axis.y;
        const z = axis.z;
        return new Mat3([
            t * x * x + c, t * x * y - s * z, t * x * z + s * y,
            t * x * y + s * z, t * y * y + c, t * y * z - s * x,
            t * x * z - s * y, t * y * z + s * x, t * z * z + c
        ]);
    }
    static override I(): Mat3 {
        return new Mat3([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]);
    }
    static override Z(): Mat3 {
        return new Mat3([
            0, 0, 0,
            0, 0, 0,
            0, 0, 0
        ]);
    }
}