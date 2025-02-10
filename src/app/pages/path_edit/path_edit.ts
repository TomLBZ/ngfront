import { Component, HostListener, ViewChild } from "@angular/core";
import { MapViewComponent, MapViewEvent, Marker, MarkerEvent } from "../../../components/mapview/mapview";
import { env } from "../../app.config";
import { SimpleMarker } from "./marker";
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";
import { Mission } from "./mission";
import { FieldEditorComponent } from "../../../components/obj_editor/field_editor/field_editor";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";

@Component({
    selector: "page-controls",
    standalone: true,
    imports: [MapViewComponent, ObjEditorComponent, FieldEditorComponent, DropSelectComponent],
    templateUrl: "./path_edit.html",
    styleUrls: ["./path_edit.less"]
})
export class PathEditPage {
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
    labelFunc = (obj: Marker) => this.markers.indexOf(obj).toString();
    connectableFilter = (obj: Marker) => obj instanceof SimpleMarker;
    moveableFilter = (obj: Marker) => obj instanceof SimpleMarker;
    missionParams = new Mission(0, "Mission 1");
    configs = [
        {id: 1, type: "quadrotor", name: "Q1"}, 
        {id: 2, type: "fixedwing", name: "F1"},
        {id: 3, type: "quadrotor", name: "Q2"},
        {id: 4, type: "fixedwing", name: "F2"},
    ];
    cfgRepr = (obj: any) => `${obj.id}: ${obj.name} (${obj.type})`;
    onLeaderSelect(index: number) {
        this.missionParams.leader = this.configs[index].id;
    }
    onFollowerSelect(indices: Array<number>) {
        this.missionParams.followers = indices.map((index) => this.configs[index].id);
    }
    get followerPlanes() {
        return this.configs
            .filter((config) => config.id !== this.missionParams.leader);
    }

    @ViewChild(MapViewComponent) mapView!: MapViewComponent;
    @ViewChild(ObjEditorComponent) objEditor!: ObjEditorComponent;
    onUpdate(obj: any) {
        this.markers = obj as Array<Marker>;
    }
    onMissionUpdate(obj: any) {
        console.log(obj);
    }
    raising = { idx: -1, startLng: -1, startLat: -1, startAlt: -1 };
    onObjectMouseDown(me: MarkerEvent) {
        if (me.secondaryButton) { // right button down
            if (!this.isAltPressed) { // without alt: init change altitude field
                this.raising.idx = me.idx;
                this.raising.startLng = this.markers[me.idx].lon;
                this.raising.startLat = this.markers[me.idx].lat;
                this.raising.startAlt = (this.markers[me.idx] as SimpleMarker).alt;
            } else if (this.raising.idx < 0) { // with alt and not changing altitude: delete marker
                this.markers.splice(me.idx, 1);
                this.objEditor.objToEdit = this.markers; // refresh editor
            }
        }
    }
    onObjectMoved(me: MarkerEvent) {
        if (!this.isAltPressed && this.raising.idx < 0 && me.primaryButton) { // left button down
            const m = new SimpleMarker(me.lat, me.lng, this.markers[me.idx].id, (this.markers[me.idx] as SimpleMarker).alt);
            this.mapView.refresh(m);
            this.objEditor.objToEdit = this.markers; // refresh editor
        }
    }
    onObjectMouseUp(obj: any) {
        this.missionParams.leader = obj.id;
    }
    onMapMouseDown(mve: MapViewEvent) {
        if (this.isAltPressed && mve.primaryButton) { // press alt + left click, add marker
            const newMarker = new SimpleMarker(mve.lat, mve.lng);
            this.mapView.refresh(newMarker);
            this.mapView.selectedMarkerId = newMarker.id;
            this.objEditor.objToEdit = this.markers;
        }
    }
    onMapMouseUp(mve: MapViewEvent) {
        if (!this.isAltPressed && mve.secondaryButton && this.raising.idx >= 0) { // right button up
            this.raising.idx = -1;
            this.raising.startLng = -1;
            this.raising.startLat = -1;
            this.raising.startAlt = -1;
        }
    }
    onMapMouseMove(mve: MapViewEvent) {
        if (this.raising.idx >= 0 && mve.secondaryButton) { // right button down
            const mkr = this.markers[this.raising.idx] as SimpleMarker;
            const diffLng = mve.lng - this.raising.startLng;
            const diffLat = mve.lat - this.raising.startLat;
            const scale = 100; // 1 unit = 100 m
            const unitLen = Math.pow(10, diffLng * scale); // always positive
            const diffAlt = diffLat * scale * unitLen;
            const minStep = 0.01;
            const change = diffAlt > 0 ? Math.max(diffAlt, minStep) : 
            diffAlt < 0 ? Math.min(diffAlt, -minStep) : 0;
            const newAlt = this.raising.startAlt + change;
            const m = new SimpleMarker(this.raising.startLat, this.raising.startLng, mkr.id, newAlt);
            this.mapView.refresh(m);
            this.objEditor.objToEdit = this.markers; // refresh editor
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