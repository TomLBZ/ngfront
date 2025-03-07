export class UniformVec2 { 
    constructor(public arr: Array<number>) {
        if (arr.length !== 2) throw new Error("UniformVec2 must have 2 elements.");
    } 
}
export class UniformVec3 { 
    constructor(public arr: Array<number>) {
        if (arr.length !== 3) throw new Error("UniformVec3 must have 3 elements.");
    } 
}
export class UniformVec4 { 
    constructor(public arr: Array<number>) {
        if (arr.length !== 4) throw new Error("UniformVec4 must have 4 elements.");
    } 
}
export class UniformMat2 {
    constructor(public arr: Array<number>) {
        if (arr.length !== 4) throw new Error("UniformMat2 must have 4 elements.");
    }
}
export class UniformMat3 {
    constructor(public arr: Array<number>) {
        if (arr.length !== 9) throw new Error("UniformMat3 must have 9 elements.");
    }
}
export class UniformMat4 {
    constructor(public arr: Array<number>) {
        if (arr.length !== 16) throw new Error("UniformMat4 must have 16 elements.");
    }
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
export type UniformSingle = UniformFloat | UniformTexture | UniformTextureArray;
export type Uniform = UniformVec | UniformMat | UniformSingle;
export type UniformDict = { [key: string]: Uniform };