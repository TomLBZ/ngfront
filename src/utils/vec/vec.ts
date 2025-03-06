export interface Vec<T> {
    [index: number]: number;
    readonly length: number;
    get(index: number): number;
    set(index: number, value: number): void;
    Dot(v: T): number;
    Dist(v: T): number;
    sub(s: number): T;
    Sub(v: T): T;
    add(s: number): T;
    Add(v: T): T;
    mul(s: number): T;
    Mul(v: T): T;
    div(s: number): T;
    Div(s: T): T;
    Len(): number;
    min(): number;
    Min(v: T): T;
    max(): number;
    Max(v: T): T;
    Norm(): T;
    Neg(): T;
    ToArray(): Array<number>;
    FromArray(arr: Array<number>): T;
    toString(): string;
}