export interface EclipticCoords {
    /** ecliptic longitude in radians */
    longitude: number;
    /** ecliptic latitude in radians */
    latitude: number;
    /** distance in AU */
    distance: number;
}
export interface EquatorialCoords {
    /** right ascension in radians */
    ascension: number;
    /** declination in radians */
    declination: number;
    /** distance in AU */
    distance: number;
}
export interface RectangularCoords {
    x: number;
    y: number;
    z: number;
}
export interface SunData {
    /** equatorial coordinates of the sun */
    equatorial: EquatorialCoords;
    /** GMST in degrees */
    gmst: number;
}
export interface EarthSurfacePoint {
    /** longitude in degrees */
    lng: number;
    /** latitude in degrees */
    lat: number;
    /** altitude in meters */
    alt: number;
}
export interface GeoRadarData {
    /** position of the radar */
    pos: EarthSurfacePoint;
    /** ECEF position of the radar */
    ecefPos: RectangularCoords;
    /** ENU to ECEF matrix */
    enuToEcefMatrix: number[];
    /** ECEF to ENU matrix */
    ecefToEnuMatrix: number[];
}