import { Vec2, Vec3 } from "../math";
import { Plane3D } from './plane';
import { Circle2D } from './circle';

export class LineSeg2D {
    constructor(public a: Vec2, public b: Vec2) { }
    public get center(): Vec2 {
        return this.a.Add(this.b).mul(0.5);
    }
    public get length(): number {
        return this.a.Sub(this.b).Len();
    }
    public distanceToPoint(p: Vec2): number {
        const ab = this.b.Sub(this.a);
        const ap = p.Sub(this.a);
        const bp = p.Sub(this.b);
        if (ab.Dot(ap) < 0) return ap.Len();
        if (ab.Dot(bp) > 0) return bp.Len();
        const perp_vec = new Vec2(-ab.y, ab.x).Norm();
        return perp_vec.Dot(ap);
    }
    public projectPoint(p: Vec2): Vec2 {
        const ab = this.b.Sub(this.a);
        const ap = p.Sub(this.a);
        const t = ab.Dot(ap) / ab.Len() ** 2;
        return this.a.Add(ab.mul(t));
    }
    public reflectPoint(p: Vec2): Vec2 {
        return this.projectPoint(p).Sub(p).mul(2).Add(p);
    }
    public intersectLineSeg(line: LineSeg2D): Vec2 {
        const a1 = this.a, b1 = this.b;
        const a2 = line.a, b2 = line.b;
        const d1 = b1.Sub(a1), d2 = b2.Sub(a2);
        const d = d1.x * d2.y - d1.y * d2.x;
        if (d === 0) return new Vec2(Infinity, Infinity);
        const c1 = a1.x * b1.y - a1.y * b1.x;
        const c2 = a2.x * b2.y - a2.y * b2.x;
        const x = (c1 * d2.x - c2 * d1.x) / d;
        const y = (c1 * d2.y - c2 * d1.y) / d;
        return new Vec2(x, y);
    }
    public intersectCircle(circle: Circle2D): Vec2[] {
        const p = this.a.Sub(circle.center);
        const q = this.b.Sub(this.a);
        const r = circle.radius;
        const a = q.Dot(q);
        const b = 2 * p.Dot(q);
        const c = p.Dot(p) - r * r;
        const d = b * b - 4 * a * c;
        if (d < 0) return [];
        const t1 = (-b + Math.sqrt(d)) / (2 * a);
        const t2 = (-b - Math.sqrt(d)) / (2 * a);
        return [this.a.Add(q.mul(t1)), this.a.Add(q.mul(t2))];
    }
}

export class Line2D {
    constructor(public p: Vec2, public v: Vec2) { }
    public static fromPoints(p1: Vec2, p2: Vec2): Line2D {
        return new Line2D(p1, p2.Sub(p1));
    }
    public distanceToPoint(p: Vec2): number {
        const perp_vec = new Vec2(-this.v.y, this.v.x);
        return perp_vec.Dot(p.Sub(this.p)) / perp_vec.Len();
    }
    public projectPoint(p: Vec2): Vec2 {
        return this.p.Add(this.v.mul(this.v.Dot(p.Sub(this.p)) / this.v.Len() ** 2));
    }
    public reflectPoint(p: Vec2): Vec2 {
        return this.projectPoint(p).Sub(p).mul(2).Add(p);
    }
    public intersectLine(line: Line2D): Vec2 {
        const a1 = this.v.x, b1 = this.v.y, c1 = this.v.Dot(this.p);
        const a2 = line.v.x, b2 = line.v.y, c2 = line.v.Dot(line.p);
        const det = a1 * b2 - a2 * b1;
        if (det === 0) return new Vec2(Infinity, Infinity);
        const x = (b2 * c1 - b1 * c2) / det;
        const y = (a1 * c2 - a2 * c1) / det;
        return new Vec2(x, y);
    }
    public intersectCircle(circle: Circle2D): Vec2[] {
        const p = this.p.Sub(circle.center);
        const a = this.v.Len() ** 2;
        const b = 2 * p.Dot(this.v);
        const c = p.Len() ** 2 - circle.radius * circle.radius;
        const d = b * b - 4 * a * c;
        if (d < 0) return [];
        const t1 = (-b + Math.sqrt(d)) / (2 * a);
        const t2 = (-b - Math.sqrt(d)) / (2 * a);
        return [this.p.Add(this.v.mul(t1)), this.p.Add(this.v.mul(t2))];
    }
}

export class Line3D {
    constructor(public p: Vec3, public v: Vec3) { }
    public static fromPoints(p1: Vec3, p2: Vec3): Line3D {
        return new Line3D(p1, p2.Sub(p1));
    }
    public distanceToPoint(p: Vec3): number {
        return this.v.Cross(p.Sub(this.p)).Len() / this.v.Len();
    }
    public projectPoint(p: Vec3): Vec3 {
        return this.p.Add(this.v.mul(this.v.Dot(p.Sub(this.p)) / this.v.Len() ** 2));
    }
    public reflectPoint(p: Vec3): Vec3 {
        return this.projectPoint(p).Sub(p).mul(2).Add(p);
    }
    public intersectPlane(plane: Plane3D): Vec3 {
        const t = (plane.d - plane.n.Dot(this.p)) / plane.n.Dot(this.v);
        return this.p.Add(this.v.mul(t));
    }
    public intersectLine(line: Line3D): Vec3 {
        const n = this.v.Cross(line.v);
        const t = n.Cross(line.p.Sub(this.p)).Dot(n) / n.Len() ** 2;
        return this.p.Add(this.v.mul(t));
    }
}