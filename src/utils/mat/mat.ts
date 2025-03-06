export class Mat {
    protected _data: Array<number> = [];
    constructor(private r: number, private c: number) {
        this._data = new Array<number>(r * c).fill(0);
    }
    static fromArray(arr: Array<number>, r: number, c: number): Mat {
        const m = new Mat(r, c);
        m._data = arr;
        return m;
    }
    T(): Mat {
        const m = new Mat(this.c, this.r);
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
    Add(m: Mat): Mat {
        if (this.r !== m.r || this.c !== m.c) return this;
        const nm = new Mat(this.r, this.c);
        for (let i = 0; i < this.r; i++) {
            for (let j = 0; j < this.c; j++) {
                nm.set(i, j, this.get(i, j) + m.get(i, j));
            }
        }
        return nm;
    }
    Sub(m: Mat): Mat {
        if (this.r !== m.r || this.c !== m.c) return this;
        const nm = new Mat(this.r, this.c);
        for (let i = 0; i < this.r; i++) {
            for (let j = 0; j < this.c; j++) {
                nm.set(i, j, this.get(i, j) - m.get(i, j));
            }
        }
        return nm;
    }
    Mul(m: Mat): Mat {
        if (this.c !== m.r) return this;
        const nm = new Mat(this.r, m.c);
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
    mul(s: number): Mat {
        const nm = new Mat(this.r, this.c);
        for (let i = 0; i < this.r; i++) {
            for (let j = 0; j < this.c; j++) {
                nm.set(i, j, this.get(i, j) * s);
            }
        }
        return nm;
    }
    div(s: number): Mat {
        const nm = new Mat(this.r, this.c);
        for (let i = 0; i < this.r; i++) {
            for (let j = 0; j < this.c; j++) {
                nm.set(i, j, this.get(i, j) / s);
            }
        }
        return nm;
    }
    static I(n: number): Mat {
        const m = new Mat(n, n);
        for (let i = 0; i < n; i++) {
            m.set(i, i, 1);
        }
        return m;
    }
    static Z(r: number, c: number): Mat {
        return new Mat(r, c);
    }
}