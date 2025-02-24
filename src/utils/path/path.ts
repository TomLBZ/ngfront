import { Color } from "../color/color";
import { Hash } from "../hash/hash";
import { IPoint } from "../point/point";
import { Segment } from "./segment";

export class PathStyle {
    public static readonly Solid = 0;
    public static readonly Dashed = 1;
    public static readonly Dotted = 2;
    public static readonly DashDot = 3;
}

export class Path {
    public color: Color;
    public id: number;
    public style: number = PathStyle.Solid;
    public weight: number = 1;
    public closed: boolean = false;
    private _points = new Array<IPoint>();
    public get points(): Array<IPoint> {
        if (this.closed) {
            return this._points.concat([this._points[0]]);
        }
        return this._points;
    }
    public get segments(): Array<Segment> {
        const segments = new Array<Segment>();
        for (let i = 0; i < this.length - 1; i++) {
            segments.push(new Segment(this._points[i], this._points[i + 1]));
        }
        if (this.closed) {
            segments.push(new Segment(this._points[this.length - 1], this._points[0]));
        }
        return segments;
    }
    public get hash(): number {
        return Hash.hash([this.id, this.color.hash, this.style, this.weight, this.closed ? 1 : 0, this._points.length]);
    }
    constructor(id: number) {
        this.id = id;
        this.color = Color.RandomBright();
        this._points = [];
    }
    public addPoint(point: IPoint) {
        this._points.push(point);
    }
    public addPoints(points: Array<IPoint>) {
        this._points = this._points.concat(points);
    }
    public setPoints(points: Array<IPoint>) {
        this._points = points;
    }
    public clear() {
        this._points = [];
    }
    public pop(): IPoint | undefined {
        return this._points.pop();
    }
    public shift(): IPoint | undefined {
        return this._points.shift();
    }
    public get first(): IPoint | undefined {
        if (this.isEmpty) return undefined;
        return this._points[0];
    }
    public get last(): IPoint | undefined {
        if (this.isEmpty) return undefined;
        return this._points[this.length - 1];
    }
    public get length(): number {
        return this.points.length;
    }
    public get isEmpty() {
        return this.length === 0;
    }
}