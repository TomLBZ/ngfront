import { Vec2 } from "../vec/vec2";
import { Vec3 } from "../vec/vec3";

export class Circle2D {
    public constructor(public center: Vec2, public radius: number) { }
}

export class Circle3D {
    public constructor(public center: Vec3, public normal: Vec3, public radius: number) { }
}