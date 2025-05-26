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
    private _posEcef : CartesianCoords3D = [0, 0, 0]; // ECEF coordinates of the camera
    public get posEcef() : CartesianCoords3D { return this._posEcef; }
    private _qEcefToCf: Quaternion = Quaternion.I; // quaternion representing the rotation from ECEF frame to camera frame
    private _qCfToEcef: Quaternion = Quaternion.I; // quaternion representing the rotation from camera frame to ECEF frame
    constructor(posGeodetic: GeodeticCoords, attitude: Attitude, coordsType: CoordsFrameType = CoordsFrameType.ENU) {
        this._posGeodetic = posGeodetic;
        this._attitude = attitude;
        this._coordsType = coordsType;
        this.update();
    }
    private update() {
        this._posEcef = geodeticToECEF(...this._posGeodetic); // update ECEF coordinates
        const qEcefToPf = GeoCam.buildLocalFrameQuat(Vec3.New(...this._posEcef), this._coordsType); // quaternion representing the rotation from ECEF frame to local tangent frame
        const qPfToCam = GeoCam.buildAttitudeQuat(this._attitude, this._coordsType); // quaternion representing the rotation from local tangent frame to camera frame
        this._qEcefToCf = qPfToCam.Mul(qEcefToPf).Norm();       // (Cam←PF)·(PF←ECEF)
        this._qCfToEcef = this._qEcefToCf.Inv();                // cached inverse
    }
    public ecefToCamFrame(pEcef: CartesianCoords3D): CartesianCoords3D {
        const local: Vec3 = Vec3.New(...GeoHelper.Minus(pEcef, this.posEcef)); // local position in fixed frame
        return this._qEcefToCf.RotateV(local).ToRectangularCoords(); // local position in camera frame
    }
    public camFrameToEcef(pCf: CartesianCoords3D): CartesianCoords3D {
        const local: Vec3 = this._qCfToEcef.RotateV(Vec3.New(...pCf)); // local position in fixed frame
        return GeoHelper.Plus(local.ToRectangularCoords(), this.posEcef); // local position in ECEF
    }
    private static buildLocalFrameQuat(posEcef: Vec3, type: CoordsFrameType): Quaternion {
        if (type === CoordsFrameType.ECEF) return Quaternion.I;
        const up    = posEcef.Norm();           // local up vector in ecef frame: radially outward
        const n     = Vec3.New(0, 0, 1);        // global north vector in ecef frame
        const east  = n.Cross(up).Norm();       // local east vector in ecef frame
        const north = up.Cross(east).Norm();    // local north vector in ecef frame
        let x: Vec3, y: Vec3, z: Vec3;
        if (type === CoordsFrameType.ENU) {
            x = east;  y = north;  z = up;           // ENU
        } else {
            x = north; y = east;   z = up.Neg();     // NED
        }
        /* ---- convert basis → quaternion (one Mat3, then discard) */
        const tmp = Mat3.FromRows([x, y, z]); // PF axes in ECEF in row order as Quaternion.FromMat3 expects a row matrix
        return Quaternion.FromMat3(tmp).Norm();     // ECEF→PF
    }
    private static buildAttitudeQuat(attitude: Attitude, type: CoordsFrameType): Quaternion {
        const [roll, pitch, yaw] = attitude; // attitude angles in radians
        const xPF = Vec3.New(1, 0, 0); // PF X axis
        const yPF = Vec3.New(0, 1, 0); // PF Y axis
        const zPF = type === CoordsFrameType.ENU ? Vec3.New(0, 0, 1) : Vec3.New(0, 0, -1); // PF Z axis UP
        /* ---- intrinsic yaw (ψ) about current Z ---------------- */
        let q: Quaternion = (yaw !== 0) ? Quaternion.FromAxisAngle(zPF, yaw) : Quaternion.I;
        /* ---- pitch (θ) about *new* Y -------------------------- */
        if (pitch !== 0) {
            const yAfterYaw = q.RotateV(yPF);                       // axis after ψ
            const qPitch    = Quaternion.FromAxisAngle(yAfterYaw, pitch);
            q = qPitch.Mul(q);                                      // θ after ψ
        }
        /* ---- roll (φ) about *new* X --------------------------- */
        if (roll !== 0) {
            const xAfter = q.RotateV(xPF);                          // axis after ψ,θ
            const qRoll  = Quaternion.FromAxisAngle(xAfter, roll);
            q = qRoll.Mul(q);                                       // φ after θ,ψ
        }
        return q.Norm();   // PF→Cam
    }
}