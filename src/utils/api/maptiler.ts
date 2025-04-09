import { Camera } from "../geo/camera_old";
import { Earth } from "../geo/earth_old";
import { ObserverOnEarth } from "../geo/observer_old";

export class MapTile {
    constructor(public url: string, public xyz: [number, number, number]) {}
}
export class MapTiler {
    public constructor(public key: string) { }
    public lnglat2xy(z: number, lng: number, lat: number): [number, number] {
        if (z === 0) return [0, 0]; // zoom level 0 always have the same tile at 0, 0
        return this.ueXY2xy(z, ...this.lnglat2UnscaledExactXY(lng, lat));
    }
    public ueXY2xy(z: number, uex: number, uey: number): [number, number] {
        const zfactor = 1 << z;
        const x = Math.floor(uex * zfactor);
        const y = Math.floor(uey * zfactor);
        return [x, y];
    }
    public lnglat2UnscaledExactXY(lng: number, lat: number): [number, number] {
        const d2r = Math.PI / 180;
        const x = lng / 360 + 0.5;
        lat = Math.max(-89.9999, Math.min(89.9999, lat)); // avoid singularity
        const y = (1 - Math.log(Math.tan(lat * d2r) + 1 / Math.cos(lat * d2r)) / Math.PI) / 2;
        return [x, y];
    }
    public xy2lnglat(z: number, x: number, y: number): [number, number] {
        const zfactor = 1 << z;
        const lng = x / zfactor * 360 - 180;
        const lat = 180 / Math.PI * Math.atan(Math.sinh(Math.PI * (1 - 2 * y / zfactor)));
        return [lng, lat];
    }
    public getTileByXY(z: number, x: number, y: number): MapTile {
        const url = `https://api.maptiler.com/tiles/satellite-v2/${z}/${x}/${y}.jpg?key=${this.key}`;
        return new MapTile(url, [x, y, z]);
    }
    public getTileByLngLat(z: number, lng: number, lat: number): MapTile {
        const xy = this.lnglat2xy(lng, lat, z);
        return this.getTileByXY(z, xy[0], xy[1]);
    }
    public alt2z(alt: number, r: number = 6371000): number {
        const _z = Math.floor(Math.log2(r * 5 / alt)); // when 5 radius above the earth, z = 0
        if (isNaN(_z)) return 0;
        return Math.max(0, Math.min(19, _z));
    }
    private singleSkirt(z: number, uex: number, uey: number, center: boolean, tiles: MapTile[]): void {
        if (z === 0) { // no need to skirt, but if center is required, push the only tile at z = 0
            if (center) tiles.push(this.getTileByXY(0, 0, 0));
            return; // count = 1
        }
        const [x, y] = this.ueXY2xy(z, uex, uey);
        if (z === 1) { // only 4 tiles at z = 1, tiles are either 0 or 1, push all 3 other tiles
            if (center) tiles.push(this.getTileByXY(z, x, y));
            tiles.push(this.getTileByXY(z, 1 - x, y));
            tiles.push(this.getTileByXY(z, x, 1 - y));
            tiles.push(this.getTileByXY(z, 1 - x, 1 - y));
            return; // count = 1 + 3
        }
        const zfactor = 1 << z;
        const wrap: Function = (a: number) => (a + zfactor) % zfactor;
        for (let j = y - 1; j <= y + 1; j++) { // push 8 surrounding tiles at the zoom level
            for (let i = x - 1; i <= x + 1; i++) {
                if (i === x && j === y && !center) continue; // skip the center tile
                tiles.push(this.getTileByXY(z, wrap(i), wrap(j))); // push the tile
            }
        }
    }
    public autoCenterTiles(lng: number, lat: number, alt: number, skirts: number = 1, bgdz: number = 3): MapTile[] {
        const z: number = this.alt2z(alt, Earth.getRadius(lat));
        const tiles: MapTile[] = [];
        const [uex, uey] = this.lnglat2UnscaledExactXY(lng, lat);
        const bgz = Math.max(0, z - bgdz); // guard zoom level
        const skz = Math.max(0, z - skirts + 1); // skirt zoom level
        for (let zz = z; zz >= skz; zz--) { // skirts pushed down to the skirt zoom level
            this.singleSkirt(zz, uex, uey, false, tiles); // push the skirt, with center tile at the current zoom level
        }
        if (bgz < skz) { // push the guard tiles
            if (bgz === 0) tiles.push(this.getTileByXY(0, 0, 0)); // guardz = 0, push the only tile at z = 0
            else this.singleSkirt(bgz, uex, uey, skz - bgz > 1, tiles); // push the surrounding tiles at the guard zoom
        }
        return tiles; // count = 1 + 8 * skirts + 1
    }
    public autoRayTiles(cam: Camera): MapTile[] {
        // TODO: implement this:
        // 1. Find the view pyramid's intersection with the earth surface
        //    - Use the observer's FoV and the observer's looking direction to find the view pyramid
        //    - Find the intersection of the view pyramid with the earth surface
        // 2. Find the 4 corners of the view pyramid's intersection with the earth surface
        //    - Represent in lng, lat
        //    - Points are bounded by the distant horizon
        //    - If some edges of the view pyramid is above the horizon, the cooresponding points are on the horizon
        //    - If the entire view pyramid is above the horizon, the intersection is empty
        // 3. Find the tiles that cover the view pyramid's intersection region with the earth surface
        //    - From the furthest to the cloest, find the tiles that cover the region one by one
        //    - Use the distances for each z-level to segment the view pyramid's intersection region into strips
        //    - Find the tiles that cover each strip, given the known z-level (therefore tile size)
        //    - Push the tiles into the array
        // 4. Return the array of tiles
        return []; // dummy return
    }
}