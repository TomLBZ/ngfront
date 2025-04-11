import { Vec3 } from '../math';

export class Plane3D {
    constructor(public n: Vec3, public d: number) {
        this.n = n.Norm(); // ensure that the normal is a unit vector
    } // d is the distance from the origin
    public static fromPoints(p1: Vec3, p2: Vec3, p3: Vec3): Plane3D {
        const normal = p2.Sub(p1).Cross(p3.Sub(p1)).Norm();
        return new Plane3D(normal, -normal.Dot(p1));
    }
    public static fromNormalAndPoint(normal: Vec3, p: Vec3): Plane3D {
        const norm = normal.Norm();
        return new Plane3D(norm, -norm.Dot(p));
    }
    public distanceToPoint(p: Vec3): number {
        return this.n.Dot(p) + this.d;
    }
    public projectPoint(p: Vec3): Vec3 {
        return p.Sub(this.n.mul(this.distanceToPoint(p)));
    }
    public reflectPoint(p: Vec3): Vec3 {
        return p.Sub(this.n.mul(2 * this.distanceToPoint(p)));
    }
}