export { PriorityQueue } from "./src/ds/pq";
export { Queue } from "./src/ds/q";
export { Flag } from "./src/ds/flag";
export { OnceFunction, OnceValue } from "./src/ds/once";
export { Cache } from "./src/ds/cache";
export { StructValidator } from "./src/ds/validate";
export { Dates } from "./src/ds/dates";
export { Point } from "./src/ds/point";
export { Segment } from './src/ds/segment';

export interface IPoint {
    x: number;
    y: number;
    hash: number;
    distanceTo(point: IPoint): number;
    equals(point: IPoint): boolean;
}