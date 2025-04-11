import { Vec2, Vec3 } from "../math";

export class Circle2D {
    public constructor(public center: Vec2, public radius: number) { }
}

export class Circle3D {
    public constructor(public center: Vec3, public normal: Vec3, public radius: number) { }
}