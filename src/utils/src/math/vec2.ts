import { Vec } from './vec';

export class Vec2 extends Vec {
    public get x(): number { return this._data[0]; }
    public get y(): number { return this._data[1]; }
    public set x(value: number) { this._data[0] = value; }
    public set y(value: number) { this._data[1] = value; }
    constructor(x: number = 0, y: number = 0) {
        super(2);
        this._data[0] = x;
        this._data[1] = y;
    }
}