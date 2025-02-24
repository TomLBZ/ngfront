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
    private updateFollower(mId: number) {
        if (mId === this.currentMission.lead_id) return; // leader cannot be a follower
        const isFollower = this.currentMission.follower_ids.includes(mId);
        if (isFollower) { // remove follower
            this.removeFollower(mId);
        } else { // add follower
            this.addFollower(mId);
        }
    }
    private clearFollowers() {
        const fIds = [...this.currentMission.follower_ids];
        for (const fId of fIds) {
            this.removeFollower(fId);
        }
        this.currentMission.follower_ids = [];
    }
    private resetFollowers(mIds: Array<number>) {
        this.clearFollowers();
        for (const mId of mIds) {
            this.addFollower(mId);
        }
    }
    @ViewChild('ds', { static: true }) ds!: DropSelectComponent;
    onPlaneSelected(markers: Array<Marker> | Marker) {
        if (markers instanceof Marker) { // single selection: leader plane
            this.setLeader(markers.id);
        } else { // multiple selection: follower planes
            this.resetFollowers(markers.map((m) => m.id));
        }
    }
    @ViewChild('wp', { static: true }) wpEditor!: ObjEditorComponent;
    @ViewChild('pl', { static: true }) plEditor!: ObjEditorComponent;
    private refreshMarkers(m?: Marker, mgIdx: number = 0, forced: boolean = false) {
        if (mgIdx < 0) return; // invalid marker group index
        if (m !== undefined) {
            this.markerGroups[mgIdx].updateMarker(m, forced);
        } else {
            this.markerGroups[mgIdx].refresh();
        }
        if (mgIdx === 0) { // waypoints
            this.currentMission.setPath(this.markerGroups[0].markers, this.ldColor);
            this.wpEditor.objToEdit = this.markerGroups[mgIdx]; // refresh editor
        } else if (mgIdx === 1) { // planes
            this.plEditor.objToEdit = this.markerGroups[mgIdx]; // refresh editor
        }
    }

    onApplyMG(mg: MarkerGroup, mgIdx: number) {
        this.markerGroups[mgIdx] = mg;
        this.refreshMarkers(undefined, mgIdx);
    }
    onMissionUpdate(obj: any) {
        console.log(obj);
    }
    private startAlt = -1;
    onObjectMouseDown(me: MarkerEvent) {
        if (me.secondaryButton) { // Alt + right button down
            const mId = this.markerGroups[me.mgIdx].markers[me.mIdx].id;
            if (this.isCtrlPressed && me.mgIdx === 0) { // remove waypoint (priority)
                this.markerGroups[me.mgIdx].removeMarker(me.mIdx);
            } else if (this.isAltPressed && me.mgIdx === 1) { // remove plane instance
                if (mId === this.currentMission.lead_id) { // removed leader
                    this.clearFollowers();
                    this.unsetLeader();
                } else if (this.currentMission.follower_ids.includes(mId)) { // removed follower
                    this.removeFollower(mId);
                }
                this.markerGroups[me.mgIdx].removeMarker(me.mIdx);
                this.refreshDsFollowers();
            }
            this.refreshMarkers(undefined, me.mgIdx);
        } else if (me.middleButton) {
            this.startAlt = this.markerGroups[me.mgIdx].markers[me.mIdx].alt;
        }
    }
    onObjectMouseUp(me: MarkerEvent) {
        if (me.middleButton) { // only handles middle button up
            this.startAlt = -1;
        }
    }
    onObjectMoved(me: MarkerEvent) {
        if (this.isAltPressed || this.isCtrlPressed) return; // special key is pressed, do not handle move event
        if (me.primaryButton && this.markerGroups[me.mgIdx].moveable) { // left button dragging: move to new position
            const m = this.markerGroups[me.mgIdx].markers[me.mIdx].moveTo(me.lat, me.lng);
            this.refreshMarkers(m, me.mgIdx);
        } else if (me.secondaryButton && me.mgIdx === 1) { // right button dragging: change hdg for planes
            const hdg = this.dCoordsToHdg(me.dLat, me.dLng);
            const m = this.markerGroups[me.mgIdx].markers[me.mIdx].rotateTo(hdg);
            this.refreshMarkers(m, me.mgIdx);
        } else if (me.middleButton && me.mgIdx === 0) { // middle button dragging: change alt for WPs
            const alt = this.dCoordsToAlt(me.dLat, me.dLng, 100);
            const newAlt = Math.max(0, this.startAlt + alt);
            const m = this.markerGroups[me.mgIdx].markers[me.mIdx].liftTo(newAlt);
            this.refreshMarkers(m, me.mgIdx);
        }
    }
    onMapMouseDown(mve: MapViewEvent) {
        if (!this.isAltPressed && !this.isCtrlPressed) return; // no special key pressed
        if (mve.primaryButton) { // left click
            const m = new Marker(mve.lat, mve.lng);
            if (this.isCtrlPressed) { // add waypoint (priority)
                this.refreshMarkers(m, 0);
                mve.cancelled = true; // prevent default action
            } else if (this.isAltPressed) { // add plane instance
                this.refreshMarkers(m, 1);
            }
        }
    }
    private dCoordsToAlt(diffLat: number, diffLng: number, mPerUnit: number): number {
        const dx = Math.abs(diffLng) * mPerUnit; // moving left or right has the same effect
        const dy = diffLat * mPerUnit;
        return dy * Math.pow(10, dx);
    }
    private dCoordsToHdg(diffLat: number, diffLng: number): number {
        const rawRad = Math.atan2(diffLat, diffLng);
        const offsetRad = Math.PI / 2 - rawRad;
        const posRad = offsetRad < 0 ? 2 * Math.PI + offsetRad : offsetRad;
        return posRad * 180 / Math.PI;
    }
    private isAltPressed = false;
    private isCtrlPressed = false;
    @HostListener("window:keydown", ["$event"])
    onKeydown(event: KeyboardEvent) {
        if (event.key === "Alt") {
            this.isAltPressed = true;
        } else if (event.key === "Control") {
            this.isCtrlPressed = true;
        }
    }
    @HostListener("window:keyup", ["$event"])
    onKeyup(event: KeyboardEvent) {
        if (event.key === "Alt") {
            this.isAltPressed = false;
        } else if (event.key === "Control") {
            this.isCtrlPressed = false;
        }
    }
}