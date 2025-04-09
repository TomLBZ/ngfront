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