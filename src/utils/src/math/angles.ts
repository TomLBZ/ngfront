import { mod } from './numerics';
import { PI2, DEG_RAD, RAD_DEG } from './consts';

/**
 * Static class for angle conversions and wrapping.
 * @class Angles
 * @description Provides static methods for converting between degrees and radians, and wrapping angles to a specified range.
 * @static wrapDeg - Wraps an angle in degrees to the range [0, 360).
 * @static wrapDeg180 - Wraps an angle in degrees to the range (-180, 180].
 * @static wrapRad - Wraps an angle in radians to the range [0, 2π).
 * @static wrapRadPi - Wraps an angle in radians to the range (-π, π].
 * @static degToRad - Converts an angle in degrees to radians.
 * @static radToDeg - Converts an angle in radians to degrees.
 */
export class Angles {
    public static wrapDeg = wrapDeg;
    public static wrapDeg180 = wrapDeg180;
    public static wrapRad = wrapRad;
    public static wrapRadPi =wrapRadPi;  
    public static degToRad = degToRad;
    public static radToDeg = radToDeg;
}
// The following functions are exported for use in other modules.
export function wrapDeg(deg: number): number {
    return mod(deg, 360);
}
export function wrapDeg180(deg: number): number {
    const wrapped = wrapDeg(deg);
    return wrapped > 180 ? wrapped - 360 : wrapped;
}
export function wrapRad(rad: number): number {
    return mod(rad, PI2);
}
export function wrapRadPi(rad: number): number {
    const wrapped = wrapRad(rad);
    return wrapped > Math.PI ? wrapped - PI2 : wrapped;
}
export function degToRad(deg: number): number {
    return deg * RAD_DEG;
}
export function radToDeg(rad: number): number {
    return rad * DEG_RAD;
}    