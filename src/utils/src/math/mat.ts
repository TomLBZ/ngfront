import { Constructor } from "../../types";

export class Mat {
    protected _data: Array<number> = [];
    private _Mat: Constructor<this> = this.constructor as Constructor<this>;
    constructor(private readonly r: number, private readonly c: number, initValue: number = 0, arr: Array<number> = []) {
        if (arr.length === 0) this._data = new Array<number>(r * c).fill(initValue);
        else {
            if (arr.length !== r * c) {
                throw new Error("Array length does not match matrix dimensions");
            }
            this._data = arr.slice();
        }
    }
    protected throwOnDimensionMismatch(r: number, c: number): void {
        if (this.r !== r || this.c !== c) {
            throw new Error("Dimension Mismatch!");
        }
    }
    protected throwOnIndexOutOfBounds(r: number, c: number): void {
        if (r < 0 || r >= this.r || c < 0 || c >= this.c) {
            throw new Error("Index out of bounds");
        }
    }
    fill(value: number): void {
        for (let i = 0; i < this.r * this.c; i++) {
            this._data[i] = value;
        }
    }
    fillWithArray(value: Array<number>, r: number, c: number): void {
        this.throwOnDimensionMismatch(r, c);
        this._data = value.slice();
    }
    fillWithMat(value: this): void {
        this.throwOnDimensionMismatch(value.r, value.c);
        this._data = value._data.slice();
    }
    clone(): this {
        const m = new this._Mat(this.r, this.c);
        m._data = this._data.slice();
        return m;
    }
    T(): this {
        const m = new this._Mat(this.c, this.r);
        for (let i = 0; i < this.r; i++) {
            for (let j = 0; j < this.c; j++) {
                m.set(j, i, this.get(i, j));
            }
        }
        return m;
    }
    get(r: number, c: number): number {
        return this._data[r * this.c + c];
    }
    set(r: number, c: number, v: number): void {
        this._data[r * this.c + c] = v;
    }
    getRowAt(idx: number): Array<number> {
        return this._data.slice(idx * this.c, (idx + 1) * this.c);
    }
    setRowAt(idx: number, arr: Array<number>): void {
        for (let i = 0; i < this.c; i++) {
            this.set(idx, i, arr[i]);
        }
    }
    getColAt(idx: number): Array<number> {
        const arr = [];
        for (let i = 0; i < this.r; i++) {
            arr.push(this.get(i, idx));
        }
        return arr;
    }
    setColAt(idx: number, arr: Array<number>): void {
        for (let i = 0; i < this.r; i++) {
            this.set(i, idx, arr[i]);
        }
    }
    toString(): string {
        let s = "";
        for (let i = 0; i < this.r; i++) {
            for (let j = 0; j < this.c; j++) {
                s += this.get(i, j) + " ";
            }
            s += "\n";
        }
        return s;
    }
    toArray(): Array<number> {
        return this._data;
    }
    add(s: number): this {
        const nm = new this._Mat(this.r, this.c, s);
        for (let i = 0; i < this.r * this.c; i++) {
            nm._data[i] += this._data[i];
        }
        return nm;
    }
    Add(m: this): this {
        this.throwOnDimensionMismatch(m.r, m.c);
        const nm = new this._Mat(this.r, this.c);
        for (let i = 0; i < this.r; i++) {
            for (let j = 0; j < this.c; j++) {
                nm.set(i, j, this.get(i, j) + m.get(i, j));
            }
        }
        return nm;
    }
    sub(s: number): this {
        return this.add(-s);
    }
    Sub(m: this): this {
        this.throwOnDimensionMismatch(m.r, m.c);
        const nm = new this._Mat(this.r, this.c);
        for (let i = 0; i < this.r; i++) {
            for (let j = 0; j < this.c; j++) {
                nm.set(i, j, this.get(i, j) - m.get(i, j));
            }
        }
        return nm;
    }
    mul(s: number): this {
        const nm = new this._Mat(this.r, this.c, s);
        for (let i = 0; i < this.r * this.c; i++) {
            nm._data[i] *= this._data[i];
        }
        return nm;
    }
    Mul(m: this): this {
        if (this.c !== m.r) throw new Error("Dimension Mismatch!");
        const nm = new this._Mat(this.r, m.c);
        for (let i = 0; i < this.r; i++) {
            for (let j = 0; j < m.c; j++) {
                let sum = 0;
                for (let k = 0; k < this.c; k++) {
                    sum += this.get(i, k) * m.get(k, j);
                }
                nm.set(i, j, sum);
            }
        }
        return nm;
    }
    div(s: number): this {
        if (s === 0) throw new Error("Division by zero");
        return this.mul(1 / s);
    }
}