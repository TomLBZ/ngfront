import { Marker } from "../../../components/mapview/mapview";
import { Bitmap, Color, SDF, Vec2 } from "../../../utils/bmp/bmp";

export class CircleMarker implements Marker {
    private static _iconData: Uint8Array;
    private static instanceCount: number = 0;
    public icon: string;
    public iconData: Uint8Array;
    constructor(
        public lat: number, 
        public lng: number, 
        public heading: number,
        public id: number,
        public iconSize: number = 16,
    ) {
        this.icon = `${this.id}`;
        if (CircleMarker.instanceCount == 0) {
            CircleMarker._iconData = CircleMarker.getIconData(this.iconSize);
        }
        CircleMarker.instanceCount++;
        this.iconData = CircleMarker._iconData;
    }

    get name() {
        return `CircleMarker ${this.icon}`;
    }

    get description() {
        return `CircleMarker ${this.icon} at (Lng: ${this.lng}, Lat: ${this.lat})\nHeading: ${this.heading} degrees.`;
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