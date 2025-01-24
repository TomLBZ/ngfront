// library imports
import { Component, ViewChild } from "@angular/core";
// custom components
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { MapViewComponent, Marker } from "../../../components/mapview/mapview";
import { OutboxComponent } from "../../../components/outbox/outbox";
// other custom imports
import { env } from "../../app.config";
import { CircleMarker } from "./marker";

@Component({
    selector: "app-playground",
    standalone: true,
    imports: [
        ObjEditorComponent, 
        DropSelectComponent,
        MapViewComponent,
        OutboxComponent
    ],
    templateUrl: "./playground.html",
    styleUrls: ["./playground.less"]
})
export class PlaygroundComponent {
    // top pane
    markers: Array<Marker> = [
        new CircleMarker(1.36, 103.82, 0, 1),
        new CircleMarker(1.37, 103.83, 45, 2),
        new CircleMarker(1.36, 103.83, 90, 3),
        new CircleMarker(1.37, 103.82, 135, 4)
    ];
    apiKey = env.mapKey;
    zoom = 12;
    center = [103.822872, 1.364917];
    iconScale = 1.5;
    includeFilter = (key: string) => {
        const excludedFields = ["icon", "iconData"];
        return !excludedFields.includes(key);
    }

    onLayerModeChanged(obj: any) {
        console.log(obj);
    }
    @ViewChild(ObjEditorComponent) objEditor: ObjEditorComponent | undefined;
    onObjectClicked(obj: Marker) {
        console.log(obj);
        const idx = this.markers.findIndex((marker) => marker === obj);
        if (idx >= 0) {
            this.selIndexR = idx;
        }
        if (this.objEditor) {
            this.objEditor.objToEdit = obj;
        }
    }

    // bottom pane
    dropRepr: Function = (obj: any) => obj.name;
    // left pane
    titleL = "Multiselect Markers";
    selIndicesL: Array<number> = [];
    // right pane
    titleR = "Select a Single Marker to Edit";
    textModeR: boolean = false;
    private selIndexR: number = -1;
    get selObjR() {
        return this.selIndexR >= 0 ? this.markers[this.selIndexR] : null;
    }
    get objNameR() {
        const obj = this.selIndexR >= 0 ? this.markers[this.selIndexR] : null;
        if (!obj) return "Null";
        const name = (obj as CircleMarker).name;
        return name ? name : "Object";
    }

    @ViewChild(MapViewComponent) mapView: MapViewComponent | undefined;
    onUpdate(obj: any) {
        if (this.mapView) {
            this.mapView.refresh(obj as Marker);
        }
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