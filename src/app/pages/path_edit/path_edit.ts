import { Component, HostListener, ViewChild, OnInit, OnDestroy } from "@angular/core";
import { MapViewComponent } from "../../../components/mapview/mapview";
import { MarkerEvent, MapViewEvent } from "../../../components/mapview/event";
import { Marker } from "../../../utils/marker/marker";
import { MarkerGroup } from "../../../utils/marker/markergrp";
import { env } from "../../app.config";
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { Icon } from "../../../utils/icon/icon";
import { Color } from "../../../utils/color/color";
import { Path } from "../../../utils/path/path";
import { AppService } from "../../app.service";
import { APIResponse, Mission, Aircraft } from "../../app.interface";
import { Callback } from "../../../utils/type/types";

@Component({
    selector: "page-path-edit",
    standalone: true,
    imports: [MapViewComponent, ObjEditorComponent, DropSelectComponent],
    templateUrl: "./path_edit.html"
})
export class PathEditPage implements OnInit, OnDestroy {
    private readonly iconSize: number = 16;
    private readonly iconScale: number = 1.2;
    private readonly wpColor: Color = Color.Purple.lighten(0.5);
    private readonly plColor: Color = Color.blend(Color.Blue, Color.Cyan, 0.5);
    private readonly flColor: Color = Color.Green;
    private readonly ldColor: Color = Color.Red;
    private readonly svc: AppService;
    private readonly void: Callback = () => {};
    private mGrpFieldsFilter(key: string, mgIdx: number): boolean {
        const generalExcluded = ["icon", "id", "iconScale", "selectable", "selectedBorder", "showLabel", "popupFields"];
        if (generalExcluded.includes(key)) return false;
        const privateExcludedStr = "_";
        if (key.includes(privateExcludedStr)) return false;
        if (mgIdx === 0) return key !== "hdg";
        if (mgIdx === 1) return key !== "alt";
        return true;
    }
    readonly wpFieldsFilter = (key: string) => { return this.mGrpFieldsFilter(key, 0); }
    readonly plFieldsFilter = (key: string) => { return this.mGrpFieldsFilter(key, 1); }
    readonly mFieldsFilter = (key: string) => { return ["id", "name", "description"].includes(key); }
    readonly markerGroups: Array<MarkerGroup> = [
        new MarkerGroup(Icon.Circle(this.iconSize, this.wpColor), true), // wps
        new MarkerGroup(Icon.Poly(this.iconSize, Icon.polyPlaneVecs, this.plColor), true), // planes
    ];
    readonly apiKey = env.mapKey;
    private _timer: any;
    missions: Array<Mission> = [];
    aircrafts: Array<Aircraft> = [];
    nameRepr = (m: Mission) => m.name;
    selectedMissionIndex: number = -1;
    private readonly newMission: Mission = {
        id: -1,
        name: "New Mission",
        description: "",
        lead_id: -1,
        lead_path: [],
        follower_ids: []
    }
    public get selectedMission(): Mission {
        if (this.selectedMissionIndex < 0) return this.newMission;
        return this.missions[this.selectedMissionIndex];
    }
    onMissionSelected(idx: number) {
        this.selectedMissionIndex = idx;
        this.visualizeSelectedMission();
    }
    onMissionDeleted() {
    }
    @ViewChild('ms', { static: true }) ms!: DropSelectComponent;
    onMissionNew() {
        this.selectedMissionIndex = -1;
        this.ms.reset();
        this.visualizeSelectedMission();
    }
    onMissionApply() {

    }
    visualizeSelectedMission() {
        this.markerGroups[0].markers = this.selectedMission.lead_path.map((wp, idx) => {
            return new Marker(wp.lat, wp.lon, idx);
        });
        this.refreshMarkers(undefined, 0);
    }
    paths: Array<Path> = [];
    planeRepr = (m: Marker) => `${this.markerGroups[1].labelPrefix}${this.markerGroups[1].markers.indexOf(m) + 1}`;
    public get leader(): string {
        if (this.selectedMission === undefined) return "Select on Map";
        const lId = this.selectedMission.lead_id;
        const idx = this.markerGroups[1].markers.findIndex((m) => m.id === lId);
        if (idx < 0) return "Select on Map";
        return this.planeRepr(this.markerGroups[1].markers[idx]);
    }
    public get nonleaders(): Array<Marker> {
        return this.markerGroups[1].markers.filter((m) => m.id !== this.selectedMission.lead_id);
    }
    constructor(svc: AppService) {
        this.svc = svc;
        this._timer = setInterval(() => {
            this.svc.callAPI("mission/all", (d: APIResponse) => {
                if (d.success) this.missions = d.data.missions_config;
            }, undefined, this.void);
            this.svc.callAPI("aircraft/all", (d: APIResponse) => {
                if (d.success) this.aircrafts = d.data.instances_config;
            }, undefined, this.void);
            this.onInstancesUpdated();
        } , 1000);
    }
    onInstancesUpdated() {
        this.markerGroups[1].markers = this.aircrafts.map((a) => {
            const m = new Marker(a.start_pos.lat, a.start_pos.lon, a.id, a.name);
            m.alt = a.start_pos.alt;
            m.hdg = a.start_pos.hdg;
            return m;
        });
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
    ngOnDestroy(): void {
        if (this._timer !== undefined) clearInterval(this._timer);
    }
    onObjectClicked(me: MarkerEvent) {
        if (me.mgIdx === 1) { // planes
            const currentId = this.markerGroups[1].markers[me.mIdx].id;
            if (this.selectedMission.lead_id < 0) { // no leader selected yet
                if (me.primaryButton) { // only listens for left click - leader selection
                    this.setLeader(currentId);
                    this.refreshMarkers(this.markerGroups[me.mgIdx].markers[me.mIdx], me.mgIdx);
                }
            } else {
                if (me.primaryButton && currentId !== this.selectedMission.lead_id) { // left click
                    if (this.selectedMission.follower_ids.includes(currentId)) { // clicked follower
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
        const fIndices = this.fIds2FIndices(this.selectedMission.follower_ids);
        this.ds.reset(fIndices);
    }
    private leaderPrevColor: Color = Color.Transparent;
    private setLeader(mId: number) {
        this.leaderPrevColor = this.markerGroups[1].getColor(mId);
        this.markerGroups[1].setColor(mId, this.ldColor);
        this.selectedMission.lead_id = mId;
    }
    private unsetLeader() {
        this.markerGroups[1].setColor(this.selectedMission.lead_id, this.leaderPrevColor);
        this.selectedMission.lead_id = -1;
    }
    private addFollower(mId: number) {
        this.markerGroups[1].setColor(mId, this.flColor);
        this.selectedMission.follower_ids.push(mId);
    }
    private removeFollower(mId: number) {
        this.markerGroups[1].setColor(mId, Color.Transparent);
        this.selectedMission.follower_ids.splice(this.selectedMission.follower_ids.indexOf(mId), 1);
    }
    private updateFollower(mId: number) {
        if (mId === this.selectedMission.lead_id) return; // leader cannot be a follower
        const isFollower = this.selectedMission.follower_ids.includes(mId);
        if (isFollower) { // remove follower
            this.removeFollower(mId);
        } else { // add follower
            this.addFollower(mId);
        }
    }
    private clearFollowers() {
        const fIds = [...this.selectedMission.follower_ids];
        for (const fId of fIds) {
            this.removeFollower(fId);
        }
        this.selectedMission.follower_ids = [];
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
            this.refreshDsFollowers(); // refresh followers
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
            // this.currentMission.setPath(this.markerGroups[0].markers, this.ldColor);
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
                if (mId === this.selectedMission.lead_id) { // removed leader
                    this.clearFollowers();
                    this.unsetLeader();
                } else if (this.selectedMission.follower_ids.includes(mId)) { // removed follower
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