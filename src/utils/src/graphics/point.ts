import { Hash } from "../math/hash";
import { IPoint } from "../../graphics";

export class Point implements IPoint {
    public x: number;
    public y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    public distanceTo(point: IPoint): number {
        return Math.sqrt((this.x - point.x) ** 2 + (this.y - point.y) ** 2);
    }
    public get hash(): number {
        return Hash.hash([this.x, this.y]);
    }
    public equals(point: Point): boolean {
        return this.hash === point.hash;
    }
}