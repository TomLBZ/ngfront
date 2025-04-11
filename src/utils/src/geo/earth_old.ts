import { Circle3D } from "../../geom/circle";
import { Plane3D } from "../../geom/plane";
import { Vec3 } from "../vec/vec3";
import { SunData } from "./types";
import { Astro } from "../../geo";

// assumes earth is at the origin with north pole along the z-axis and the prime meridian along the x-axis.
export class Earth {
    public static readonly R: number = 6371e3; // meters
    public static readonly RE: number = 6378137.0; // meters
    public static readonly RP: number = 6356752.3; // meters
    public static readonly C: number = 2 * Math.PI * this.R; // meters
    public static readonly Tilt: number = 23.44 * Math.PI / 180; // radians
    public static readonly North: Vec3 = new Vec3(0, 0, 1);

    // degrees to radians
    private static d2r(d: number): number {
        return d * Math.PI / 180;
    }
    // computes the accurate radius at a latitude.
    public static getRadius(lat: number): number {
        lat = this.d2r(Math.abs(lat)); // convert to radians. lat is -90 to 90.
        const cosLat = Math.cos(lat);
        const sinLat = Math.sin(lat);
        const a = this.RE * this.RE * cosLat;
        const b = this.RP * this.RP * sinLat;
        const c = this.RE * cosLat;
        const d = this.RP * sinLat;
        return Math.sqrt((a * a + b * b) / (c * c + d * d));
    }
    // returns the position of a point on the surface of the earth given its longitude, latitude, and altitude.
    public static getPosition(lngDeg: number, latDeg: number, alt: number): Vec3 {
        const lng = this.d2r(lngDeg);
        const lat = this.d2r(latDeg);
        const cosLat = Math.cos(lat);
        const sinLat = Math.sin(lat);
        const cosLng = Math.cos(lng);
        const sinLng = Math.sin(lng);
        const r = this.getRadius(lat) + alt; // accurate radius at latitude + altitude
        const x = r * cosLat * cosLng;
        const y = r * cosLat * sinLng;
        const z = r * sinLat;
        return new Vec3(x, y, z);
    }
    // returns the lng and lat and alt of a point on the surface of the earth given its position vector.
    public static getLngLatAlt(p: Vec3): Vec3 {
        const r = p.Len();
        const lng = Math.atan2(p.y, p.x);
        const lat = Math.asin(p.z / r);
        return new Vec3(lng * 180 / Math.PI, lat * 180 / Math.PI, r - this.getRadius(lat));
    }
    // returns the north vector on a plane perpendicular to the surface of the earth at a given coordinate.
    public static getNorthAtPos(p: Vec3): Vec3 { // p is the position vector
        return p.Cross(this.North).Cross(p).Norm();
    }
    // returns the intersection of a plane with Earth, assuming that Earth is a sphere at the origin
    public static getIntersection(pl: Plane3D): Circle3D | undefined {
        const d = Math.abs(pl.d); // distance from the origin
        if (d > this.R) return undefined; // plane does not intersect Earth as it is outside the sphere
        const r = Math.sqrt(this.R * this.R - d * d); // radius of the intersection circle
        const cent = pl.n.mul(d).Neg(); // center of the circle
        return new Circle3D(cent, pl.n, r);
    }
    private static _date: Date;
    public static sunData: SunData;
    private static setParams(date: Date) {
        if (this._date === undefined || date !== this._date) { // only set if date has changed or not set
            this._date = date;
            this.sunData = Astro.dateToSunData(date);
        }
    }
    public static getSubSolarPoint(date: Date) {
        this.setParams(date);
        return Astro.sunDataToSubSolarPoint(this.sunData);
    }
    public static getSunPositionVector(date: Date): Vec3 {
        this.setParams(date);
        const {x, y, z} = Astro.sunDataToSunPositionVectorEcef(this.sunData);
        return new Vec3(x, y, z).Norm();
    }
}