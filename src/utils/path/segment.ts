import { Hash } from "../hash/hash";
import { IPoint } from "../point/point";

export class Segment {
    public start: IPoint;
    public end: IPoint;
    constructor(start: IPoint, end: IPoint) {
        this.start = start;
        this.end = end;
    }
    public get length(): number {
        return this.start.distanceTo(this.end);
    }
    public get hash(): number {
        return Hash.hash([this.start.hash, this.end.hash]);
    }
    public get raw(): Array<Array<number>> {
        return [[this.start.x, this.start.y], [this.end.x, this.end.y]];
    }
}