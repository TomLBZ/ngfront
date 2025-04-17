import { Vec } from './vec';

export class Vec2 extends Vec {
    public get x(): number { return this._data[0]; }
    public get y(): number { return this._data[1]; }
    public set x(value: number) { this._data[0] = value; }
    public set y(value: number) { this._data[1] = value; }
    constructor(length: number = 2, initValue: number = 0, arr: Array<number> = []) {
        if (length !== 2) throw new Error("Vec2 constructor: length must be 2");
        if (arr.length > 0 && arr.length !== 2) throw new Error("Vec2 constructor: arr must be of length 2");
        super(length, initValue, arr);
    }
    static New(x: number, y: number): Vec2 {
        return new Vec2(2, 0, [x, y]);
    }
}