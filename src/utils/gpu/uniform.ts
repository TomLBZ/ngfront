export class UniformVec2 { 
    constructor(public v: Array<number>) {
        if (v.length !== 2) throw new Error("UniformVec2 must have 2 elements.");
    } 
}
export class UniformVec3 { 
    constructor(public v: Array<number>) {
        if (v.length !== 3) throw new Error("UniformVec3 must have 3 elements.");
    } 
}
export class UniformVec4 { 
    constructor(public v: Array<number>) {
        if (v.length !== 4) throw new Error("UniformVec4 must have 4 elements.");
    } 
}
export class UniformMat2 {
    constructor(public v: Array<number>) {
        if (v.length !== 4) throw new Error("UniformMat2 must have 4 elements.");
    }
}
export class UniformMat3 {
    constructor(public v: Array<number>) {
        if (v.length !== 9) throw new Error("UniformMat3 must have 9 elements.");
    }
}
export class UniformMat4 {
    constructor(public v: Array<number>) {
        if (v.length !== 16) throw new Error("UniformMat4 must have 16 elements.");
    }
}
export class UniformVec2Array {
    public readonly vlen: number = 2;
    constructor(public arr: Array<UniformVec2>) {}
}
export class UniformVec3Array {
    public readonly vlen: number = 3;
    constructor(public arr: Array<UniformVec3>) {}
}
export class UniformVec4Array {
    public readonly vlen: number = 4;
    constructor(public arr: Array<UniformVec4>) {}
}
export class UniformMat2Array {
    public readonly vlen: number = 4;
    constructor(public arr: Array<UniformMat2>) {}
}
export class UniformMat3Array {
    public readonly vlen: number = 9;
    constructor(public arr: Array<UniformMat3>) {}
}
export class UniformMat4Array {
    public readonly vlen: number = 16;
    constructor(public arr: Array<UniformMat4>) {}
}
export class UniformTexture {
    constructor(public url: string, public unit: number) {}
}
export class UniformTextureArray {
    constructor(public textures: Array<UniformTexture>, public unit: number) { }
}
export function CreateUniformVec(arr: Array<number>) : UniformVec | UniformFloat {
    switch (arr.length) {
        case 2: return new UniformVec2(arr);
        case 3: return new UniformVec3(arr);
        case 4: return new UniformVec4(arr);
        default: return arr[0];
    }
}
export function CreateUniformMat(arr: Array<number>) : UniformMat | UniformFloat {
    switch (arr.length) {
        case 4: return new UniformMat2(arr);
        case 9: return new UniformMat3(arr);
        case 16: return new UniformMat4(arr);
        default: return arr[0];
    }
}
export type UniformFloat = number;
export type UniformVec = UniformVec2 | UniformVec3 | UniformVec4;
export type UniformMat = UniformMat2 | UniformMat3 | UniformMat4;
export type UniformVecArray = UniformVec2Array | UniformVec3Array | UniformVec4Array;
export type UniformMatArray = UniformMat2Array | UniformMat3Array | UniformMat4Array;
export type UniformVecLike = UniformVec | UniformMat;
export type UniformTextureLike = UniformTexture | UniformTextureArray;
export type UniformArrayLike = UniformVecArray | UniformMatArray;
export type UniformValueLike = UniformFloat | UniformTextureLike;
export function isUniformVec(u: Uniform): u is UniformVec {
    return u instanceof UniformVec2 || u instanceof UniformVec3 || u instanceof UniformVec4;
}
export function isUniformMat(u: Uniform): u is UniformMat {
    return u instanceof UniformMat2 || u instanceof UniformMat3 || u instanceof UniformMat4;
}
export function isUniformVecLike(u: Uniform): u is UniformVecLike {
    return isUniformVec(u) || isUniformMat(u);
}
export function isUniformTextureLike(u: Uniform): u is UniformTextureLike {
    return u instanceof UniformTexture || u instanceof UniformTextureArray;
}
export function isUniformArrayLike(u: Uniform): u is UniformArrayLike {
    return u instanceof UniformVec2Array || u instanceof UniformVec3Array || u instanceof UniformVec4Array ||
        u instanceof UniformMat2Array || u instanceof UniformMat3Array || u instanceof UniformMat4Array;
}
export function isUniformValueLike(u: Uniform): u is UniformValueLike {
    return typeof u === "number" || isUniformTextureLike(u);
}
export type Uniform = UniformVecLike | UniformArrayLike | UniformValueLike;
export type UniformDict = { [key: string]: Uniform };

export type UniformData =
    | number
    | boolean
    | number[]
    | boolean[]
    | Int32Array
    | Uint32Array
    | Float32Array;

export enum UniformType {
    FLOAT,
    VEC2,
    VEC3,
    VEC4,
    INT,
    IVEC2,
    IVEC3,
    IVEC4,
    UINT,
    UVEC2,
    UVEC3,
    UVEC4,
    BOOL,
    BVEC2,
    BVEC3,
    BVEC4,
    MAT2,
    MAT3,
    MAT4,
    SAMPLER2D,
    SAMPLERCUBE,
    SAMPLER2DARRAY, // NEW: texture array sampler
}