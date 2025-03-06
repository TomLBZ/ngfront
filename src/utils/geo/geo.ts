import { Mat3 } from "../mat/mat3";
import { Vec3 } from "../vec/vec3";


export const AU = 149597870.7e3; // meters
export const c = 299792458; // meters per second
export const SUNR = 695660e3; // meters

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
    // returns the north vector on a plane perpendicular to the surface of the earth at a given coordinate.
    public static getNorthAtPos(p: Vec3): Vec3 { // p is the position vector
        return p.Cross(this.North).Cross(p).Norm();
    }
    private static wrapDegrees(deg: number): number {
        return ((deg % 360) + 360) % 360;
    }
    public static getJulianDay(date: Date): number {
        let Y = date.getUTCFullYear();
        let M = date.getUTCMonth() + 1; // change 0-based to 1-based
        let D = date.getUTCDate() 
            + date.getUTCHours() / 24 
            + date.getUTCMinutes() / 1440 
            + date.getUTCSeconds() / 86400
            + date.getUTCMilliseconds() / 86400000;
        if (M < 3) { // for Jan and Feb, treat as months 13 and 14 of the previous year
            Y -= 1;
            M += 12;
        }
        const A = Math.floor(Y / 100);
        const B = 2 - A + Math.floor(A / 4);
        return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
    }
    public static getSunEcliptic(JD: number) {
        const n = JD - 2451545.0; // number of days since J2000.0
        const L = 280.460 + 0.9856474 * n; // mean longitude of the sun
        const g = 357.528 + 0.9856003 * n; // mean anomaly of the sun
        const gRad = g * Math.PI / 180;
        const lambda = L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad); // ecliptic longitude
        const R = 1.00014 - 0.01671 * Math.cos(gRad) - 0.00014 * Math.cos(2 * gRad); // distance from the sun in AU
        const epsilon = 23.439 - 0.0000004 * n; // obliquity of the ecliptic
        return {
            lambdaDeg: this.wrapDegrees(lambda),
            R_AU: R,
            epsilonDeg: this.wrapDegrees(epsilon)
        };
    }
    public static eclipticToEquatorial(lambdaDeg: number, epsilonDeg: number) {
        const lambdaRad = lambdaDeg * Math.PI / 180;
        const epsilonRad = epsilonDeg * Math.PI / 180;
        const sinLambda = Math.sin(lambdaRad);
        const cosLambda = Math.cos(lambdaRad);
        const sinEps = Math.sin(epsilonRad);
        const cosEps = Math.cos(epsilonRad);
        const alphaRad = Math.atan2(cosEps * sinLambda, cosLambda); // right ascension
        const alphaDeg = alphaRad * 180 / Math.PI;
        const deltaRad = Math.asin(sinEps * sinLambda); // declination
        const deltaDeg = deltaRad * 180 / Math.PI;
        return {
            alphaDeg: this.wrapDegrees(alphaDeg),
            deltaDeg // not wrapping declination, because it's -90 to 90
        }
    }
    public static getGMSTdegrees(JD: number) {
        const T = (JD - 2451545.0) / 36525.0; // number of Julian centuries since J2000.0
        const GMST = 280.46061837 
            + 360.98564736629 * (JD - 2451545.0) 
            + 0.000387933 * T * T 
            - T * T * T / 38710000;
        return this.wrapDegrees(GMST);
    }
    private static _date: Date;
    public static JD: number;
    public static lambdaDeg: number;
    public static R_AU: number;
    public static epsilonDeg: number;
    public static alphaDeg: number;
    public static deltaDeg: number;
    public static GMSTDeg: number;
    private static setParams(date: Date) {
        const JD = this.getJulianDay(date);
        this.JD = JD;
        const { lambdaDeg, R_AU, epsilonDeg } = this.getSunEcliptic(JD);
        this.lambdaDeg = lambdaDeg;
        this.R_AU = R_AU;
        this.epsilonDeg = epsilonDeg;
        const { alphaDeg, deltaDeg } = this.eclipticToEquatorial(lambdaDeg, epsilonDeg);
        this.alphaDeg = alphaDeg;
        this.deltaDeg = deltaDeg;
        const GMST = this.getGMSTdegrees(JD);
        this.GMSTDeg = GMST;
    }
    public static getSubSolarPoint(date: Date) {
        if (this._date === undefined || date !== this._date) {
            this._date = date;
            this.setParams(date);
        }
        const GHA = this.wrapDegrees(this.GMSTDeg - this.alphaDeg); // Greenwich Hour Angle
        const latDeg = this.deltaDeg;
        let lngDeg = -GHA;
        lngDeg = ((lngDeg + 180 + 360) % 360) - 180; // convert to -180 to 180
        return { latDeg, lngDeg };
    }
    public static getSunPositionVector(date: Date): Vec3 {
        if (this._date === undefined || date !== this._date) {
            this._date = date;
            this.setParams(date);
        }
        const alpha = this.alphaDeg * Math.PI / 180;
        const delta = this.deltaDeg * Math.PI / 180;
        // inertial frame
        const xEq = this.R_AU * Math.cos(delta) * Math.cos(alpha);
        const yEq = this.R_AU * Math.cos(delta) * Math.sin(alpha);
        const zEq = this.R_AU * Math.sin(delta);
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

// assumes the observer is at the origin.
export class ObserverOnEarth {
    private _Z: Vec3; // up axis in earth frame
    private _Y: Vec3; // front axis in earth frame
    private _X: Vec3; // right axis in earth frame
    public readonly oposE: Vec3; // in earth frame
    public get up(): Vec3 { return this._Z; }
    public get front(): Vec3 { return this._Y; }
    public get right(): Vec3 { return this._X; }
    public get eX(): Vec3 { return new Vec3(this._X.x, this._Y.x, this._Z.x); } // earth's up in observer frame
    public get eY(): Vec3 { return new Vec3(this._X.y, this._Y.y, this._Z.y); } // earth's front in observer frame
    public get eZ(): Vec3 { return new Vec3(this._X.z, this._Y.z, this._Z.z); } // earth's right in observer
    private _R!: Mat3;
    private _RT!: Mat3;
    private update() {
        this._R = Mat3.fromArray([
            this._X.x, this._Y.x, this._Z.x,
            this._X.y, this._Y.y, this._Z.y,
            this._X.z, this._Y.z, this._Z.z
        ]);
        this._RT = this._R.T();
    }
    constructor(public lng: number, public lat: number, public alt: number) {
        this.oposE = Earth.getPosition(lng, lat, alt);
        this._Z = this.oposE.Norm(); // up vector is along the position vector in earth coordinates
        this._Y = Earth.getNorthAtPos(this._Z); // forward vector is perpendicular to the surface of the earth and points north
        this._X = this._Y.Cross(this._Z).Norm(); // right vector is perpendicular to the surface of the earth and points east
        this.update();
    }
    public transform(roll: number, pitch: number, yaw: number) { // apply yaw first, then pitch, then roll
        // yaw changes front direction, thereby changing right direction
        this._Y = this._Y.rotateAxis(yaw, this._Z).Norm();
        this._X = this._Y.Cross(this._Z).Norm();
        // pitch changes front direction, thereby changing the up direction
        this._Y = this._Y.rotateAxis(pitch, this._X).Norm();
        this._Z = this._X.Cross(this._Y).Norm();
        // roll changes up direction, thereby changing the right direction
        this._Z = this._Z.rotateAxis(roll, this._Y).Norm();
        this._X = this._Y.Cross(this._Z).Norm();
        this.update();
    }
    public O2E_p(vo: Vec3): Vec3 { // vo is in the observer frame, should be converted to the Earth frame
        return this._R.MulV(vo).Add(this.oposE);
    }
    public E2O_p(ve: Vec3): Vec3 { // ve is in the Earth frame, should be converted to the observer frame
        return this._RT.MulV(ve.Sub(this.oposE));
    }
    public O2E_v(vo: Vec3): Vec3 { // vo is in the observer frame, should be converted to the Earth frame
        return this._R.MulV(vo);
    }
    public E2O_v(ve: Vec3): Vec3 { // ve is in the Earth frame, should be converted to the observer frame
        return this._RT.MulV(ve);
    }
}