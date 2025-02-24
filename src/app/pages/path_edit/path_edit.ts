import { Component, HostListener, ViewChild, OnInit } from "@angular/core";
import { MapViewComponent } from "../../../components/mapview/mapview";
import { MarkerEvent, MapViewEvent } from "../../../components/mapview/event";
import { Marker } from "../../../utils/marker/marker";
import { MarkerGroup } from "../../../utils/marker/markergrp";
import { env } from "../../app.config";
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";
import { Mission } from "./mission";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { Icon } from "../../../utils/icon/icon";
import { Color } from "../../../utils/color/color";

@Component({
    selector: "page-path-edit",
    standalone: true,
    imports: [MapViewComponent, ObjEditorComponent, DropSelectComponent],
    templateUrl: "./path_edit.html"
})
export class PathEditPage implements OnInit {
    private readonly iconSize: number = 16;
    private readonly iconScale: number = 1.2;
    private readonly wpColor: Color = Color.Purple.lighten(0.5);
    private readonly plColor: Color = Color.blend(Color.Blue, Color.Cyan, 0.5);
    private readonly flColor: Color = Color.Green;
    private readonly ldColor: Color = Color.Red;
    markerGroups: Array<MarkerGroup> = [
        new MarkerGroup(Icon.Circle(this.iconSize, this.wpColor), true), // wps
        new MarkerGroup(Icon.Poly(this.iconSize, Icon.polyPlaneVecs, this.plColor), true), // planes
    ];
    apiKey = env.mapKey;
    private mGrpFieldsFilter(key: string, mgIdx: number): boolean {
        const generalExcluded = ["icon", "id", "iconScale", "selectable", "selectedBorder", "showLabel", "popupFields"];
        if (generalExcluded.includes(key)) return false;
        const privateExcludedStr = "_";
        if (key.includes(privateExcludedStr)) return false;
        if (mgIdx === 0) return key !== "hdg";
        if (mgIdx === 1) return key !== "alt";
        return true;
    }
    wpFieldsFilter = (key: string) => { return this.mGrpFieldsFilter(key, 0); }
    plFieldsFilter = (key: string) => { return this.mGrpFieldsFilter(key, 1); }
    mFieldsFilter = (key: string) => { return ["id", "name", "description", "saved_at"].includes(key); }
    currentMission = new Mission(0, "Mission 1");
    planeRepr = (m: Marker) => `${this.markerGroups[1].labelPrefix}${this.markerGroups[1].markers.indexOf(m) + 1}`;
    public get leader(): string {
        const lId = this.currentMission.lead_id;
        const idx = this.markerGroups[1].markers.findIndex((m) => m.id === lId);
        if (idx < 0) return "Select on Map";
        return this.planeRepr(this.markerGroups[1].markers[idx]);
    }
    public get nonleaders(): Array<Marker> {
        return this.markerGroups[1].markers.filter((m) => m.id !== this.currentMission.lead_id);
    }
    ngOnInit(): void {
        for (const mg of this.markerGroups) {
            mg.iconScale = this.iconScale;
        }
        this.markerGroups[0].popupFields = ["lat", "lng", "alt"];
        this.markerGroups[0].labelPrefix = "W";
        this.markerGroups[1].popupFields = ["lat", "lng", "hdg"];
        this.markerGroups[1].labelPrefix = "P";
    }
    onObjectClicked(me: MarkerEvent) {
        if (me.mgIdx === 1) { // planes
            const currentId = this.markerGroups[1].markers[me.mIdx].id;
            if (this.currentMission.lead_id < 0) { // no leader selected yet
                if (me.primaryButton) { // only listens for left click - leader selection
                    this.setLeader(currentId);
                    this.refreshMarkers(this.markerGroups[me.mgIdx].markers[me.mIdx], me.mgIdx);
                }
            } else {
                if (me.primaryButton && currentId !== this.currentMission.lead_id) { // left click
                    if (this.currentMission.follower_ids.includes(currentId)) { // clicked follower
                        this.removeFollower(currentId);
                    }
                    this.unsetLeader();
                    this.setLeader(currentId);
                } else if (me.secondaryButton) { // right click
                    this.updateFollower(currentId);
                }
                this.refreshDsFollowers();
                this.refreshMarkers(undefined, me.mgIdx);
            }
        }
    }
    private fIds2FIndices(ids: Array<number>): Array<number> {
        return ids.map((id) => this.nonleaders.findIndex((m) => m.id === id)).filter((idx) => idx >= 0);
    }
    private refreshDsFollowers() {
        const fIndices = this.fIds2FIndices(this.currentMission.follower_ids);
        this.ds.reset(fIndices);
    }
    private leaderPrevColor: Color = Color.Transparent;
    private setLeader(mId: number) {
        this.leaderPrevColor = this.markerGroups[1].getColor(mId);
        this.markerGroups[1].setColor(mId, this.ldColor);
        this.currentMission.lead_id = mId;
    }
    private unsetLeader() {
        this.markerGroups[1].setColor(this.currentMission.lead_id, this.leaderPrevColor);
        this.currentMission.lead_id = -1;
    }
    private addFollower(mId: number) {
        this.markerGroups[1].setColor(mId, this.flColor);
        this.currentMission.follower_ids.push(mId);
    }
    private removeFollower(mId: number) {
        this.markerGroups[1].setColor(mId, Color.Transparent);
        this.currentMission.follower_ids.splice(this.currentMission.follower_ids.indexOf(mId), 1);
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