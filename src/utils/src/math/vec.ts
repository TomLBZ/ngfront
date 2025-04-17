import { Constructor } from "../../types";

export class Vec {
    [index: number]: number;
    protected _data: Array<number> = [];
    private _Vec: Constructor<this> = this.constructor as Constructor<this>;
    constructor(public readonly length: number, initValue: number = 0, arr: Array<number> = []) {
        if (arr.length === 0) this._data = new Array<number>(length).fill(initValue);
        else {
            if (arr.length !== length) {
                throw new Error("Dimension Mismatch!");
            }
            this._data = arr.slice();
        }
    }
    protected throwOnDimensionMismatch(length: number): void {
        if (this.length !== length) {
            throw new Error("Dimension Mismatch!");
        }
    }
    protected throwOnIndexOutOfBounds(index: number): void {
        if (index < 0 || index >= this.length) {
            throw new Error("Index out of bounds");
        }
    }
    fill(value: number): void {
        for (let i = 0; i < this.length; i++) {
            this._data[i] = value;
        }
    }
    fillWithArray(value: Array<number>): void {
        this.throwOnDimensionMismatch(value.length);
        this._data = value.slice();
    }
    fillWithVec(value: this): void {
        this.throwOnDimensionMismatch(value.length);
        this._data = value._data.slice();
    }
    clone(): this {
        const v = new this._Vec(this.length);
        v._data = this._data.slice();
        return v;
    }
    toArray(): Array<number> {
        return this._data;
    }
    get(index: number): number {
        this.throwOnIndexOutOfBounds(index);
        return this._data[index];
    }
    set(index: number, value: number): void {
        this.throwOnIndexOutOfBounds(index);
        this._data[index] = value;
    }
    Dot(v: this): number {
        this.throwOnDimensionMismatch(v.length);
        let sum = 0;
        for (let i = 0; i < this.length; i++) {
            sum += this.get(i) * v.get(i);
        }
        return sum;
    }
    Dist(v: this): number {
        this.throwOnDimensionMismatch(v.length);
        let sum = 0;
        for (let i = 0; i < this.length; i++) {
            sum += Math.pow(this.get(i) - v.get(i), 2);
        }
        return Math.sqrt(sum);
    }
    sub(s: number): this {
        const v = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            v.set(i, this.get(i) - s);
        }
        return v;
    }
    Sub(v: this): this {
        this.throwOnDimensionMismatch(v.length);
        const nv = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            nv.set(i, this.get(i) - v.get(i));
        }
        return nv;
    }
    add(s: number): this {
        const v = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            v.set(i, this.get(i) + s);
        }
        return v;
    }
    Add(v: this): this {
        this.throwOnDimensionMismatch(v.length);
        const nv = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            nv.set(i, this.get(i) + v.get(i));
        }
        return nv;
    }
    mul(s: number): this {
        const v = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            v.set(i, this.get(i) * s);
        }
        return v;
    }
    Mul(v: this): this {
        this.throwOnDimensionMismatch(v.length);
        const nv = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            nv.set(i, this.get(i) * v.get(i));
        }
        return nv;
    }
    div(s: number): this {
        const v = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            v.set(i, this.get(i) / s);
        }
        return v;
    }
    Div(v: this): this {
        this.throwOnDimensionMismatch(v.length);
        const nv = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            nv.set(i, this.get(i) / v.get(i));
        }
        return nv;
    }
    Len(): number {
        let sum = 0;
        for (let i = 0; i < this.length; i++) {
            sum += Math.pow(this.get(i), 2);
        }
        return Math.sqrt(sum);
    }
    min(): number {
        let min = this.get(0);
        for (let i = 1; i < this.length; i++) {
            if (this.get(i) < min) {
                min = this.get(i);
            }
        }
        return min;
    }
    minIndex(): number {
        let min = this.get(0);
        let index = 0;
        for (let i = 1; i < this.length; i++) {
            if (this.get(i) < min) {
                min = this.get(i);
                index = i;
            }
        }
        return index;
    }
    Min(v: this): this {
        this.throwOnDimensionMismatch(v.length);
        const nv = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            nv.set(i, Math.min(this.get(i), v.get(i)));
        }
        return nv;
    }
    max(): number {
        let max = this.get(0);
        for (let i = 1; i < this.length; i++) {
            if (this.get(i) > max) {
                max = this.get(i);
            }
        }
        return max;
    }
    maxIndex(): number {
        let max = this.get(0);
        let index = 0;
        for (let i = 1; i < this.length; i++) {
            if (this.get(i) > max) {
                max = this.get(i);
                index = i;
            }
        }
        return index;
    }
    Max(v: this): this {
        this.throwOnDimensionMismatch(v.length);
        const nv = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            nv.set(i, Math.max(this.get(i), v.get(i)));
        }
        return nv;
    }
    Abs(): this {
        const v = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            v.set(i, Math.abs(this.get(i)));
        }
        return v;
    }
    Neg(): this {
        const v = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            v.set(i, -this.get(i));
        }
        return v;
    }
    Norm(): this {
        const len = this.Len();
        if (len === 0) {
            throw new Error("Cannot normalize a zero vector");
        }
        const v = new this._Vec(this.length);
        for (let i = 0; i < this.length; i++) {
            v.set(i, this.get(i) / len);
        }
        return v;
    }
    toString(): string {
        return `(${this._data.map((v) => v.toFixed(2)).join(", ")})`;
    }
}