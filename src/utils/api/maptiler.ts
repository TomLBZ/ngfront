import { Downloader } from "./downloader";

export class MapTiler {
    public constructor(public key: string) { }
    public async getTile(z: number, x: number, y: number): Promise<ImageBitmap> {
        const url = `https://api.maptiler.com/tiles/satellite-v2/${z}/${x}/${y}.jpg?key=${this.key}`;
        return Downloader.downloadImage(url);
    }
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
    public async getTileByLngLat(z: number, lng: number, lat: number): Promise<ImageBitmap> {
        const xy = this.lnglat2xy(lng, lat, z);
        return this.getTile(z, xy[0], xy[1]);
    }
    public getBounds(z: number, x: number, y: number): [number, number, number, number] {
        const tl = this.xy2lnglat(z, x, y);
        const br = this.xy2lnglat(z, x + 1, y + 1);
        return [tl[0], tl[1], br[0], br[1]];
    }
    public alt2z(alt: number) {
        const r = 6371000; // earth radius in meters
        const _z = Math.floor(Math.log2(r / alt));
        if (isNaN(_z)) return 0;
        return Math.max(0, Math.min(19, _z));
    }
    public async autoTilesXYZ(x: number, y: number, z: number, skirts: number = 3): Promise<ImageBitmap[]> {
        const tiles: ImageBitmap[] = [];
        tiles.push(await this.getTile(z, x, y)); // center tile is always pushed
        if (z === 1) { // append the other 3 tiles
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    if (i === x && j === y) continue;
                    tiles.push(await this.getTile(z, i, j));
                }
            }
        } else { // append 3 tiles based on distance from center as skirts, then recursively call autoTilesXYZ
            // TODO: FIND A BETTER WAY TO DO THIS
        }
        return tiles;
    }
    public async autoTiles(lng: number, lat: number, alt: number, skirts: number = 3): Promise<ImageBitmap[]> {
        const z: number = this.alt2z(alt);
        const xy: [number, number] = this.lnglat2xy(z, lng, lat);
        const tiles: ImageBitmap[] = [];
        tiles.push(await this.getTile(z, xy[0], xy[1])); // center tile is always pushed
        if (z === 1) { // append the other 3 tiles
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    if (i === xy[0] && j === xy[1]) continue;
                    tiles.push(await this.getTile(z, i, j));
                }
            }
            // TODO: CHANGE ALGORITHM TO INCLUDE SKIRTS!
        }
        return tiles;
    }
}