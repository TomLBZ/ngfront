export { SDF } from './src/graphics/sdf';
export { Color } from './src/graphics/color';
export { Icon } from './src/graphics/icon';
export { Bitmap } from './src/graphics/bmp';
export { Path } from './src/graphics/path';
export { Marker } from './src/graphics/marker';
export { MarkerGroup } from './src/graphics/markergrp';

import { Vec2, Vec3 } from './math';
export type SDF2D = (p: Vec2) => number;
export type SDF3D = (p: Vec3) => number;

export enum PathStyle {
    Solid = 0,
    Dashed = 1,
    Dotted = 2,
    DashDot = 3,
}