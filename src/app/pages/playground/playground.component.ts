// library imports
import { Component } from "@angular/core";
// custom components
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { MapViewComponent, GeoObject } from "../../../components/mapview/mapview";
import { env } from "../../app.config";

class PlaneObject implements GeoObject {
    private readonly _iconData: Uint8Array;
    public icon: string;
    constructor(
        public lat: number, 
        public lng: number, 
        public alt: number,
        public heading: number,
        public name: string,
        public id: number,
        public iconSize: number = 16,
    ) {
        this._iconData = this.getIconData();
        this.icon = `${this.id}`;
    }
    get iconData() { return this._iconData; }
    get description() { 
        return `Plane ${this.name} at (Lng: ${this.lng}, Lat: ${this.lat})\nAltitude: ${this.alt}m; Heading: ${this.heading} degrees.`;
    }

    getIconData() { 
        const bpp = 4;
        const w = this.iconSize, h = this.iconSize;
        const data = new Uint8Array(w * h * bpp);
        // draw a plane icon rotated by degrees
        for (let i = 0; i < w * h; i++) {
            const x = i % w, y = Math.floor(i / w);
            const dx = x - w / 2, dy = y - h / 2;
            const r = Math.sqrt(dx * dx + dy * dy);
            const a = Math.atan2(dy, dx) + this.heading / 180 * Math.PI;
            const j = i * bpp;
            data[j] = 255;
            data[j + 1] = 255;
            data[j + 2] = 255;
            data[j + 3] = r < w / 2 ? 255 : 0;
        }
        return data;
    }
}

@Component({
    selector: "app-playground",
    standalone: true,
    imports: [
        ObjEditorComponent, 
        DropSelectComponent,
        MapViewComponent
    ],
    templateUrl: "./playground.component.html",
    styleUrls: ["./playground.component.less"]
})
export class PlaygroundComponent {
    // top pane
    planeObjects: Array<PlaneObject> = [
        new PlaneObject(1.36, 103.82, 1000, 0, 'A', 1),
        new PlaneObject(1.36, 103.83, 2000, 45, 'B', 2),
        new PlaneObject(1.37, 103.82, 3000, 90, 'C', 3),
        new PlaneObject(1.37, 103.83, 4000, 135, 'D', 4),
    ];
    apiKey = env.mapKey;
    zoom = 12;
    center = [103.822872, 1.364917];
    includeFilter = (key: string) => {
        if (key.startsWith("_")) return false;
        const excludedFields = ["description", "icon", "iconData"];
        return !excludedFields.includes(key);
    }

    onLayerModeChanged(obj: any) {
        console.log(obj);
    }

    onObjectClicked(obj: GeoObject) {
        console.log(obj);
    }

    // bottom pane
    dropRepr: Function = (obj: any) => `Plane ${obj.name}`;
    // left pane
    selIndicesL: Array<number> = [];
    // right pane
    textModeR: boolean = false;
    private selIndexR: number = -1;
    get selObjR() {
        return this.selIndexR >= 0 ? this.planeObjects[this.selIndexR] : null;
    }

    onUpdate(obj: any) {
        console.log(obj);
    }

    onSelectR(obj: any) {
        if (typeof obj === 'number') {
            this.selIndexR = obj;
        }
    }

    onSelectL(obj: any) {
        if (Array.isArray(obj)) {
            this.selIndicesL = obj;
        }
    }
}