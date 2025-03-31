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
    private readonly _newMission: Mission = { id: -1, name: "New Mission", description: "", lead_id: -1, lead_path: [], follower_ids: [] }
    private readonly _missions: Array<Mission> = [this._newMission];
    private readonly void: Callback = () => {};
    private get isCtrlPressed(): boolean { return this._svc.keyCtrl.getKeyState("Control"); }
    private get isAltPressed(): boolean { return this._svc.keyCtrl.getKeyState("Alt"); }
    private _loopTimer: any;
    private _selectedMissionIdx: number = 0;
    private _pendingMissionUpdate: boolean = true;
    private _pendingAircraftUpdate: boolean = true;
    private startAlt: number = -1;
    private leaderPrevColor: Color = Color.Transparent;
    public aircrafts: Array<Aircraft> = [];
    public readonly apiKey = env.mapKey;
    public readonly missionNames: Array<string> = [];
    public readonly wpGroup: MarkerGroup = new MarkerGroup(Icon.Circle(this._iconSize, this._wpColor), true, false, this._iconScale);
    public readonly plGroup: MarkerGroup = new MarkerGroup(Icon.Poly(this._iconSize, Icon.polyPlaneVecs, this._plColor), false, false, this._iconScale);
    public readonly mPath: Path = new Path(-1);
    public readonly mIncludeFieldsFilter = (key: string) => { return key !== "lead_path"; }
    public readonly mReadOnlyFieldsFilter = (key: string) => { return key.includes("_id"); }
    public readonly plIncludeFieldsFilter = (key: string) => { return !key.includes("start_pos.alt"); }
    public get selectedMission(): Mission { return this._missions[this._selectedMissionIdx]; }
    public get existingMission(): boolean { return this._selectedMissionIdx > 0; }

    constructor(svc: AppService) { 
        this._svc = svc; 
        this.mPath.color = Color.Orange;
        this.mPath.weight = 2;
        this.mPath.style = PathStyle.Dashed;
    }
    ngOnInit(): void {
        this.wpGroup.popupFields = ["lat", "lng", "alt"];
        this.plGroup.popupFields = ["lat", "lng", "hdg"];
        this.wpGroup.labelPrefix = "W";
        this.plGroup.labelPrefix = "P";
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
                    this.missionNames.length = 0; // clear all mission names
                    this.missionNames.push(...this._missions.map((m) => m.name));
                    this._pendingMissionUpdate = false;
                }
            }, undefined, this.void);
        }
        if (this._pendingAircraftUpdate) {
            this._svc.callAPI("aircraft/all", (d: any) => {
                if (this.validateResponse(d, "instances_config")) {
                    this.aircrafts = (d as APIResponse).data.instances_config as Array<Aircraft>;
                    this.generateMarkersFromAircrafts();
                    this._pendingAircraftUpdate = false;
                }
            }, undefined, this.void);
        }
    }
    private setLeader(mId: number) {
        if (mId < 0) {
            this.plGroup.setColor(this.selectedMission.lead_id, this.leaderPrevColor);
            this.selectedMission.lead_id = -1;
        } else {
            this.leaderPrevColor = this.plGroup.getColor(mId);
            this.plGroup.setColor(mId, this._ldColor);
            this.selectedMission.lead_id = mId;
        }
        this._missions[this._selectedMissionIdx] = { ...this.selectedMission }; // force update
    }
    private addFollower(mId: number) {
        this.plGroup.setColor(mId, this._flColor);
        this.selectedMission.follower_ids.push(mId);
    }
    private removeFollower(mId: number) {
        this.plGroup.setColor(mId, Color.Transparent);
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
    private generateMarkersFromLeadPath() {
        this.wpGroup.markers = this.selectedMission.lead_path.map((wp, idx) => {
            const m = new Marker(wp.lat, wp.lon, idx); // id = idx, always consecutive
            m.alt = wp.alt;
            return m;
        });
        this.selectedMission.lead_path = [...this.selectedMission.lead_path]; // force update
        this.mPath.setPoints(this.wpGroup.markers);
    }
    private addWaypoint(lat: number, lon: number) {
        const wp = { lat: lat, lon: lon, alt: 0, toa: 0 } as Waypoint;
        this.selectedMission.lead_path.push(wp);
        this.generateMarkersFromLeadPath();
    }
    private removeWaypoint(mIdx: number) {
        this.selectedMission.lead_path.splice(mIdx, 1);
        this.wpGroup.markers.splice(mIdx, 1);
        this.generateMarkersFromLeadPath();
    }
    private updateWaypoint(mIdx: number, m: Marker) {
        const wp = this.selectedMission.lead_path[mIdx]; // some fields such as toa are not updated
        wp.lat = m.lat; // might change because of a new marker
        wp.lon = m.lng; // might change because of a new marker
        wp.alt = m.alt; // might change because of a new marker
        this.generateMarkersFromLeadPath();
    }
    private generateMarkersFromAircrafts() {
        this.plGroup.markers = this.aircrafts.map((a) => {
            const m = new Marker(a.start_pos.lat, a.start_pos.lon, a.id, a.name); // id, must recreate
            m.alt = a.start_pos.alt;
            m.hdg = a.start_pos.hdg;
            return m;
        });
        this.aircrafts = [...this.aircrafts].sort((a, b) => a.id - b.id); // force update and sort by id
    }
    private addAircraft(lat: number, lon: number) {
        const ids = this.aircrafts.map((a) => a.id);
        const maxId = ids.length > 0 ? Math.max(...ids) : 0;
        const ac = { id: maxId + 1, aircraft_type: 0, name: "New Aircraft", start_pos: { lat: lat, lon: lon, alt: 0, hdg: 0 } } as Aircraft;
        this.aircrafts.push(ac);
        this.generateMarkersFromAircrafts();
    }
    private removeAircraft(mIdx: number) {
        this.aircrafts.splice(mIdx, 1);
        this.generateMarkersFromAircrafts();
    }
    private updateAircraft(mIdx: number, m: Marker) {
        const ac = this.aircrafts[mIdx]; // some fields such as name are not updated
        ac.start_pos.lat = m.lat; // might change because of a new marker
        ac.start_pos.lon = m.lng; // might change because of a new marker
        ac.start_pos.alt = m.alt; // might change because of a new marker
        ac.start_pos.hdg = m.hdg; // might change because of a new marker
        this.generateMarkersFromAircrafts();
    }
    onMissionSelected(idx: number) {
        this._selectedMissionIdx = idx;
        this.generateMarkersFromLeadPath();
    }
    onMissionApplied(m: Mission) {
        if (m !== this.selectedMission) this._missions[this._selectedMissionIdx] = m;
    }
    getMissionValidityMessage(m: Mission): string {
        if (m.lead_id < 0) return "No leader selected, please select a leader first by left clicking on a plane instance.";
        if (m.follower_ids.length === 0) return "No follower selected, please select followers by right clicking plane instances.";
        if (m.lead_path.length === 0) return "No waypoints added, please add waypoints by Ctrl+Left clicking on the map.";
        return "";
    }
    onMissionUpdate() {
        const msg: string = this.getMissionValidityMessage(this.selectedMission);
        if (msg.length > 0) { alert(msg); return; }
        this._svc.callAPI("aircraft/update", (d: any) => { // update aircrafts first
            if (this.validateResponse(d, "instances_config")) {
                const newAircrafts = (d as APIResponse).data.instances_config as Aircraft[];
                this.aircrafts = newAircrafts;
                this.generateMarkersFromAircrafts();
                this._pendingAircraftUpdate = true;
            }
        }, { instances_config: this.aircrafts }, this.void); // TODO: if aircrafts are not updated, do not call API to update missions
        if (this.selectedMission.id < 0) { // create new mission
            this._svc.callAPI("mission/create", (d: any) => {
                if (this.validateResponse(d, "mission_config")) {
                    const newMission = (d as APIResponse).data.mission_config as Mission;
                    this._missions.push(newMission);
                    this.missionNames.push(newMission.name);
                    this._selectedMissionIdx = this._missions.length - 1;
                    this._pendingMissionUpdate = true;
                }
            }, { mission_config: this.selectedMission }, this.void);
        } else { // update existing mission
            this._svc.callAPI("mission/update", (d: any) => {
                if (this.validateResponse(d, "mission_config")) {
                    const newMission = (d as APIResponse).data.mission_config as Mission;
                    this._missions[this._selectedMissionIdx] = newMission;
                    this._pendingMissionUpdate = true;
                }
            }, { mission_config: this.selectedMission }, this.void);
        }
    }
    onMissionDeleted() {
    }
    onWaypointApplied(wps: Waypoint[]) {
        this.selectedMission.lead_path = wps;
        this.generateMarkersFromLeadPath();
    }
    onAircraftApplied(as: Aircraft[]) {
        this.aircrafts = as;
        this.generateMarkersFromAircrafts();
    }
    onObjectClicked(me: MarkerEvent) { // only handles plane group, triggers after down & up
        if (me.mgIdx !== 1) return;
        const currentId = this.plGroup.markers[me.mIdx].id;
        if (this.selectedMission.lead_id < 0) { // no leader selected yet
            if (me.primaryButton) { // only listens for left click - leader selection
                this.setLeader(currentId);
                this.plGroup.updateMarker(this.plGroup.markers[me.mIdx]); // force update
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
        if (me.mgIdx === 0) { // waypoint group
            if (me.secondaryButton) { // right button down
                if (this.isCtrlPressed) { // Ctrl+R on WP, remove waypoint (priority)
                    this.removeWaypoint(me.mIdx);
                }
            } else if (me.middleButton) { // middle button down, edit waypoint alt
                this.startAlt = this.wpGroup.markers[me.mIdx].alt;
            }
        } else if (me.mgIdx === 1) { // plane group
            if (me.secondaryButton) { // right button down
                if (this.isAltPressed) { // Alt+R on PL, remove plane instance
                    const mId = this.plGroup.markers[me.mIdx].id;
                    if (mId === this.selectedMission.lead_id) { // removed leader
                        this.clearFollowers();
                        this.setLeader(-1);
                    } else if (this.selectedMission.follower_ids.includes(mId)) { // removed follower
                        this.removeFollower(mId);
                    }
                    this.removeAircraft(me.mIdx);
                }
            }
        }
    }
    onObjectMouseUp(me: MarkerEvent) {
        if (me.middleButton) { // only handles middle button up
            this.startAlt = -1;
        }
    }
    onObjectMoved(me: MarkerEvent) {
        if (this.isAltPressed || this.isCtrlPressed) return; // special key is pressed, do not handle move event
        if (me.mgIdx === 0) { // waypoint move
            if (me.primaryButton && this.wpGroup.moveable) { // left button dragging: move to new position
                const m = this.wpGroup.markers[me.mIdx].moveTo(me.lat, me.lng);
                this.updateWaypoint(me.mIdx, m);
            } else if (me.middleButton) { // middle button dragging: change alt
                const alt = this.dCoordsToAlt(me.dLat, me.dLng, 100);
                const newAlt = Math.max(0, this.startAlt + alt);
                const m = this.wpGroup.markers[me.mIdx].liftTo(newAlt);
                this.updateWaypoint(me.mIdx, m);
            }
        } else { // plane move
            if (me.primaryButton && this.plGroup.moveable) { // left button dragging: move to new position
                const m = this.plGroup.markers[me.mIdx].moveTo(me.lat, me.lng);
                this.updateAircraft(me.mIdx, m);
            } else if (me.secondaryButton) { // right button dragging: change hdg
                const hdg = this.dCoordsToHdg(me.dLat, me.dLng);
                const m = this.plGroup.markers[me.mIdx].rotateTo(hdg);
                this.updateAircraft(me.mIdx, m);
            }
        }
    }
    onMapMouseDown(mve: MapViewEvent) {
        if (!this.isAltPressed && !this.isCtrlPressed) return; // no special key pressed, skip
        if (mve.primaryButton) { // left click
            if (this.isCtrlPressed) { // add waypoint (priority)
                this.addWaypoint(mve.lat, mve.lng);
            } else if (this.isAltPressed) { // add plane instance
                this.addAircraft(mve.lat, mve.lng);
            }
        }
    }
}