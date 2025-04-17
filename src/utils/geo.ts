export { Astro } from './src/geo/astro';
export { Earth } from './src/geo/earth';
export { GeoHelper } from './src/geo/helper';

export const AU = 149597870.7e3; // meters
export const SUNR = 695660e3; // meters
export const EER = 6378137.0; // meters, Earth equatorial radius
export const EPR = 6356752.3142; // meters, Earth polar radius

export enum LocalCoordsType {
    ENU = 'enu',
    NED = 'ned'
}

/**
 * Ecliptic coordinates
 * @param lng longitude in radians
 * @param lat latitude in radians
 * @param R distance in AU
 */
export type EclipticCoords = [lng: number, lat: number, R: number];

/**
 * Equatorial coordinates
 * @param asc ascension in radians
 * @param dec declination in radians
 * @param R distance in AU
 */
export type EquatorialCoords = [asc: number, dec: number, R: number];

/**
 * Rectangular coordinates
 * @param x x coordinate
 * @param y y coordinate
 * @param z z coordinate
 */
export type RectangularCoords = [x: number, y: number, z: number];

/**
 * Geodetic coordinates with height above the ellipsoid surface
 * @param lng longitude in degrees
 * @param lat latitude in degrees
 * @param alt altitude in meters
 */
export type GeodeticCoords = [lng: number, lat: number, alt: number];

/**
 * Attitude of the camera / plane
 * @param roll roll in radians
 * @param pitch pitch in radians
 * @param yaw yaw in radians
 */
export type Attitude = [roll: number, pitch: number, yaw: number];

export interface SunData {
    /** equatorial coordinates of the sun */
    equatorial: EquatorialCoords;
    /** GMST in degrees */
    gmst: number;
}
export interface GeoRadarData {
    /** position of the radar */
    pos: GeodeticCoords;
    /** ECEF position of the radar */
    ecefPos: RectangularCoords;
    /** ENU to ECEF matrix */
    enuToEcefMatrix: number[];
    /** ECEF to ENU matrix */
    ecefToEnuMatrix: number[];
}