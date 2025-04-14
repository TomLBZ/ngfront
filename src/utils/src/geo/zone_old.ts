import { Cache } from "../ds/cache";
import { Vec2 } from "../vec/vec2";

export class GeoZones<T> {
    private _data: Cache<T> = new Cache<T>();
    private _lngStep: number;
    private _latStep: number;
    constructor(private lngzones: number = 1, private latzones: number = 1) { 
        this._lngStep = 360 / this.lngzones;
        this._latStep = 180 / this.latzones;
    }
    public get zones(): Vec2 {
        return new Vec2(this.lngzones, this.latzones);
    }
    public get dlength(): number {
        return this._data.length;
    }
    bindData(id: number, data: T) {
        this._data.set(id, data);
    }
    getData(id: number): T {
        return this._data.get(id);
    }
    getZoneId(lng: number, lat: number): number {
        const u = Math.floor((lng + 180) % 360 / this._lngStep);
        const v = this.latzones - Math.floor((lat + 90) % 180 / this._latStep) - 1;
        return u + v * this.lngzones;
    }
    getZoneCenter(id: number): Vec2 {
        const u = id % this.lngzones;
        const v = this.latzones - Math.floor(id / this.lngzones) - 1;
        const lng = u * this._lngStep + this._lngStep / 2 - 180;
        const lat = v * this._latStep + this._latStep / 2 - 90;
        return new Vec2(lng, lat);
    }
    private reflectLngLat(p: Vec2, c: Vec2) {
        const nextlng = (p.x + p.x - c.x + 180) % 360 - 180;
        const nextlat = (p.y + p.y - c.y + 90) % 180 - 90;
        return new Vec2(nextlng, nextlat);
    }
    getDualZoneIds(lng: number, lat: number): [number, number] {
        const zid = this.getZoneId(lng, lat);
        const c = this.getZoneCenter(zid);
        const next = this.reflectLngLat(new Vec2(lng, lat), c);
        const zid2 = this.getZoneId(next.x, next.y);
        return [zid, zid2];
    }
    getQuadZoneId(lng: number, lat: number): [number, number, number, number] {
        const zid = this.getZoneId(lng, lat);
        const c = this.getZoneCenter(zid);
        const next = this.reflectLngLat(new Vec2(lng, lat), c);
        const zid2 = this.getZoneId(next.x, next.y);
        const c2 = this.getZoneCenter(zid2);
        const zid3 = this.getZoneId(c.x, c2.y);
        const zid4 = this.getZoneId(c2.x, c.y);
        return [zid, zid2, zid3, zid4];
    }
}