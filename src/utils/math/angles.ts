import { mod } from './clamp';
import { PI2, DEG_RAD, RAD_DEG } from './consts';

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