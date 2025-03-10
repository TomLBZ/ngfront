export class MapTile {
    constructor(public url: string, public tl: [number, number], public br: [number, number]) {}
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
        const tl = this.xy2lnglat(z, x, y);
        const br = this.xy2lnglat(z, x + 1, y + 1);
        return new MapTile(url, tl, br);
    }
    public getTileByLngLat(z: number, lng: number, lat: number): MapTile {
        const xy = this.lnglat2xy(lng, lat, z);
        return this.getTileByXY(z, xy[0], xy[1]);
    }
    public alt2z(alt: number) {
        const r = 6371000; // earth radius in meters
        const _z = Math.floor(Math.log2(r / alt));
        if (isNaN(_z)) return 0;
        return Math.max(0, Math.min(19, _z));
    }
    private recursiveSkirts(z: number, lng: number, lat: number, skirts: number, tiles: MapTile[]): MapTile[] {
        if (skirts === 0) return tiles; // base case, no skirts
        if (z === 0) return tiles; // base case, no more zoom levels
        const [x, y] = this.lnglat2xy(z, lng, lat);
        const zfactor = 1 << z;
        const maxX = Math.min(zfactor - 1, x + 1);
        const maxY = Math.min(zfactor - 1, y + 1);
        const minX = Math.max(0, x - 1);
        const minY = Math.max(0, y - 1);
        for (let i = minX; i <= maxX; i++) {
            for (let j = minY; j <= maxY; j++) {
                if (i === x && j === y) continue;
                tiles.push(this.getTileByXY(z, i, j));
            }
        }
        return this.recursiveSkirts(z - 1, lng, lat, skirts - 1, tiles);
    }
    public autoTiles(lng: number, lat: number, alt: number, skirts: number = 1): MapTile[] {
        const z: number = this.alt2z(alt);
        const [x, y] = this.lnglat2xy(z, lng, lat);
        const tiles: MapTile[] = [];
        tiles.push(this.getTileByXY(z, x, y)); // center tile is always pushed
        return this.recursiveSkirts(z, lng, lat, skirts, tiles);
    }
}