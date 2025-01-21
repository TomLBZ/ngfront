import { Marker } from "../../../components/mapview/mapview";
import { Bitmap, Color, SDF, Vec2 } from "../../../utils/bmp/bmp";

export class SimpleMarker implements Marker {
    private static _iconData: Uint8Array;
    private static instanceCount: number = 0;
    public iconData: Uint8Array;
    public id: number;
    public hdg: number = 0;
    public alt: number = 0;
    public iconSize: number = 16;
    public get name() {
        return `Marker${this.id}`;
    }
    constructor(
        public lat: number, 
        public lon: number, 
        id?: number
    ) {
        if (SimpleMarker.instanceCount == 0) {
            SimpleMarker._iconData = SimpleMarker.getIconData(this.iconSize);
        }
        this.id = id === undefined ? SimpleMarker.instanceCount++ : id;
        this.iconData = SimpleMarker._iconData;
    }
    get popupText() {
        return `${this.name}:\nLng: ${this.lon.toFixed(4)}, Lat: ${this.lat.toFixed(4)}\nAlt: ${this.alt.toFixed(2)}m, Hdg: ${this.hdg.toFixed(2)}deg`;
    }
    get trackTarget() {
        const primes = [2, 3, 5, 7];
        const features = [this.id, this.lat, this.lon, this.hdg];
        return features.reduce((acc, val, idx) => acc + primes[idx] * val, 0);
    }
    static getIconData(iconSize: number) { // generated only once
        const greenColor = new Color(0, 255, 0, 255);
        const blueColor = new Color(0, 0, 255, 255);
        const epsilon = 0.01;
        const r = (1 - epsilon) * 0.9;
        const bmp = new Bitmap(iconSize, iconSize);
        const sdf = (p: Vec2) => {
            return SDF.circle(p, r);
        }
        bmp.drawSDF(sdf, greenColor, blueColor);
        return bmp._data;
    }
}