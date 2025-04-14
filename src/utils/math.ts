// consts
export * from './src/math/consts';
// classes
export { Vec } from './src/math/vec';
export { Vec2 } from './src/math/vec2';
export { Vec3 } from './src/math/vec3';
export { Mat } from './src/math/mat';
export { Mat3 } from './src/math/mat3';
export { Angles } from './src/math/angles';
export { Numerics } from './src/math/numerics';
export { Prime } from './src/math/prime';
export { Hash } from './src/math/hash';

export enum HashMode {
    PrimeHash = 0,
    StringHash = 1
}