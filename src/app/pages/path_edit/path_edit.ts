import { Component, ViewChild } from "@angular/core";
import { MapViewComponent, Marker } from "../../../components/mapview/mapview";
import { env } from "../../app.config";
import { SimpleMarker } from "./marker";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";

@Component({
    selector: "page-controls",
    standalone: true,
    imports: [MapViewComponent, DropSelectComponent],
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
    modeList = ["none", "add", "edit", "delete"];
    private mode = "none";
    onModeChanged(i: number) {
        this.mode = this.modeList[i];
    }
    @ViewChild(MapViewComponent) mapView!: MapViewComponent;
    onLayerModeChanged(obj: any) {
        console.log(obj);
    }
    onObjectClicked(obj: Marker) {
        if (this.mode === "edit") {
            this.mapView.refresh(obj);
        }
        else if (this.mode === "delete") {
            const markerIndex = this.markers.findIndex((marker) => marker === obj);
            this.markers.splice(markerIndex, 1);
        }
    }
    onMapClicked(obj: any) {
        const lnglat = obj.lngLat;
        if (!lnglat) return;
        if (this.mode === "add") {
            const newMarker = new SimpleMarker(lnglat.lat, lnglat.lng);
            this.mapView.refresh(newMarker);
        }
    }
}