export class Vec2 {
    constructor(
        public x: number,
        public y: number
    ) { }

    To(rad: number, len: number) {
        return new Vec2(this.x + len * Math.cos(rad), this.y + len * Math.sin(rad));
    }

    Rot(rad: number) {
        return new Vec2(this.x * Math.cos(rad) - this.y * Math.sin(rad), this.x * Math.sin(rad) + this.y * Math.cos(rad));
    }

    RotAbout(center: Vec2, rad: number) {
        return this.Sub(center).Rot(rad).Add(center);
    }

    Dot(v: Vec2) {
        return this.x * v.x + this.y * v.y;
    }

    Dist(p: Vec2) {
        return Math.sqrt(Math.pow(p.x - this.x, 2) + Math.pow(p.y - this.y, 2));
    }

    Sub(v: Vec2) {
        return new Vec2(this.x - v.x, this.y - v.y);
    }

    Add(v: Vec2) {
        return new Vec2(this.x + v.x, this.y + v.y);
    }

    Mul(s: number) {
        return new Vec2(this.x * s, this.y * s);
    }

    MulV(v: Vec2) {
        return new Vec2(this.x * v.x, this.y * v.y);
    }

    Div(s: number) {
        return new Vec2(this.x / s, this.y / s);
    }

    Len() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    Min(v: Vec2) {
        return new Vec2(Math.min(this.x, v.x), Math.min(this.y, v.y));
    }
}