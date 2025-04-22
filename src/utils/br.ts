export { MapTiler } from "./src/br/maptiler";
export { ApiBridge } from "./src/br/api";

export interface MapTile {
    url: string, 
    x: number,
    y: number,
    z: number,
}