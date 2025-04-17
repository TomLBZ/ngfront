import { geodeticToECEF } from "./earth";
import { Attitude, GeodeticCoords, RectangularCoords, GeoHelper, LocalCoordsType } from "../../geo";
import { Mat3, Vec3 } from "../../math";

export class GeoCam { // a camera on Earth
    public posEcef: RectangularCoords = [0, 0, 0];
    private _axes!: Mat3;
    private _axesInv!: Mat3;
    constructor(public posGeodetic: GeodeticCoords, public attitude: Attitude, public coordsType: LocalCoordsType = LocalCoordsType.ENU) {
        this.posEcef = geodeticToECEF(...posGeodetic);
        const rot = Mat3.fromEuler(...attitude);
        this._axes = rot.Mul(this.getAxesMatrixFromEcef(coordsType));
        this._axesInv = rot.Inverse();
    }
    private getAxesMatrixFromEcef(coordsType: LocalCoordsType): Mat3 { // from ecef (x, y, z) to ENU (east, north, up) or NED (north, east, down)
        const upVec = Vec3.New(...this.posEcef).Norm(); // up vector in ECEF
        const northVec = upVec.Cross(Vec3.New(0, 0, 1)).Cross(upVec).Norm(); // north vector in ECEF
        const eastVec = northVec.Cross(upVec).Norm(); // east vector in ECEF
        return coordsType === LocalCoordsType.ENU ? 
            Mat3.New([eastVec.x, northVec.x, upVec.x, eastVec.y, northVec.y, upVec.y, eastVec.z, northVec.z, upVec.z]) :
            Mat3.New([northVec.x, eastVec.x, -upVec.x, northVec.y, eastVec.y, -upVec.y, northVec.z, eastVec.z, -upVec.z]);
    }
    public ecefToCamFrame(ecef: RectangularCoords): RectangularCoords {
        const localPos: Vec3 = Vec3.New(...GeoHelper.Minus(ecef, this.posEcef)); // local position
        return this._axes.VMul(localPos).ToRectangularCoords(); // local position in camera frame
    }
    public camFrameToEcef(camFrame: RectangularCoords): RectangularCoords {
        const local: Vec3 = this._axesInv.VMul(Vec3.New(...camFrame)); // local position in camera frame
        return GeoHelper.Plus(local.ToRectangularCoords(), this.posEcef); // local position in ECEF
    }
}