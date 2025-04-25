import { Vec3 } from "./vec3";
import { Mat } from "./mat";

export class Mat3 extends Mat {
    constructor(r: number = 3, c: number = 3, initValue: number = 0, arr: Array<number> = [0, 0, 0, 0, 0, 0, 0, 0, 0]) {
        if (r !== 3 || c !== 3) throw new Error("Mat3 must be 3x3");
        super(r, c, initValue, arr);
    }
    static New(arr: Array<number>): Mat3 {
        if (arr.length !== 9) throw new Error("Array length must be 9 for Mat3");
        return new Mat3(3, 3, 0, arr);
    }
    MulV(v: Vec3): Vec3 {
        return Vec3.New(
            this.get(0, 0) * v.x + this.get(0, 1) * v.y + this.get(0, 2) * v.z,
            this.get(1, 0) * v.x + this.get(1, 1) * v.y + this.get(1, 2) * v.z,
            this.get(2, 0) * v.x + this.get(2, 1) * v.y + this.get(2, 2) * v.z
        );
    }
    VMul(v: Vec3): Vec3 {
        return Vec3.New(
            this.get(0, 0) * v.x + this.get(1, 0) * v.y + this.get(2, 0) * v.z,
            this.get(0, 1) * v.x + this.get(1, 1) * v.y + this.get(2, 1) * v.z,
            this.get(0, 2) * v.x + this.get(1, 2) * v.y + this.get(2, 2) * v.z
        );
    }
    Inverse(): Mat3 {
        const a = this.get(0, 0);
        const b = this.get(0, 1);
        const c = this.get(0, 2);
        const d = this.get(1, 0);
        const e = this.get(1, 1);
        const f = this.get(1, 2);
        const g = this.get(2, 0);
        const h = this.get(2, 1);
        const i = this.get(2, 2);
        const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
        if (det === 0) throw new Error("Matrix is singular and cannot be inverted");
        return Mat3.New([
            (e * i - f * h) / det,
            (c * h - b * i) / det,
            (b * f - c * e) / det,
            (f * g - d * i) / det,
            (a * i - c * g) / det,
            (c * d - a * f) / det,
            (d * h - e * g) / det,
            (b * g - a * h) / det,
            (a * e - b * d) / det
        ]);
    }
    static fromEuler(roll: number, pitch: number, yaw: number, reverseOrder: boolean = false): Mat3 {
        const cr = Math.cos(roll);
        const sr = Math.sin(roll);
        const cp = Math.cos(pitch);
        const sp = Math.sin(pitch);
        const cy = Math.cos(yaw);
        const sy = Math.sin(yaw);
        return reverseOrder ? 
            Mat3.New([ // apply yaw first, then pitch, then roll
                cp * cr, sy * sp * cr - cy * sr, cy * sp * cr + sy * sr,
                cp * sr, sy * sp * sr + cy * cr, cy * sp * sr - sy * cr,
                -sp, sy * cp, cy * cp
            ]) :
            Mat3.New([ // apply roll first, then pitch, then yaw
                cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr,
                sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr,
                -sp, cp * sr, cp * cr
            ]);
    }
    static fromAxisAngle(axis: Vec3, angle: number): Mat3 {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const t = 1 - c;
        const x = axis.x;
        const y = axis.y;
        const z = axis.z;
        return Mat3.New([
            t * x * x + c, t * x * y - s * z, t * x * z + s * y,
            t * x * y + s * z, t * y * y + c, t * y * z - s * x,
            t * x * z - s * y, t * y * z + s * x, t * z * z + c
        ]);
    }
    static FromRows(rows: Array<Vec3>): Mat3 {
        if (rows.length !== 3) throw new Error("Array length must be 3 for Mat3");
        return Mat3.New([
            rows[0].x, rows[0].y, rows[0].z,
            rows[1].x, rows[1].y, rows[1].z,
            rows[2].x, rows[2].y, rows[2].z
        ]);
    }
    static FromCols(cols: Array<Vec3>): Mat3 {
        if (cols.length !== 3) throw new Error("Array length must be 3 for Mat3");
        return Mat3.New([
            cols[0].x, cols[1].x, cols[2].x,
            cols[0].y, cols[1].y, cols[2].y,
            cols[0].z, cols[1].z, cols[2].z
        ]);
    }
    static I(): Mat3 {
        return Mat3.New([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]);
    }
}