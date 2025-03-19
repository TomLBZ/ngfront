export const AU = 149597870.7e3; // meters
export const c = 299792458; // meters per second
export const SUNR = 695660e3; // meters
export function wrapDegrees(deg: number): number {
    return ((deg % 360) + 360) % 360;
}
export function eclipticToEquatorial(lambdaDeg: number, epsilonDeg: number) {
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
        alphaDeg: wrapDegrees(alphaDeg),
        deltaDeg // not wrapping declination, because it's -90 to 90
    }
}
export function julianDayToSunEcliptic(JD: number) {
    const n = JD - 2451545.0; // number of days since J2000.0
    const L = 280.460 + 0.9856474 * n; // mean longitude of the sun
    const g = 357.528 + 0.9856003 * n; // mean anomaly of the sun
    const gRad = g * Math.PI / 180;
    const lambda = L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad); // ecliptic longitude
    const R = 1.00014 - 0.01671 * Math.cos(gRad) - 0.00014 * Math.cos(2 * gRad); // distance from the sun in AU
    const epsilon = 23.439 - 0.0000004 * n; // obliquity of the ecliptic
    return {
        lambdaDeg: wrapDegrees(lambda),
        DS_AU: R,
        epsilonDeg: wrapDegrees(epsilon)
    };
}
export function julianDayToGMSTDegrees(JD: number) {
    const T = (JD - 2451545.0) / 36525.0; // number of Julian centuries since J2000.0
    const GMST = 280.46061837 
        + 360.98564736629 * (JD - 2451545.0) 
        + 0.000387933 * T * T 
        - T * T * T / 38710000;
    return wrapDegrees(GMST);
}