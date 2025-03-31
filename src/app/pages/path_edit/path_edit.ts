import { Component, ViewChild, OnInit, OnDestroy } from "@angular/core";
import { MapViewComponent } from "../../../components/mapview/mapview";
import { MarkerEvent, MapViewEvent } from "../../../components/mapview/event";
import { Marker } from "../../../utils/marker/marker";
import { MarkerGroup } from "../../../utils/marker/markergrp";
import { env } from "../../app.config";
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { Icon } from "../../../utils/icon/icon";
import { Color } from "../../../utils/color/color";
import { Path, PathStyle } from "../../../utils/path/path";
import { AppService } from "../../app.service";
import { APIResponse, Mission, Aircraft, Waypoint } from "../../app.interface";
import { Callback } from "../../../utils/type/types";
import { StructValidator } from "../../../utils/api/validate";
import { Point } from "../../../utils/point/point";

@Component({
    selector: "page-path-edit",
    standalone: true,
    imports: [MapViewComponent, ObjEditorComponent, DropSelectComponent],
    templateUrl: "./path_edit.html"
})
export class PathEditPage implements OnInit, OnDestroy {
    private readonly _svc: AppService;
    private readonly _iconSize: number = 16;
    private readonly _iconScale: number = 1.2;
    private readonly _wpColor: Color = Color.Purple.lighten(0.5);
    private readonly _plColor: Color = Color.blend(Color.Blue, Color.Cyan, 0.5);
    private readonly _flColor: Color = Color.Green;
    private readonly _ldColor: Color = Color.Red;
    private readonly _wpGroup: MarkerGroup = new MarkerGroup(Icon.Circle(this._iconSize, this._wpColor), true, false, this._iconScale);
    private readonly _plGroup: MarkerGroup = new MarkerGroup(Icon.Poly(this._iconSize, Icon.polyPlaneVecs, this._plColor), false, false, this._iconScale);
    private readonly _mPath: Path = new Path(-1);
    private readonly _newMission: Mission = { id: -1, name: "New Mission", description: "", lead_id: -1, lead_path: [], follower_ids: [] }
    private readonly _missions: Array<Mission> = [this._newMission];
    private readonly _aircrafts: Array<Aircraft> = [];
    private readonly void: Callback = () => {};
    private get isCtrlPressed(): boolean { return this._svc.keyCtrl.getKeyState("Control"); }
    private get isAltPressed(): boolean { return this._svc.keyCtrl.getKeyState("Alt"); }
    private _loopTimer: any;
    private _selectedMissionIdx: number = 0;
    private _pendingMissionUpdate: boolean = true;
    private _pendingAircraftUpdate: boolean = true;
    private startAlt: number = -1;
    private leaderPrevColor: Color = Color.Transparent;
    public readonly apiKey = env.mapKey;
    public readonly mIncludeFieldsFilter = (key: string) => { return key !== "lead_path"; }
    public readonly mReadOnlyFieldsFilter = (key: string) => { return key.includes("_id"); }
    public readonly plIncludeFieldsFilter = (key: string) => { return !key.includes("start_pos.alt"); }
    public get markerGroups(): Array<MarkerGroup> { return [this._wpGroup, this._plGroup]; }
    public get waypoints(): Array<Waypoint> { return this.selectedMission.lead_path; }
    public get planes(): Array<Aircraft> { return [...this._aircrafts]; }
    public get paths(): Array<Path> { return [this._mPath]; }
    public get missionNames(): Array<string> { return this._missions.map((m) => m.name); }
    public get selectedMission(): Mission { return this._missions[this._selectedMissionIdx]; }
    public get existingMission(): boolean { return this._selectedMissionIdx > 0; }

