export { SDF } from './src/graphics/sdf';
export { Color } from './src/graphics/color';
export { Icon } from './src/graphics/icon';
export { Bitmap } from './src/graphics/bmp';
export { Point } from './src/graphics/point';
export { Segment } from './src/graphics/segment';
export { Path } from './src/graphics/path';

import { Vec2, Vec3 } from './math';
export type SDF2D = (p: Vec2) => number;
export type SDF3D = (p: Vec3) => number;

export interface IPoint {
    x: number;
    y: number;
    hash: number;
    distanceTo(point: IPoint): number;
    equals(point: IPoint): boolean;
}

export enum PathStyle {
    Solid = 0,
    Dashed = 1,
    Dotted = 2,
    DashDot = 3,
}