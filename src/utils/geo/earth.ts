import { Dates } from "../date/dates";
import { Circle3D } from "../geom/circle";
import { Plane3D } from "../geom/plane";
import { Vec2 } from "../vec/vec2";
import { Vec3 } from "../vec/vec3";
import { eclipticToEquatorial, julianDayToGMSTDegrees, julianDayToSunEcliptic, wrapDegrees } from "./geo";

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
    public static JD: number;
    public static sunEclipticCoords: {lambdaDeg: number, DS_AU: number, epsilonDeg: number};
    public static equatorialCoords: {alphaDeg: number, deltaDeg: number};
    public static GMSTDeg: number;
    private static setParams(date: Date) {
        if (this._date === undefined || date !== this._date) { // only set if date has changed or not set
            this._date = date;
            this.JD = Dates.DateToJulianDay(date);
            this.sunEclipticCoords = julianDayToSunEcliptic(this.JD);
            this.equatorialCoords = eclipticToEquatorial(this.sunEclipticCoords.lambdaDeg, this.sunEclipticCoords.epsilonDeg);
            this.GMSTDeg = julianDayToGMSTDegrees(this.JD);
        }
    }
    public static getSubSolarPoint(date: Date) {
        this.setParams(date);
        const GHA = wrapDegrees(this.GMSTDeg - this.equatorialCoords.alphaDeg); // Greenwich Hour Angle
        const latDeg = this.equatorialCoords.deltaDeg;
        let lngDeg = -GHA;
        lngDeg = ((lngDeg + 180 + 360) % 360) - 180; // convert to -180 to 180
        return { latDeg, lngDeg };
    }
    public static getSunPositionVector(date: Date): Vec3 {
        this.setParams(date);
        const alpha = this.equatorialCoords.alphaDeg * Math.PI / 180;
        const delta = this.equatorialCoords.deltaDeg * Math.PI / 180;
        // inertial frame
        const xEq = this.sunEclipticCoords.DS_AU * Math.cos(delta) * Math.cos(alpha);
        const yEq = this.sunEclipticCoords.DS_AU * Math.cos(delta) * Math.sin(alpha);
        const zEq = this.sunEclipticCoords.DS_AU * Math.sin(delta);
        // earth frame (rotating with the earth)
        const GMSTrad = this.GMSTDeg * Math.PI / 180;
        const cosT = Math.cos(-GMSTrad);
        const sinT = Math.sin(-GMSTrad);
        const xEcef = cosT * xEq - sinT * yEq;
        const yEcef = sinT * xEq + cosT * yEq;
        const zEcef = zEq;
        return new Vec3(xEcef, yEcef, zEcef).Norm();
    }
}