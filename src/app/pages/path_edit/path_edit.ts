import { Component, HostListener, ViewChild } from "@angular/core";
import { MapViewComponent, Marker } from "../../../components/mapview/mapview";
import { env } from "../../app.config";
import { SimpleMarker } from "./marker";
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";

@Component({
    selector: "page-controls",
    standalone: true,
    imports: [MapViewComponent, ObjEditorComponent],
    templateUrl: "./path_edit.html",
    styleUrls: ["./path_edit.less"]
})
export class PathEditPage {
    value: number = 0.0;
    markers: Array<Marker> = [];
    apiKey = env.mapKey;
    zoom = 12;
    center = [103.822872, 1.364917];
    iconScale = 1.5;
    includeFilter = (key: string) => {
        if (key.startsWith("_")) return false;
        if (key.startsWith("icon")) return false;
        const excludedFields = ["id", "hdg"];
        if (excludedFields.includes(key)) return false;
        return true;
    }
    @ViewChild(MapViewComponent) mapView!: MapViewComponent;
    @ViewChild(ObjEditorComponent) objEditor!: ObjEditorComponent;
    onUpdate(obj: any) {
        console.log(obj);
    }
    onLayerModeChanged(obj: any) {
        console.log(obj);
    }
    onObjectMouseUp(obj: any) {
        const features = obj.features;
        if (!features || features.length === 0) return;
        const feature = features[0];
        const id = feature.properties['id'];
        const markerIndex = this.markers.findIndex((marker) => marker.id === id);
        if (markerIndex < 0) return;
        if (this.isAltPressed && obj.originalEvent.button === 2) {
            this.markers.splice(markerIndex, 1);
            this.objEditor.objToEdit = this.markers;
        }
    }
    onObjectMoved(obj: any) {
        if (!this.isAltPressed) {
            const m = new SimpleMarker(obj.lat, obj.lng, obj.id);
            this.mapView.refresh(m);
            this.objEditor.objToEdit = this.markers;
        }
    }
    onMapClicked(obj: any) {
        const lnglat = obj.lngLat;
        if (!lnglat) return;
        if (this.isAltPressed) {
            const isLeftClick = obj.originalEvent.button === 0;
            if (isLeftClick) { // add new marker
                const newMarker = new SimpleMarker(lnglat.lat, lnglat.lng);
                this.mapView.refresh(newMarker);
                this.mapView.selectedMarkerId = newMarker.id;
                this.objEditor.objToEdit = this.markers;
            }
        }
    }
    isAltPressed = false;
    @HostListener("window:keydown", ["$event"])
    onKeydown(event: KeyboardEvent) {
        if (event.key === "Alt") {
            this.isAltPressed = true;
        }
    }
    @HostListener("window:keyup", ["$event"])
    onKeyup(event: KeyboardEvent) {
        if (event.key === "Alt") {
            this.isAltPressed = false;
        }
    }
}