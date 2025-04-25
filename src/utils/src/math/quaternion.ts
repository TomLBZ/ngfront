import { CartesianCoords3D } from "../../geo";
import { Mat3 } from "./mat3";
import { Vec3 } from "./vec3";

export class Quaternion {
    public static get I(): Quaternion { return new Quaternion(0, 0, 0, 1); }
    public static get ZERO(): Quaternion { return new Quaternion(0, 0, 0, 0); }
    /**
     * Returns a quaternion representing a rotation around an axis by a given angle in radians,
     * rotation is counter-clockwise when looking from the end of the axis towards the origin.
     * @param axis Rotation axis
     * @param angleRad Rotation angle in radians
     * @returns Quaternion
     * @see https://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation
     */
    public static FromAxisAngle(axis: Vec3, angleRad: number): Quaternion {
        const half = angleRad / 2;
        const sHalf = Math.sin(half);
        const cHalf = Math.cos(half);
        const aNorm = axis.Norm();
        return new Quaternion(
            aNorm.x * sHalf,
            aNorm.y * sHalf,
            aNorm.z * sHalf,
            cHalf
        );
    }
    /**
     * Gets a quaternion from Euler angles in radians using the **Body 3-2-1** convention, 
     * which means that the angles are applied in the order of yaw, pitch, and roll.
     * @param roll Body X axis rotation
     * @param pitch Body Y axis rotation
     * @param yaw Body Z axis rotation (heading)
     * @returns Quaternion
     * @see https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles
     */
    public static FromEuler(roll: number, pitch: number, yaw: number): Quaternion {
        const hR = roll / 2;
        const hP = pitch / 2;
        const hY = yaw / 2;
        const sr = Math.sin(hR);
        const cr = Math.cos(hR);
        const sp = Math.sin(hP);
        const cp = Math.cos(hP);
        const sy = Math.sin(hY);
        const cy = Math.cos(hY);
        return new Quaternion( // x, y, z, w
            sr * cp * cy - cr * sp * sy,
            cr * sp * cy + sr * cp * sy,
            cr * cp * sy - sr * sp * cy,
            cr * cp * cy + sr * sp * sy
        );
    }
    /**
     * Initializes a quaternion from a rotation matrix.
     * @param m Rotation matrix, row major by default unless colMajor is true.
     * @param colMajor If true, the matrix is in column-major order.
     * @see https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles#From_rotation_matrix
     * @returns Quaternion
     */
    public static FromMat3(m: Mat3, colMajor: boolean = false): Quaternion {
        m = colMajor ? m.T() : m; // explicitly transpose if needed
        const trace = m.get(0, 0) + m.get(1, 1) + m.get(2, 2);
        let s = 0;
        let q = Quaternion.I;
        if (trace > 0) {
            s = Math.sqrt(trace + 1) * 2; // s=4*qw
            q = new Quaternion(
                (m.get(2, 1) - m.get(1, 2)) / s,
                (m.get(0, 2) - m.get(2, 0)) / s,
                (m.get(1, 0) - m.get(0, 1)) / s,
                0.25 * s
            );
        } else if (m.get(0, 0) > m.get(1, 1) && m.get(0, 0) > m.get(2, 2)) {
            s = Math.sqrt(1 + m.get(0, 0) - m.get(1, 1) - m.get(2, 2)) * 2; // s=4*qx
            q = new Quaternion(
                0.25 * s,
                (m.get(0, 1) + m.get(1, 0)) / s,
                (m.get(0, 2) + m.get(2, 0)) / s,
                (m.get(2, 1) - m.get(1, 2)) / s
            );
        } else if (m.get(1, 1) > m.get(2, 2)) {
            s = Math.sqrt(1 + m.get(1, 1) - m.get(0, 0) - m.get(2, 2)) * 2; // s=4*qy
            q = new Quaternion(
                (m.get(0, 1) + m.get(1, 0)) / s,
                0.25 * s,
                (m.get(1, 2) + m.get(2, 1)) / s,
                (m.get(0, 2) - m.get(2, 0)) / s
            );
        } else {
            s = Math.sqrt(1 + m.get(2, 2) - m.get(0, 0) - m.get(1, 1)) * 2; // s=4*qz
            q = new Quaternion(
                (m.get(0, 2) + m.get(2, 0)) / s,
                (m.get(1, 2) + m.get(2, 1)) / s,
                0.25 * s,
                (m.get(1, 0) - m.get(0, 1)) / s
            );
        }
        return q;
    }
    public static Slerp(q1: Quaternion, q2: Quaternion, t: number): Quaternion {
        let cosTheta = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
        if (cosTheta < 0) {
            cosTheta = -cosTheta;
            q2 = q2.Neg();
        }
        if (cosTheta > 0.9995) {
            return new Quaternion(
                q1.x + t * (q2.x - q1.x),
                q1.y + t * (q2.y - q1.y),
                q1.z + t * (q2.z - q1.z),
                q1.w + t * (q2.w - q1.w)
            ).Norm();
        }
        const theta = Math.acos(cosTheta);
        const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
        const a = Math.sin((1 - t) * theta) / sinTheta;
        const b = Math.sin(t * theta) / sinTheta;
        return new Quaternion(
            q1.x * a + q2.x * b,
            q1.y * a + q2.y * b,
            q1.z * a + q2.z * b,
            q1.w * a + q2.w * b
        ).Norm();
    }
    public static FromArray(arr: number[]): Quaternion {
        if (arr.length !== 4) throw new Error("Array length must be 4");
        return new Quaternion(arr[0], arr[1], arr[2], arr[3]);
    }
    constructor(public x: number = 0, public y: number = 0, public z: number = 0, public w: number = 0) {}
    public Len2(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    }
    public Len(): number {
        return Math.sqrt(this.Len2());
    }
    public Clone(): Quaternion {
        return new Quaternion(this.x, this.y, this.z, this.w);
    }
    public Inv(): Quaternion {
        const len2 = this.Len2();
        if (len2 === 0) return Quaternion.ZERO;
        return new Quaternion(
            -this.x / len2,
            -this.y / len2,
            -this.z / len2,
            this.w / len2
        );
    }
    public Neg(): Quaternion {
        return new Quaternion(-this.x, -this.y, -this.z, -this.w);
    }
    public Conjugate(): Quaternion {
        return new Quaternion(-this.x, -this.y, -this.z, this.w);
    }
    public Norm(): Quaternion {
        const len = this.Len();
        if (len === 0) return Quaternion.ZERO;
        return new Quaternion(
            this.x / len,
            this.y / len,
            this.z / len,
            this.w / len
        );
    }
    public Mul(q: Quaternion): Quaternion {
        return new Quaternion(
            this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
            this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
            this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
            this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z
        );
    }
    public Add(q: Quaternion): Quaternion {
        return new Quaternion(
            this.x + q.x,
            this.y + q.y,
            this.z + q.z,
            this.w + q.w
        );
    }
    public Sub(q: Quaternion): Quaternion {
        return new Quaternion(
            this.x - q.x,
            this.y - q.y,
            this.z - q.z,
            this.w - q.w
        );
    }
    public Dot(q: Quaternion): number {
        return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
    }
    public mul(s: number): Quaternion {
        return new Quaternion(
            this.x * s,
            this.y * s,
            this.z * s,
            this.w * s
        );
    }
    public div(s: number): Quaternion {
        if (s === 0) throw new Error("Division by zero");
        return new Quaternion(
            this.x / s,
            this.y / s,
            this.z / s,
            this.w / s
        );
    }
    public RotateV(v: Vec3): Vec3 {
        const qv = new Quaternion(v.x, v.y, v.z, 0);
        const res = this.Mul(qv).Mul(this.Inv());
        return Vec3.New(res.x, res.y, res.z);
    }
    public RotateC(rc: CartesianCoords3D): CartesianCoords3D {
        const qv = new Quaternion(rc[0], rc[1], rc[2], 0);
        const res = this.Mul(qv).Mul(this.Inv());
        return [res.x, res.y, res.z];
    }
    public ToArray(): number[] {
        return [this.x, this.y, this.z, this.w];
    }
    public VecPart(): Vec3 {
        return Vec3.New(this.x, this.y, this.z);
    }
    public ToMat3(colMajor: boolean = false): Mat3 {
        const x2 = this.x * this.x;
        const y2 = this.y * this.y;
        const z2 = this.z * this.z;
        const xy = this.x * this.y;
        const xz = this.x * this.z;
        const yz = this.y * this.z;
        const wx = this.w * this.x;
        const wy = this.w * this.y;
        const wz = this.w * this.z;
        const mat = Mat3.New([
            1 - 2 * (y2 + z2), 2 * (xy - wz), 2 * (xz + wy),
            2 * (xy + wz), 1 - 2 * (x2 + z2), 2 * (yz - wx),
            2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (x2 + y2)
        ]);
        return colMajor ? mat.T() : mat;
    }
    public ToString(digits: number = 2): string {
        return `Q(${this.x.toFixed(digits)}, ${this.y.toFixed(digits)}, ${this.z.toFixed(digits)}, ${this.w.toFixed(digits)})`;
    }
}