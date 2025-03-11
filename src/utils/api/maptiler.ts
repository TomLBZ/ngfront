export class MapTile {
    constructor(public url: string, public xyz: [number, number, number]) {}
}
export class MapTiler {
    public constructor(public key: string) { }
    public lnglat2xy(z: number, lng: number, lat: number): [number, number] {
        const zfactor = 1 << z;
        const d2r = Math.PI / 180;
        const x = Math.floor((lng + 180) / 360 * zfactor);
        const y = Math.floor((1 - Math.log(Math.tan(lat * d2r) + 1 / Math.cos(lat * d2r)) / Math.PI) / 2 * zfactor);
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
    public alt2z(alt: number) {
        const r = 6371000; // earth radius in meters
        const _z = Math.floor(Math.log2(r * 4 / alt)); // when 4 radius above the earth, z = 0
        if (isNaN(_z)) return 0;
        return Math.max(0, Math.min(19, _z));
    }
    private recursiveSkirts(z: number, lng: number, lat: number, skirts: number, tiles: MapTile[]): MapTile[] {
        if (skirts === 0) return tiles; // base case, no skirts
        if (z === 0) return tiles; // base case, no more zoom levels
        const [x, y] = this.lnglat2xy(z, lng, lat);
        if (isNaN(x) || isNaN(y)) return tiles; // base case, out of bounds
        if (z === 1) { // only 4 tiles at z = 1, tiles are either 0 or 1
            tiles.push(this.getTileByXY(z, 1 - x, y));
            tiles.push(this.getTileByXY(z, x, 1 - y));
            tiles.push(this.getTileByXY(z, 1 - x, 1 - y));
            return tiles;
        }
        const zfactor = 1 << z;
        const wrap: Function = (a: number) => (a + zfactor) % zfactor;
        for (let j = y - 1; j <= y + 1; j++) {
            for (let i = x - 1; i <= x + 1; i++) {
                if (i === x && j === y) continue;
                tiles.push(this.getTileByXY(z, wrap(i), wrap(j)));
            }
        }
        return this.recursiveSkirts(z - 1, lng, lat, skirts - 1, tiles);
    }
    public autoTiles(lng: number, lat: number, alt: number, skirts: number = 1): MapTile[] {
        const z: number = this.alt2z(alt);
        const tiles: MapTile[] = [];
        const [x, y] = this.lnglat2xy(z, lng, lat);
        if (isNaN(x) || isNaN(y)) return tiles; // base case, out of bounds
        tiles.push(this.getTileByXY(z, x, y)); // center tile is always pushed
        return this.recursiveSkirts(z, lng, lat, skirts, tiles);
    }
}