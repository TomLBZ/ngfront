import { geodeticToECEF } from "./earth";
import { Attitude, GeodeticCoords, RectangularCoords } from "./types";

export class GeoCam { // a camera on Earth
    public posEcef: RectangularCoords;
    constructor(public posGeodetic: GeodeticCoords, public attitude: Attitude) {
        this.posEcef = geodeticToECEF(...posGeodetic);
    }
}