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
import { Callback, DictS } from "../../../utils/types";
import { StructValidator } from "../../../utils/api/validate";
import { Flag } from "../../../utils/flag/flag";

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
    private readonly _newMission: Mission = { id: -1, name: "", description: "", lead_id: -1, lead_path: [], follower_ids: [] }
    private readonly void: Callback = () => {};
    private get isCtrlPressed(): boolean { return this._svc.keyCtrl.getKeyState("Control"); }
    private get isAltPressed(): boolean { return this._svc.keyCtrl.getKeyState("Alt"); }
    private _loopTimer: any;
    private _selectedMissionIdx: number = 0;
    private _pendingMissionUpdate: boolean = true;
    private _pendingAircraftUpdate: boolean = true;
    private startAlt: number = -1;
    private leaderPrevColor: Color = Color.Transparent;
    private readonly _aircraftsChanged: DictS<Array<Aircraft>> = {"create": [], "update": [], "delete": []};
    private readonly _aircraftChangeFlags: Flag = new Flag(["create", "update", "delete", "started", "failed"]);
    public aircrafts: Array<Aircraft> = [];
    public isAircraftsValid: boolean = false;
    public isAircraftsCompiled: boolean = false;
    public compiling: boolean = false;
    public readonly apiKey = env.mapKey;
    public readonly missions: Array<Mission> = [this._newMission];
    public readonly missionsRepr = (m: Mission) => m.name.length > 0 ? m.name : "[New Mission]";
    public readonly wpGroup: MarkerGroup = new MarkerGroup(Icon.Circle(this._iconSize, this._wpColor), true, false, this._iconScale);
    public readonly plGroup: MarkerGroup = new MarkerGroup(Icon.Poly(this._iconSize, Icon.polyPlaneVecs, this._plColor), true, false, this._iconScale);
    public readonly mPath: Path = new Path(-1);
    public readonly mIncludeFieldsFilter = (key: string) => { return key !== "lead_path"; }
    public readonly mReadOnlyFieldsFilter = (key: string) => { return key.includes("_id"); }
    public readonly plIncludeFieldsFilter = (key: string) => { return !key.includes("start_pos.alt"); }
    public get selectedMission(): Mission { return this.missions[this._selectedMissionIdx]; }
    public get existingMission(): boolean { return this._selectedMissionIdx > 0; }
    public get planesUpdating(): boolean { return this._aircraftChangeFlags.get("started"); }

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
        this.updateAircrafts();
        if (this._pendingMissionUpdate) {
            this._svc.callAPI("mission/all", (d: any) => {
                if (this.validateResponse(d, "missions_config")) {
                    const missions = (d as APIResponse).data.missions_config as Array<Mission>;
                    this.missions.length = 1; // clear all missions except the new mission
                    this.missions.push(...missions);
                    this._pendingMissionUpdate = false;
                }
            }, undefined, this.void);
        }
        if (this._pendingAircraftUpdate) {
            this._svc.callAPI("aircraft/all", (d: any) => {
                if (this.validateResponse(d, "instances_config")) {
                    let changed: boolean = false;
                    const oldAircrafts = [...this.aircrafts];
                    this.aircrafts = ((d as APIResponse).data.instances_config as Array<Aircraft>).sort((a, b) => a.id - b.id); // sort by id
                    if (this.aircrafts.length !== oldAircrafts.length) changed = true; // different length
                    else for (let i = 0; i < this.aircrafts.length; i++) {
                        if (!this.aircraftEquals(this.aircrafts[i], oldAircrafts[i])) {
                            changed = true; // different aircraft
                            break;
                        }
                    }
                    if (changed) this.generateMarkersFromAircrafts();
                    this._pendingAircraftUpdate = false;
                }
            }, undefined, this.void);
        }
    }
    private updateAircrafts() {
        const ops = ["delete", "create", "update"]; // order matters
        const len = ops.reduce((acc, op) => acc + this._aircraftsChanged[op].length, 0);
        if (len > 0) {
            this._aircraftChangeFlags.set("started"); // start updating
            ops.forEach((op) => this.updateAircraftByOp(op));
        } else if (this._aircraftChangeFlags.get("started")) {
            const done = ops.reduce((acc, op) => acc && this._aircraftChangeFlags.get(op), true);
            if (done) { // all operations are done
                const failed = this._aircraftChangeFlags.get("failed");
                this._aircraftChangeFlags.clear(); // clear all flags
                if (failed) alert("Failed to update some of the aircrafts, please edit and try again.");
                else {
                    alert("Plane instances up to date!"); // notify user
                    this.isAircraftsValid = true; // assume true if no error
                }
            }
        }
    }
    private updateAircraftByOp(op: string) {
        if (this._aircraftsChanged[op].length > 0) {
            const ac = this._aircraftsChanged[op].pop(); // remove aircraft from list
            if (ac === undefined) { // no aircraft to update
                this._aircraftChangeFlags.set(op); // set to true
                return;
            }
            this._aircraftChangeFlags.unset(op); // set to false
            this._aircraftChangeFlags.unset("failed"); // set to false
            console.log(`${op} ${ac.name}`);
            this._svc.callAPI(`aircraft/${op}`, (d: any) => {
                this._aircraftChangeFlags.set(op); // got result, set to true
                if (StructValidator.hasFields(d, ["success", "msg"])) {
                    if ((d as APIResponse).success) { // updated successfully
                        this._pendingAircraftUpdate = true; // force update
                    } else {
                        this._aircraftChangeFlags.set("failed"); // set to true
                        alert(`Failed to ${op} aircraft: ` + (d as APIResponse).msg); // update failed
                    }
                } else {
                    this._aircraftChangeFlags.set("failed"); // set to true
                    alert(`Failed to ${op} aircraft: invalid response\n${JSON.stringify(d)}`); // invalid response
                }
            }, op === "delete" ? ac.id : ac, this.void);
        } else this._aircraftChangeFlags.set(op); // no aircraft to update, set to true
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
        this.missions[this._selectedMissionIdx] = { ...this.selectedMission }; // force update
    }
    private addFollower(mId: number) {
        this.plGroup.setColor(mId, this._flColor);
        this.selectedMission.follower_ids.push(mId);
        this.missions[this._selectedMissionIdx] = { ...this.selectedMission }; // force update
    }
    private removeFollower(mId: number) {
        this.plGroup.setColor(mId, Color.Transparent);
        this.selectedMission.follower_ids = this.selectedMission.follower_ids.filter((fId) => fId !== mId);
        this.missions[this._selectedMissionIdx] = { ...this.selectedMission }; // force update
    }
    private updateFollower(mId: number) {
        if (mId === this.selectedMission.lead_id) return; // leader cannot be a follower
        const isFollower = this.selectedMission.follower_ids.includes(mId);
        if (isFollower) this.removeFollower(mId);
        else this.addFollower(mId);
    }
    private clearFollowers() {
        [...this.selectedMission.follower_ids].forEach((fId) => this.removeFollower(fId));
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
        const wp = { lat: lat, lon: lon, alt: 500, toa: 0 } as Waypoint;
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
        this.aircrafts = [...this.aircrafts]; // force update and sort by id
        this.plGroup.markers = this.aircrafts.map((a) => {
            const m = new Marker(a.start_pos.lat, a.start_pos.lon, a.id, a.name); // id, must recreate
            m.alt = a.start_pos.alt;
            m.hdg = a.start_pos.hdg;
            return m;
        });
        this.isAircraftsValid = false; // reset aircrafts validity since aircrafts are modified
    }
    private addAircraft(lat: number, lon: number) {
        const ids = this.aircrafts.map((a) => a.id);
        const maxId = ids.length > 0 ? Math.max(...ids) : 0;
        const ac = { id: maxId + 1, airframe_type: 0, name: `Aircraft${maxId + 1}`, start_pos: { lat: lat, lon: lon, alt: 500, hdg: 0 } } as Aircraft;
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
    private resetNewMission() {
        this._newMission.name = "";
        this._newMission.description = "";
        this._newMission.lead_id = -1;
        this._newMission.lead_path = [];
        this._newMission.follower_ids = [];
        this.missions[0] = this._newMission;
    }
    private aircraftEquals(a1: Aircraft, a2: Aircraft): boolean {
        return a1.id === a2.id && a1.start_pos.lat === a2.start_pos.lat && a1.start_pos.lon === a2.start_pos.lon &&
            a1.start_pos.alt === a2.start_pos.alt && a1.start_pos.hdg === a2.start_pos.hdg && a1.name === a2.name && a1.airframe_type === a2.airframe_type;
    }
    private verifyName(name: string): string {
        if (name.length === 0) return "Name cannot be empty"; // empty name
        if (name.length > 32) return "Name cannot exceed 32 characters: " + name; // too long name
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) return "Name must start with a letter and can only contain letters, numbers, and underscores: " + name; // invalid name
        return ""; // valid name
    }
    private getMissionValidityMessage(m: Mission): string {
        const mids = this.missions.map((m) => m.id);
        if (m.id <= 0) return "Invalid mission id: " + m.id + ", id should be > 0.";
        if (mids.filter((id) => id === m.id).length > 1) return "Duplicate mission id: " + m.id;
        if (m.id !== Math.floor(m.id)) return "Mission id must be an integer: " + m.id;
        const nMsg = this.verifyName(m.name);
        if (nMsg.length > 0) return nMsg; // invalid name
        if (m.description.length > 256) return "Mission description is too long: " + m.description;
        if (m.lead_id <= 0) return "No leader selected, please select a leader first by left clicking on a plane instance.";
        if (m.follower_ids.length === 0) return "No follower selected, please select followers by right clicking plane instances.";
        if (m.lead_path.length === 0) return "No waypoints added, please add waypoints by Ctrl+Left clicking on the map.";
        return "";
    }
    private getAircraftValidityMessage(): string {
        if (this.aircrafts.length === 0) return "No aircraft added, please add aircraft by Alt+Left clicking on the map.";
        const ids = this.aircrafts.map((a) => a.id);
        const names = this.aircrafts.map((a) => a.name);
        for (const a of this.aircrafts) {
            const suffix = ` for aircraft ${a.name} (id: ${a.id})`;
            if (a.id <= 0) return "Invalid aircraft id (should be > 0): " + a.id + suffix;
            if (a.id !== Math.floor(a.id)) return "Aircraft id must be an integer: " + a.id + suffix;
            if (a.start_pos.lat < -90 || a.start_pos.lat > 90) return "Invalid latitude: " + a.start_pos.lat + suffix;
            if (a.start_pos.lon < -180 || a.start_pos.lon > 180) return "Invalid longitude: " + a.start_pos.lon + suffix;
            if (a.start_pos.alt < 0) return "Invalid altitude: " + a.start_pos.alt + suffix;
            if (a.start_pos.alt > 8844) return "Invalid altitude: " + a.start_pos.alt + suffix;
            if (a.start_pos.hdg < 0 || a.start_pos.hdg >= 360) return "Invalid heading: " + a.start_pos.hdg + suffix;
            const nMsg = this.verifyName(a.name);
            if (nMsg.length > 0) return nMsg + suffix; // invalid name
            if (names.filter((n) => n === a.name).length > 1) return "Duplicate aircraft name: " + a.name + suffix;
            if (ids.filter((id) => id === a.id).length > 1) return "Duplicate aircraft id: " + a.id + suffix;
            if (a.airframe_type < 0 || a.airframe_type > 1) return "Invalid airframe type (0=Default, 1=Custom): " + a.airframe_type + suffix;
        }
        return "";
    }
    onMissionSelected(idx: number) {
        const old_leadId = this.selectedMission.lead_id;
        const old_followerIds = this.selectedMission.follower_ids;
        this.plGroup.setColor(old_leadId, this.leaderPrevColor); // reset old leader color
        old_followerIds.forEach((fId) => this.plGroup.setColor(fId, Color.Transparent)); // reset old followers color
        this._selectedMissionIdx = idx;
        this.plGroup.setColor(this.selectedMission.lead_id, this._ldColor); // set new leader color
        this.selectedMission.follower_ids.forEach((fId) => this.plGroup.setColor(fId, this._flColor)); // set new followers color
        this.generateMarkersFromLeadPath();
    }
    onMissionApplied(m: Mission) {
        if (m.id !== this.selectedMission.id) this.selectedMission.id = m.id; // update id
        if (m.name !== this.selectedMission.name) this.selectedMission.name = m.name; // update name
        if (m.description !== this.selectedMission.description) this.selectedMission.description = m.description; // update description
    }
    onPlanesUpdate() {
        if (this.planesUpdating) return; // already started updating
        this.isAircraftsValid = false; // assume false first
        const msg = this.getAircraftValidityMessage();
        if (msg.length > 0) { alert(msg); return; } // check failed
        this._svc.callAPI("aircraft/all", (d: any) => {
            if (this.validateResponse(d, "instances_config")) {
                const aircrafts_old = (d as APIResponse).data.instances_config as Array<Aircraft>;
                const old_ids = aircrafts_old.map((a) => a.id);
                let isModified: boolean = false;
                this.aircrafts.forEach((a) => {
                    if (old_ids.includes(a.id)) { // update existing aircraft
                        const idx = old_ids.indexOf(a.id);
                        if (!this.aircraftEquals(a, aircrafts_old[idx])) {
                            this._aircraftsChanged["update"].push(a); // update if different
                            isModified = true;
                        }
                        aircrafts_old.splice(idx, 1); // remove aircraft from old list
                        old_ids.splice(idx, 1); // remove id from old id list
                    } else {
                        this._aircraftsChanged["create"].push(a); // create new aircraft
                        isModified = true;
                    }
                });
                aircrafts_old.forEach((a) => { isModified = true; this._aircraftsChanged["delete"].push(a); }); // remaining aircrafts are deleted
                if (!isModified) {
                    alert("Already updated, no plane instance modified!");
                    this.isAircraftsValid = true; // assume true if no error
                    return;
                } else this.isAircraftsCompiled = false; // reset aircrafts compiled status since aircrafts are modified
            }
        }, undefined, this.void);
    }
    onPlanesCompile() {
        if (this.compiling) return; // already waiting for response
        this.compiling = true; // set waiting flag
        this._svc.callAPI("aircraft/compile", (d: any) => {
            this.compiling = false; // reset waiting flag
            if (StructValidator.hasFields(d, ["success", "msg"])) {
                if ((d as APIResponse).success) { // recompiled successfully
                    this.isAircraftsCompiled = true; // set aircrafts compiled status
                    alert("Plane instances compiled!");
                } else alert("Failed to compile aircraft: " + (d as APIResponse).msg);
            } else alert("Failed to compile aircraft: invalid response\n" + JSON.stringify(d)); // invalid response
        }, undefined, this.void);
    }
    @ViewChild("ds", { static: true }) ds!: DropSelectComponent;
    onMissionUpdate() {
        const msg: string = this.getMissionValidityMessage(this.selectedMission);
        if (msg.length > 0) { alert(msg); return; } // check failed
        const ids = this.missions.map((m) => m.id); // exiting ids
        ids.shift(); // remove new mission id
        if (!ids.includes(this.selectedMission.id)) { // create new mission
            this._svc.callAPI("mission/create", (d: any) => {
                if (StructValidator.hasFields(d, ["success", "msg"])) {
                    if ((d as APIResponse).success) { // created successfully
                        this.missions.push({ ...this.selectedMission }); // add new mission
                        this.ds.reset([this.missions.length - 1], true); // select new mission
                        this.resetNewMission(); // reset new mission
                        this._pendingMissionUpdate = true;
                        alert("Mission created!");
                    } else alert("Failed to create mission: " + (d as APIResponse).msg);
                } else alert("Failed to create mission: invalid response\n" + JSON.stringify(d)); // invalid response
            }, this.selectedMission, this.void);
        } else { // update existing mission
            this._svc.callAPI("mission/update", (d: any) => {
                if (StructValidator.hasFields(d, ["success", "msg"])) {
                    if ((d as APIResponse).success) { // updated successfully
                        this.missions[this._selectedMissionIdx] = { ...this.selectedMission }; // force update
                        this._pendingMissionUpdate = true;
                        alert("Mission updated!");
                    } else alert("Failed to update mission: " + (d as APIResponse).msg);
                } else alert("Failed to update mission: invalid response\n" + JSON.stringify(d)); // invalid response
            }, this.selectedMission, this.void);
        }
    }
    onMissionDeleted() {
        this._svc.callAPI("mission/delete", (d: any) => {
            if (StructValidator.hasFields(d, ["success", "msg"])) {
                if ((d as APIResponse).success) { // deleted successfully
                    this.ds.reset([0], true); // select new mission
                    this._pendingMissionUpdate = true;
                    alert("Mission deleted!");
                } else alert("Failed to delete mission: " + (d as APIResponse).msg);
            } else alert("Failed to delete mission: invalid response\n" + JSON.stringify(d)); // invalid response
        }, this.selectedMission.id, this.void);
    }
    onWaypointApplied(wps: Waypoint[]) {
        this.selectedMission.lead_path = wps;
        this.generateMarkersFromLeadPath();
    }
    onAircraftApplied(as: Aircraft[]) {
        this.aircrafts = as.sort((a, b) => a.id - b.id); // sort by id
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