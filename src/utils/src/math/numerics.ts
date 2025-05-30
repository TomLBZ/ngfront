/**
 * Static class Clamp utility functions for mathematical operations.
 * @class Clamp
 * @description This class provides static methods for clamping, wrapping, and smoothing values.
 * @static mod: takes two numbers and returns the modulus of the first number by the second.
 * @static wrap: takes a number and wraps it within a specified range.
 * @static clamp: takes a number and clamps it within a specified range.
 * @static unitClamp: takes a number and clamps it within the range [0, 1].
 * @static unitSmoothstep: takes a number and returns a smoothstep value between 0 and 1 based on the specified range.
 * @static smoothstep: takes a number and returns a smoothstep value based on the specified range.
 * @static lerp: takes two numbers and a ratio, and returns a linear interpolation between the two numbers based on the ratio.
 */
export class Numerics {
    public static mod = mod;
    public static wrap = wrap;
    public static clamp = clamp;
    public static unitClamp = unitClamp;
    public static unitSmoothstep = unitSmoothstep;
    public static smoothstep = smoothstep;
    public static lerp = lerp;
}
// The following functions are exported for use in other modules.
export function mod(a: number, b: number): number {
    return a - Math.floor(a / b) * b;
}
export function wrap(a: number, min: number, max: number): number {
    return mod(a - min, max - min) + min;
}
export function clamp(a: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, a));
}
export function unitClamp(a: number): number {
    return clamp(a, 0, 1);
}
export function unitSmoothstep(t: number, min: number, max: number): number {
    const clamped = unitClamp((t - min) / (max - min)); // get a clamped ratio between 0 and 1
    return clamped * clamped * (3 - 2 * clamped); // output a smoothstep value between 0 and 1
}
export function smoothstep(t: number, min: number, max: number): number {
    const unitStepped = unitSmoothstep(t, min, max);
    return unitStepped * (max - min) + min; // scale the value back to the original range
}
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * unitClamp(t);
}    