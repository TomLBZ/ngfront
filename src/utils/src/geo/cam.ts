import { geodeticToECEF } from "./earth";
import { Attitude, GeodeticCoords, CartesianCoords3D, GeoHelper, CoordsFrameType } from "../../geo";
import { Mat3, Quaternion, Vec3 } from "../../math";

export class GeoCam { // a camera on Earth
    private _posGeodetic : GeodeticCoords = [0, 0, 0]; // geodetic coordinates of the camera
    public get posGeodetic() : GeodeticCoords { return this._posGeodetic; }
    public set posGeodetic(v : GeodeticCoords) {
        const [lng, lat, alt] = this._posGeodetic;
        if (v[0] !== lng || v[1] !== lat || v[2] !== alt) {
            this._posGeodetic = v;
            this.update();
        }
    }
    private _attitude : Attitude = [0, 0, 0]; // attitude of the camera
    public get attitude() : Attitude {
        return this._attitude;
    }
    public set attitude(v : Attitude) {
        const [roll, pitch, yaw] = this._attitude;
        if (v[0] !== roll || v[1] !== pitch || v[2] !== yaw) {
            this._attitude = v;
            this.update();
        }
    }
    private _coordsType : CoordsFrameType = CoordsFrameType.ENU; // type of coordinates
    public get coordsType() : CoordsFrameType {
        return this._coordsType;
    }
    public set coordsType(v : CoordsFrameType) {
        if (v !== this._coordsType) {
            this._coordsType = v;
            this.update();
        }
    }
    private _pfAxesMat: Mat3 = Mat3.I; // matrix representing the local tangent frame axes in ECEF coordinates
    public get pfAxesMat() : Mat3 { // public read-only getter for the local tangent frame axes matrix
        return this._pfAxesMat;
    }
    private _posEcef : CartesianCoords3D = [0, 0, 0]; // ECEF coordinates of the camera
    public get posEcef() : CartesianCoords3D { return this._posEcef; }
    private _qEcefToCam: Quaternion = Quaternion.I; // quaternion representing the rotation from ECEF frame to camera frame
    private _qCamToEcef: Quaternion = Quaternion.I; // quaternion representing the rotation from camera frame to ECEF frame
    private static getPfMat(posEcef: CartesianCoords3D, coordsType: CoordsFrameType = CoordsFrameType.ENU): Mat3 {
        const n       = Vec3.New(0, 0, 1);            // global north vector in ecef frame
        const refUp   = Vec3.FromArray(posEcef).Norm(); // local up vector in ecef frame: radially outward
        const refEast = n.Cross(refUp).Norm(); // local east vector in ecef frame
        const refNorth = refUp.Cross(refEast).Norm(); // local north vector in ecef frame
        if (coordsType === CoordsFrameType.ENU) {
            return Mat3.FromRows([refEast, refNorth, refUp]); // ENU
        } else if (coordsType === CoordsFrameType.NED) {
            return Mat3.FromRows([refNorth, refEast, refUp.Neg()]); // NED
        }
        return Mat3.I; // ECEF
    }
    private static getCamQuat(axes: Mat3, attitude: Attitude): Quaternion {
        const qEcefToPf = Quaternion.FromMat3(axes).Norm(); // quaternion representing the rotation from ECEF frame to local tangent frame
        const qPfToCam = Quaternion.FromEuler(...attitude); // quaternion representing the rotation from local tangent frame to camera frame
        return qPfToCam.Mul(qEcefToPf).Norm(); // (Cam←PF)·(PF←ECEF)
    }
    constructor(posGeodetic: GeodeticCoords, attitude: Attitude, coordsType: CoordsFrameType = CoordsFrameType.ENU) {
        this._posGeodetic = posGeodetic;
        this._attitude = attitude;
        this._coordsType = coordsType;
        this.update();
    }
    private update(): void {
        this._posEcef = geodeticToECEF(...this._posGeodetic); // convert geodetic to ECEF coordinates
        this._pfAxesMat = GeoCam.getPfMat(this._posEcef, this._coordsType); // get local tangent frame axes in ECEF coordinates
        this._qEcefToCam = GeoCam.getCamQuat(this._pfAxesMat, this._attitude); // quaternion from ECEF to camera frame
        this._qCamToEcef = this._qEcefToCam.Inv();                // cached inverse
    }
    public ecefToCamFrame(pEcef: CartesianCoords3D, isPos: boolean = true): CartesianCoords3D {
        const local: Vec3 = isPos ? Vec3.New(...GeoHelper.Minus(pEcef, this.posEcef)) : Vec3.New(...pEcef); // local position in fixed frame
        return this._qEcefToCam.RotateV(local).ToRectangularCoords(); // local position in camera frame
    }
    public camFrameToEcef(pCf: CartesianCoords3D, isPos: boolean = true): CartesianCoords3D {
        const local: Vec3 = this._qCamToEcef.RotateV(Vec3.New(...pCf)); // local position in fixed frame
        return isPos ? GeoHelper.Plus(local.ToRectangularCoords(), this.posEcef) : local.ToRectangularCoords(); // local position in ECEF
    }
}