import { Color } from "./color";
import { Hash } from "../math/hash";
import { IPoint, PathStyle } from "../../graphics";
import { Segment } from "./segment";

export class Path {
    public color: Color;
    public id: number;
    public style: number = PathStyle.Solid;
    public get dashArray(): Array<number> {
        switch (this.style) {
            case PathStyle.Dashed:
                return [3, 3];
            case PathStyle.Dotted:
                return [1, 1];
            case PathStyle.DashDot:
                return [3, 1, 1, 1];
            default:
                return [1, 0];
        }
    }
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
        const pts: Array<IPoint> = this.points;
        if (pts.length < 2) return segments;
        for (let i = 0; i < pts.length - 1; i++) {
            segments.push(new Segment(pts[i], pts[i + 1]));
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