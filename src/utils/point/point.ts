import { Hash } from "../hash/hash";

export interface IPoint {
    x: number;
    y: number;
    hash: number;
    distanceTo(point: IPoint): number;
    equals(point: IPoint): boolean;
}

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
        return this.x === point.x && this.y === point.y;
    }
}