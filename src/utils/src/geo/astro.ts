import { Angles } from "../../math";
import { EclipticCoords, EquatorialCoords, CartesianCoords3D, SunData, GeodeticCoords, GeoHelper } from "../../geo";

export class Astro {
    public static julianDayToObliquity = julianDayToObliquity;
    public static julianDayToSunEcliptic = julianDayToSunEcliptic;
    public static eclipticToRectangular = eclipticToRectangular;
    public static eclipticToEquatorial = eclipticToEquatorial;
    public static equatorialToRectangular = equatorialToRectangular;
    public static julianDayToGMSTDegrees = julianDayToGMSTDegrees;
    public static DateToJulianDay = DateToJulianDay;
    public static dateToSunData = dateToSunData;
    public static sunDataToSubSolarPoint = sunDataToSubSolarPoint;
    public static sunDataToSunPositionVectorEcef = sunDataToSunPositionVectorEcef;
}

export function julianDayToObliquity(JD: number): number {
    const n = JD - 2451545.0; // number of days since J2000.0
    const epsilon = 23.439292 - 0.0000004 * n; // obliquity of the ecliptic in degrees
    return Angles.degToRad(Angles.wrapDeg(epsilon)); // obliquity of the ecliptic in radians
}
export function julianDayToSunEcliptic(JD: number): EclipticCoords {
    const n = JD - 2451545.0; // number of days since J2000.0
    const L = 280.460 + 0.9856474 * n; // mean longitude of the sun
    const g = 357.528 + 0.9856003 * n; // mean anomaly of the sun
    const wrappedL = Angles.wrapDeg(L); // wrap to 0-360 degrees
    const wrappedG = Angles.wrapDeg(g); // wrap to 0-360 degrees
    const gRad = Angles.degToRad(wrappedG); // convert g to radians
    const lambda = wrappedL + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad); // ecliptic longitude in degrees
    const R = 1.00014 - 0.01671 * Math.cos(gRad) - 0.00014 * Math.cos(2 * gRad); // distance from the sun in AU
    const lngRad = Angles.degToRad(Angles.wrapDeg(lambda)); // ecliptic longitude in radians
    return [lngRad, 0, R] as EclipticCoords; // latitude of the sun is 0 for the ecliptic plane
}
export function eclipticToRectangular(eclipticCoords: EclipticCoords): CartesianCoords3D {
    const [lambda, beta, R] = eclipticCoords; // unpack ecliptic coordinates
    const cosBeta = Math.cos(beta);
    const sinBeta = Math.sin(beta);
    const cosLambda = Math.cos(lambda);
    const sinLambda = Math.sin(lambda);
    const x = R * cosBeta * cosLambda; // x coordinate
    const y = R * cosBeta * sinLambda; // y coordinate
    const z = R * sinBeta; // z coordinate
    return [x, y, z] as CartesianCoords3D; // rectangular coordinates
}
export function eclipticToEquatorial(eclipticCoords: EclipticCoords, epsilon: number): EquatorialCoords {
    const [lambda, , R] = eclipticCoords; // unpack ecliptic coordinates
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
    const sinEps = Math.sin(epsilon);
    const cosEps = Math.cos(epsilon);
    const alpha = Math.atan2(cosEps * sinLambda, cosLambda); // right ascension
    const delta = Math.asin(sinEps * sinLambda); // declination
    return [alpha, delta, R] as EquatorialCoords; // equatorial coordinates
}
export function equatorialToRectangular(equatorialCoords: EquatorialCoords): CartesianCoords3D {
    const [alpha, delta, R] = equatorialCoords; // unpack equatorial coordinates
    const cosDelta = Math.cos(delta);
    const sinDelta = Math.sin(delta);
    const cosAlpha = Math.cos(alpha);
    const sinAlpha = Math.sin(alpha);
    const x = R * cosDelta * cosAlpha; // x coordinate
    const y = R * cosDelta * sinAlpha; // y coordinate
    const z = R * sinDelta; // z coordinate
    return [x, y, z] as CartesianCoords3D; // rectangular coordinates
}
export function julianDayToGMSTDegrees(JD: number): number {
    const T = (JD - 2451545.0) / 36525.0; // number of Julian centuries since J2000.0
    const GMST = 280.46061837 
        + 360.98564736629 * (JD - 2451545.0) 
        + 0.000387933 * T * T 
        - T * T * T / 38710000;
    return Angles.wrapDeg(GMST);
}
export function DateToJulianDay(date: Date): number {
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
export function dateToSunData(d: Date): SunData {
    const JD = DateToJulianDay(d);
    const obliquity = julianDayToObliquity(JD);
    const ecliptic = julianDayToSunEcliptic(JD);
    const equatorial = eclipticToEquatorial(ecliptic, obliquity);
    const gmst = julianDayToGMSTDegrees(JD);
    return { equatorial, gmst } as SunData;
}
export function sunDataToSubSolarPoint(sunData: SunData): GeodeticCoords {
    const [asc, dec, ] = sunData.equatorial; // unpack equatorial coordinates
    const alphaDeg = Angles.radToDeg(asc); // right ascension in degrees
    const deltaDeg = Angles.radToDeg(dec); // declination in degrees
    const GHA = Angles.wrapDeg(sunData.gmst - alphaDeg); // Greenwich Hour Angle
    return [deltaDeg, Angles.wrapDeg180(-GHA), 0] as GeodeticCoords; // altitude is 0 for the surface point
}
export function sunDataToSunPositionVectorEcef(sunData: SunData): CartesianCoords3D {
    const [x, y, z] = equatorialToRectangular(sunData.equatorial);
    const gmstRad = Angles.degToRad(sunData.gmst);
    const cosT = Math.cos(-gmstRad);
    const sinT = Math.sin(-gmstRad);
    return GeoHelper.Normalize([cosT * x - sinT * y, sinT * x + cosT * y, z]) as CartesianCoords3D; // rectangular coordinates in ECEF
}