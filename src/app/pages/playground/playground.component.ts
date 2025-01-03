// library imports
import { Component } from "@angular/core";
// custom components
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { MapViewComponent } from "../../../components/mapview/mapview";
import { env } from "../../app.config";

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
    markerCoords: Array<Array<number>> = [
        [103.8, 1.36],
        [103.8, 1.37],
        [103.9, 1.36],
        [103.9, 1.37]
    ];
    imgSize: number = 16;
    apiKey = env.mapKey;
    zoom = 12;
    center = [103.822872, 1.364917];
    layerModeT: string = 'streets';
    layerModes: Array<string> = ['streets', 'satellite'];
    imageData: Uint8Array = this.generateImageData();

    generateImageData(): Uint8Array {
        const w = this.imgSize, h = this.imgSize, bpp = 4;
        const data = new Uint8Array(w * h * bpp);
        for (let i = 0; i < w * h; i++) {
            const x = i % w, y = Math.floor(i / w);
            const r = x / w * 255, g = y / h * 255, b = 0, a = 255;
            const j = i * bpp;
            data[j] = r;
            data[j + 1] = g;
            data[j + 2] = b;
            data[j + 3] = a;
        }
        return data;
    }

    onLayerModeChanged(obj: any) {
        console.log(obj);
    }

    // bottom pane
    // objects
    objList: Array<any> = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 35 },
        { name: 'Charlie', age: 40 },
        { name: 'David', age: 45 }
    ];
    dropRepr: Function = (obj: any) => obj.name;
    // left pane
    selIndicesL: Array<number> = [];
    // right pane
    textModeR: boolean = false;
    private selIndexR: number = -1;
    get selObjR() {
        return this.selIndexR >= 0 ? this.objList[this.selIndexR] : null;
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