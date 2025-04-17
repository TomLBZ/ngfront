import { ecefToRadarEnu, getGeoRadarData, radarEnuToEcef } from "./earth";
import { Attitude, GeodeticCoords, GeoRadarData, RectangularCoords, GeoHelper } from "../../geo";
import { Mat3, Vec3 } from "../../math";

export class GeoCam { // a camera on Earth
    public radarData: GeoRadarData;
    private enuToCamMat!: Mat3;
    private camToEnuMat!: Mat3;
    public get earthPosInCamFrame(): RectangularCoords {
        return this.ecefToCamFrame([0, 0, 0]);
    }
    public get ecefUp(): RectangularCoords {
        return GeoHelper.Minus(this.camFrameToEcef([0, 0, 1]), this.radarData.ecefPos);
    }
    public get ecefRight(): RectangularCoords {
        return GeoHelper.Minus(this.camFrameToEcef([1, 0, 0]), this.radarData.ecefPos);
    }
    public get ecefFront(): RectangularCoords {
        return GeoHelper.Minus(this.camFrameToEcef([0, 1, 0]), this.radarData.ecefPos);
    }
    public get ecefPos(): RectangularCoords {
        return this.radarData.ecefPos;
    }
    constructor(public posGeodetic: GeodeticCoords, public attitude: Attitude) {
        this.radarData = getGeoRadarData(...posGeodetic);
        this.updateAttitude(attitude);
    }
    public updateAttitude(attitude: Attitude = this.attitude) {
        this.enuToCamMat = GeoCam.getEnuToCameraMatrix(attitude);
        this.camToEnuMat = this.enuToCamMat.Inverse();
    }
    public ecefToCamFrame(ecef: RectangularCoords): RectangularCoords {
        const enu: Vec3 = Vec3.New(...ecefToRadarEnu(ecef, this.radarData));
        return this.enuToCamMat.VMul(enu).ToRectangularCoords();
    }
    public camFrameToEcef(camFrame: RectangularCoords): RectangularCoords {
        const enu: Vec3 = this.camToEnuMat.VMul(Vec3.New(...camFrame));
        return radarEnuToEcef([enu.x, enu.y, enu.z], this.radarData);
    }
    /**
     * This function converts the attitude of the camera to a rotation matrix.
     * The rotation matrix is used to transform a point in ENU coordinates to the camera frame.
     * The ENU frame is defined as follows:
     * - The x-axis points to the east
     * - The y-axis points to the north
     * - The z-axis points to the up
     * The camera frame is defined as follows:
     * - The x-axis points to the right of the camera
     * - The y-axis points to the front of the camera
     * - The z-axis points to the top of the camera
     * @param attitude attitude of the camera in radians
     * @returns rotation matrix
     */
    public static getEnuToCameraMatrix(attitude: Attitude): Mat3 {
        const [roll, pitch, yaw] = attitude;
        const cosRoll = Math.cos(roll);
        const sinRoll = Math.sin(roll);
        const cosPitch = Math.cos(pitch);
        const sinPitch = Math.sin(pitch);
        const cosYaw = Math.cos(yaw);
        const sinYaw = Math.sin(yaw);
        return Mat3.New([
            -sinYaw, cosYaw * sinPitch, cosYaw * cosPitch,
            -cosYaw * sinRoll - sinYaw * cosRoll * sinPitch, -sinYaw * sinRoll + cosYaw * cosRoll * sinPitch, cosPitch * sinRoll,
            cosYaw * cosRoll * sinPitch - sinYaw * sinRoll, -sinYaw * cosRoll * sinPitch - cosYaw * sinRoll, cosPitch * cosRoll
        ]);
    }
}