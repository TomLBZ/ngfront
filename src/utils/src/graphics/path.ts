import { Color } from "./color";
import { Hash } from "../math/hash";
import { PathStyle } from "../../graphics";
import { IPoint, Segment } from "../../ds";

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
        let startIndex: number = 0;
        let endIndex: number = 1;
        for (let i = 0; i < pts.length - 1; i++) {
            startIndex = i;
            while (endIndex < pts.length && pts[endIndex].equals(pts[startIndex])) {
                endIndex++;
            }
            if (endIndex === pts.length) break; // reached the end of the points array
            segments.push(new Segment(pts[startIndex], pts[endIndex]));
            startIndex = endIndex;
            endIndex = startIndex + 1;
        }
        return segments;
    }
    public get hash(): number {
        const ptsHash: number = Hash.hash(this._points.map((p, i) => Hash.hash([p.x, p.y, i])));
        const propsHash: number = Hash.hash([this.color.hash, this.style, this.weight, this.closed ? 1 : 0, this._points.length]);
        return Hash.hash([this.id, ptsHash, propsHash]);
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