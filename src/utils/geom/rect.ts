import { Vec2 } from '../vec/vec2';
import { Circle2D } from './circle';
import { LineSeg2D } from './line';

export class Rectangle2D {
    constructor(public x: number, public y: number, public w: number, public h: number) { }
    public static fromPoints(p1: Vec2, p2: Vec2): Rectangle2D {
        return new Rectangle2D(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
    }
    public get center(): Vec2 {
        return new Vec2(this.x + this.w / 2, this.y + this.h / 2);
    }
    public get left(): number {
        return this.x;
    }
    public get right(): number {
        return this.x + this.w;
    }
    public get top(): number {
        return this.y;
    }
    public get bottom(): number {
        return this.y + this.h;
    }
    public get topLeft(): Vec2 {
        return new Vec2(this.x, this.y);
    }
    public get topRight(): Vec2 {
        return new Vec2(this.x + this.w, this.y);
    }
    public get bottomLeft(): Vec2 {
        return new Vec2(this.x, this.y + this.h);
    }
    public get bottomRight(): Vec2 {
        return new Vec2(this.x + this.w, this.y + this.h);
    }
    public get leftSide(): LineSeg2D {
        return new LineSeg2D(this.topLeft, this.bottomLeft);
    }
    public get rightSide(): LineSeg2D {
        return new LineSeg2D(this.topRight, this.bottomRight);
    }
    public get topSide(): LineSeg2D {
        return new LineSeg2D(this.topLeft, this.topRight);
    }
    public get bottomSide(): LineSeg2D {
        return new LineSeg2D(this.bottomLeft, this.bottomRight);
    }
    public boundCircle(c: Circle2D): Vec2[] {
        // for each side of the rectangle, find the intersection points with the circle
        const intersections: Vec2[] = [];
        const sides = [this.leftSide, this.topSide, this.rightSide, this.bottomSide];
        for (const side of sides) {
            const points = side.intersectCircle(c);
            for (const point of points) {
                // TODO: Find a better way to calcuilay6e the camera footprint
                // if (this.contains(point)) intersections.push(point);
            }
        }
        return intersections;
    }
}