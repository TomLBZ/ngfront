import { Angles } from "../../math";
import { GeodeticCoords, GeoRadarData, CartesianCoords3D, EER, EPR } from "../../geo";

export class Earth {
    public static geodeticToECEF = geodeticToECEF;
    public static ecefToGeodetic = ecefToGeodetic;
    public static getECEFToENUMatrix = getECEFToENUMatrix;
    public static getENUToECEFMatrix = getENUToECEFMatrix;
    public static getGeoRadarData = getGeoRadarData;
    public static ecefToRadarEnu = ecefToRadarEnu;
    public static radarEnuToEcef = radarEnuToEcef;
    public static getRadius = getRadius;
}

export function geodeticToECEF(lng: number, lat: number, alt: number): CartesianCoords3D {
    const phi = Angles.degToRad(lat);
    const lambda = Angles.degToRad(lng);
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const a2 = EER * EER;
    const b2 = EPR * EPR;
    const e2 = (a2 - b2) / a2;
    const N = EER / Math.sqrt(1 - e2 * sinPhi * sinPhi);
    const x = (N + alt) * cosPhi * Math.cos(lambda);
    const y = (N + alt) * cosPhi * Math.sin(lambda);
    const z = ((1 - e2) * N + alt) * sinPhi;
    return [x, y, z] as CartesianCoords3D;
}
export function ecefToGeodetic(x: number, y: number, z: number): GeodeticCoords {
    const a2 = EER * EER; // a = EER
    const b2 = EPR * EPR; // b = EPR
    const e2 = (a2 - b2) / a2;
    const ep2 = (a2 - b2) / b2; // e'2
    const e4 = e2 * e2;
    const p2 = x * x + y * y;
    const p = Math.sqrt(p2);
    const z2 = z * z;
    const F = 54 * b2 * z2;
    const G = p2 + (1 - e2) * z2 - e2 * (a2 - b2);
    const G2 = G * G;
    const c = (e4 * F * p2) / (G * G2);
    const s = Math.pow(1 + c + Math.sqrt(c * c + 2 * c), 1 / 3);
    const k = s + 1 + 1 / s;
    const k2 = k * k;
    const P = F / (3 * k2 * G2);
    const Q2 = 1 + 2 * e4 * P;
    const Q = Math.sqrt(Q2);
    const r0 = -(P * e2 * p) / (1 + Q) + Math.sqrt(0.5 * a2 * (1 + 1 / Q) - (P * (1 - e2) * z2) / (Q + Q2) - 0.5 * P * p2);
    const _UV_param_root = p - e2 * r0;
    const _UV_param = _UV_param_root * _UV_param_root;
    const U = Math.sqrt(_UV_param + z2);
    const V = Math.sqrt(_UV_param + (1 - e2) * z2);
    const aV = EER * V;
    const z0 = (b2 * z) / aV;
    const phi = Math.atan((z + ep2 * z0) / p);
    const lambda = Math.atan2(y, x);
    const lng = Angles.radToDeg(lambda);
    const lat = Angles.radToDeg(phi);
    const alt = U * (1 - b2 / aV);
    return [lng, lat, alt] as GeodeticCoords;
}
export function getECEFToENUMatrix(lng: number, lat: number) {
    const phi = Angles.degToRad(lat);
    const lambda = Angles.degToRad(lng);
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const cosLambda = Math.cos(lambda);
    const sinLambda = Math.sin(lambda);
    return [
        -sinLambda, cosLambda, 0,
        -sinPhi * cosLambda, -sinPhi * sinLambda, cosPhi,
        cosPhi * cosLambda, cosPhi * sinLambda, sinPhi
    ];
}
export function getENUToECEFMatrix(lng: number, lat: number) {
    const phi = Angles.degToRad(lat);
    const lambda = Angles.degToRad(lng);
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const cosLambda = Math.cos(lambda);
    const sinLambda = Math.sin(lambda);
    return [
        -sinLambda, -sinPhi * cosLambda, cosPhi * cosLambda,
        cosLambda, -sinPhi * sinLambda, cosPhi * sinLambda,
        0, cosPhi, sinPhi
    ];
}
export function getGeoRadarData(lng: number, lat: number, alt: number): GeoRadarData {
    const ecefPos = geodeticToECEF(lng, lat, alt);
    const enuToEcefMatrix = getENUToECEFMatrix(lng, lat);
    const ecefToEnuMatrix = getECEFToENUMatrix(lng, lat);
    const pos = [lng, lat, alt] as GeodeticCoords;
    return { pos, ecefPos, enuToEcefMatrix, ecefToEnuMatrix } as GeoRadarData;
}
export function ecefToRadarEnu(ecef: CartesianCoords3D, radar: GeoRadarData): CartesianCoords3D {
    const [px, py, pz] = ecef;
    const [rx, ry, rz] = radar.ecefPos;
    const [x, y, z] = [px - rx, py - ry, pz - rz]; // vector pointing from radar to target point
    return [
        radar.ecefToEnuMatrix[0] * x + radar.ecefToEnuMatrix[1] * y + radar.ecefToEnuMatrix[2] * z,
        radar.ecefToEnuMatrix[3] * x + radar.ecefToEnuMatrix[4] * y + radar.ecefToEnuMatrix[5] * z,
        radar.ecefToEnuMatrix[6] * x + radar.ecefToEnuMatrix[7] * y + radar.ecefToEnuMatrix[8] * z
    ] as CartesianCoords3D;
}
export function radarEnuToEcef(enu: CartesianCoords3D, radar: GeoRadarData): CartesianCoords3D {
    const [x, y, z] = enu;
    const [rx, ry, rz] = radar.ecefPos;
    return [
        radar.enuToEcefMatrix[0] * x + radar.enuToEcefMatrix[1] * y + radar.enuToEcefMatrix[2] * z + rx,
        radar.enuToEcefMatrix[3] * x + radar.enuToEcefMatrix[4] * y + radar.enuToEcefMatrix[5] * z + ry,
        radar.enuToEcefMatrix[6] * x + radar.enuToEcefMatrix[7] * y + radar.enuToEcefMatrix[8] * z + rz
    ] as CartesianCoords3D;
}
export function getRadius(lat: number): number {
    const latRad = Angles.degToRad(lat); // convert to radians.
    const cosLat = Math.cos(latRad);
    const sinLat = Math.sin(latRad);
    const a = EER * EER * cosLat;
    const b = EPR * EPR * sinLat;
    const c = EER * cosLat;
    const d = EPR * sinLat;
    return Math.sqrt((a * a + b * b) / (c * c + d * d));
}