    constructor(svc: AppService) { 
        this._svc = svc; 
        this._mPath.color = Color.Orange;
        this._mPath.weight = 2;
        this._mPath.style = PathStyle.Dashed;
    }
    ngOnInit(): void {
        this._wpGroup.popupFields = ["lat", "lng", "alt"];
        this._plGroup.popupFields = ["lat", "lng", "hdg"];
        this._wpGroup.labelPrefix = "W";
        this._plGroup.labelPrefix = "P";
        this._loopTimer = setInterval(() => this.apiLoop(), 1000);
    }
    ngOnDestroy(): void {
        if (this._loopTimer !== undefined) clearInterval(this._loopTimer);
    }
    private validateResponse(d: any, key: string): boolean {
        if (!StructValidator.hasFields(d, ["success", "data"])) return false; // invalid data
        const dd = d as APIResponse;
        if (!dd.success) return false; // failed
        if (!dd.data || !dd.data.hasOwnProperty(key)) return false; // invalid data
        return true;
    }
    private apiLoop() {
        if (this._pendingMissionUpdate) {
            this._svc.callAPI("mission/all", (d: any) => {
                if (this.validateResponse(d, "missions_config")) {
                    const missions = (d as APIResponse).data.missions_config as Array<Mission>;
                    this._missions.length = 1; // clear all missions except the new mission
                    this._missions.push(...missions);
                    this._pendingMissionUpdate = false;
                }
            }, undefined, this.void);
        }
        if (this._pendingAircraftUpdate) {
            this._svc.callAPI("aircraft/all", (d: any) => {
                if (this.validateResponse(d, "instances_config")) {
                    const instances = (d as APIResponse).data.instances_config as Array<Aircraft>;
                    this._aircrafts.length = 0; // clear all aircrafts
                    this._aircrafts.push(...instances);
                    this.refreshPlanes();
                    this._pendingAircraftUpdate = false;
                }
            }, undefined, this.void);
        }
    }
    private refreshWaypoints() {
        const pts: Array<Point> = [];
        this._wpGroup.markers = this.selectedMission.lead_path.map((wp, idx) => {
            pts.push(new Point(wp.lat, wp.lon));
            const m = new Marker(wp.lat, wp.lon, idx); // id = idx, always consecutive
            m.alt = wp.alt;
            return m;
        });
        this._mPath.setPoints(pts);
    }
    private refreshPlanes() {
        this._plGroup.markers = this._aircrafts.map((a) => {
            const m = new Marker(a.start_pos.lat, a.start_pos.lon, a.id, a.name); // id, must recreate
            m.alt = a.start_pos.alt;
            m.hdg = a.start_pos.hdg;
            return m;
        });
    }
    private setLeader(mId: number) {
        if (mId < 0) {
            this._plGroup.setColor(this.selectedMission.lead_id, this.leaderPrevColor);
            this.selectedMission.lead_id = -1;
        } else {
            this.leaderPrevColor = this._plGroup.getColor(mId);
            this._plGroup.setColor(mId, this._ldColor);
            this.selectedMission.lead_id = mId;
        }
        this._missions[this._selectedMissionIdx] = { ...this.selectedMission }; // force update
    }
    private addFollower(mId: number) {
        this._plGroup.setColor(mId, this._flColor);
        this.selectedMission.follower_ids.push(mId);
    }
    private removeFollower(mId: number) {
        this._plGroup.setColor(mId, Color.Transparent);
        this.selectedMission.follower_ids.splice(this.selectedMission.follower_ids.indexOf(mId), 1);
    }
    private updateFollower(mId: number) {
        if (mId === this.selectedMission.lead_id) return; // leader cannot be a follower
        const isFollower = this.selectedMission.follower_ids.includes(mId);
        if (isFollower) this.removeFollower(mId);
        else this.addFollower(mId);
        this._missions[this._selectedMissionIdx] = { ...this.selectedMission }; // force update
    }
    private clearFollowers() {
        [...this.selectedMission.follower_ids].forEach((fId) => this.updateFollower(fId));
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
    private addWaypoint(m: Marker) {
        const wp = { lat: m.lat, lon: m.lng, alt: m.alt, toa: 0 } as Waypoint;
        this.selectedMission.lead_path = [...this.selectedMission.lead_path, wp];
        this.refreshWaypoints();
    }
    private addAircraft(m: Marker) {
        const ac = { id: m.id, aircraft_type: 0, name: "New Aircraft", start_pos: { lat: m.lat, lon: m.lng, alt: m.alt, hdg: m.hdg } } as Aircraft;
        this._aircrafts.push(ac);
        this.refreshPlanes();
    }
    private updateLeadPath() {
        this.selectedMission.lead_path = this.selectedMission.lead_path.map((wp, idx) => {
            const m = this._wpGroup.markers[idx];
            wp.lat = m.lat;
            wp.lon = m.lng;
            wp.alt = m.alt;
            return wp; // keeps toa
        });
    }
    private updateAircrafts() {
        const newAircrafts = this._aircrafts.map((ac, idx) => {
            const m = this._plGroup.markers[idx];
            ac.start_pos.lat = m.lat;
            ac.start_pos.lon = m.lng;
            ac.start_pos.alt = m.alt;
            ac.start_pos.hdg = m.hdg;
            return ac;
        });
        this._aircrafts.length = 0;
        this._aircrafts.push(...newAircrafts);
    }
    onMissionSelected(idx: number) {
        this._selectedMissionIdx = idx;
        this.refreshWaypoints();
    }
    onMissionDeleted() {
    }
    onMissionApply() {
    }
    onWaypointApplied(wps: Waypoint[]) {
        this.selectedMission.lead_path = wps;
        this.refreshWaypoints();
    }
    onAircraftApplied(as: Aircraft[]) {
        this._aircrafts.length = 0;
        this._aircrafts.push(...as);
        this.refreshPlanes();
    }
    onMissionApplied(m: Mission) {
        if (m !== this.selectedMission) {
            this._missions[this._selectedMissionIdx] = m;
            console.log("Mission applied:", m);
            // this._pendingMissionUpdate = true;
        }
    }
    onObjectClicked(me: MarkerEvent) { // only handles plane group, triggers after down & up
        if (me.mgIdx !== 1) return;
        const currentId = this._plGroup.markers[me.mIdx].id;
        if (this.selectedMission.lead_id < 0) { // no leader selected yet
            if (me.primaryButton) { // only listens for left click - leader selection
                this.setLeader(currentId);
                this._plGroup.updateMarker(this._plGroup.markers[me.mIdx]); // force update
            }
        } else {
            if (me.primaryButton && currentId !== this.selectedMission.lead_id) { // left click
                if (this.selectedMission.follower_ids.includes(currentId)) { // clicked follower
                    this.updateFollower(currentId);
                }
                this.setLeader(-1);
                this.setLeader(currentId);
            } else if (me.secondaryButton) { // right click
                this.updateFollower(currentId);
            }
        }
    }
    onObjectMouseDown(me: MarkerEvent) {
        const mg = me.mgIdx === 0 ? this._wpGroup : this._plGroup;
        if (me.secondaryButton) { // right button down
            const mId = mg.markers[me.mIdx].id;
            if (this.isCtrlPressed && me.mgIdx === 0) { // Ctrl+R on WP, remove waypoint (priority)
                mg.removeMarker(me.mIdx);
            } else if (this.isAltPressed && me.mgIdx === 1) { // Alt+R on PL, remove plane instance
                if (mId === this.selectedMission.lead_id) { // removed leader
                    this.clearFollowers();
                    this.setLeader(-1);
                } else if (this.selectedMission.follower_ids.includes(mId)) { // removed follower
                    this.removeFollower(mId);
                }
                mg.removeMarker(me.mIdx);
            }
            mg.refresh();
        } else if (me.middleButton) { // middle button down
            this.startAlt = mg.markers[me.mIdx].alt;
        }
    }
    onObjectMouseUp(me: MarkerEvent) {
        if (me.middleButton) { // only handles middle button up
            this.startAlt = -1;
        }
    }
    onObjectMoved(me: MarkerEvent) {
        if (this.isAltPressed || this.isCtrlPressed) return; // special key is pressed, do not handle move event
        const mg = me.mgIdx === 0 ? this._wpGroup : this._plGroup;
        if (me.primaryButton && mg.moveable) { // left button dragging: move to new position
            const m = mg.markers[me.mIdx].moveTo(me.lat, me.lng);
            mg.updateMarker(m);
            if (me.mgIdx === 0) this.updateLeadPath(); // update lead path if waypoint is moved
        } else if (me.secondaryButton && me.mgIdx === 1) { // R dragging on PL: change hdg for planes
            const hdg = this.dCoordsToHdg(me.dLat, me.dLng);
            const m = mg.markers[me.mIdx].rotateTo(hdg);
            mg.updateMarker(m);
            this.updateAircrafts(); // update aircrafts if plane hdg is changed
        } else if (me.middleButton && me.mgIdx === 0) { // M dragging on WP: change alt for WPs
            const alt = this.dCoordsToAlt(me.dLat, me.dLng, 100);
            const newAlt = Math.max(0, this.startAlt + alt);
            const m = mg.markers[me.mIdx].liftTo(newAlt);
            mg.updateMarker(m);
            this.updateLeadPath(); // update lead path if waypoint alt is changed
        }
    }
    onMapMouseDown(mve: MapViewEvent) {
        if (!this.isAltPressed && !this.isCtrlPressed) return; // no special key pressed, skip
        if (mve.primaryButton) { // left click
            const m = new Marker(mve.lat, mve.lng);
            if (this.isCtrlPressed) { // add waypoint (priority)
                this.addWaypoint(m);
            } else if (this.isAltPressed) { // add plane instance
                this.addAircraft(m);
            }
        }
    }
}