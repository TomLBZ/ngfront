import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MarkerGroup } from '../../../utils/marker/markergrp';
import { Icon } from '../../../utils/icon/icon';
import { Color } from '../../../utils/color/color';
import { MapViewComponent } from '../../../components/mapview/mapview';
import { OutboxComponent } from '../../../components/outbox/outbox';
import { env } from '../../app.config';
import { RTOS } from '../../../utils/rtos/rtos';
import { MissedDeadlinePolicy } from '../../../utils/rtos/rtostypes';
import { AppService } from '../../app.service';
import { DropSelectComponent } from '../../../components/dropselect/dropselect';
import { OnceValue } from '../../../utils/once/once';
import { APICallback, APIResponse } from '../../app.interface';
import { Marker } from '../../../utils/marker/marker';
import { ObjEditorComponent } from '../../../components/obj_editor/obj_editor';
import { Path, PathStyle } from '../../../utils/path/path';
import { Point } from '../../../utils/point/point';
import { Cache } from '../../../utils/cache/cache';
import { Waypoint, Mission, Telemetries, Telemetry } from '../../app.interface';
interface LaunchSettings {
    fgEnable: boolean;
}
interface RuntimeSettings {
    traces: number;
    lead_id: number;
}
interface Status {
    bridge: boolean;
    simulator: boolean;
    algo: boolean;
    mstatus: string;
    mrun: boolean;
    mdone: boolean;
}
@Component({
    selector: 'page-monitor',
    imports: [
        MapViewComponent, OutboxComponent, 
        DropSelectComponent, ObjEditorComponent
    ],
    templateUrl: 'monitor.html'
})
export class MonitorPage implements OnInit, OnDestroy {
    private readonly planeMgrp: MarkerGroup = new MarkerGroup(Icon.Poly(16, Icon.polyPlaneVecs, Color.Blue));
    private readonly wpGrp: MarkerGroup = new MarkerGroup(Icon.Circle(16, Color.Magenta));
    public get markerGroups(): Array<MarkerGroup> { return [this.planeMgrp, this.wpGrp]; }
    private readonly mpath: Path = new Path(-1);
    private readonly ppaths: Array<Path> = [];
    public get paths(): Array<Path> { return [this.mpath, ...this.ppaths]; }
    public get apiKey(): string { return env.mapKey; }
    launchSettings: LaunchSettings = { fgEnable: false };
    runtimeSettings: RuntimeSettings = { traces: 50, lead_id: 0 };
    status: Status = { bridge: false, simulator: false, algo: false, mstatus: "None", mrun: false, mdone: false };
    telemetries: Array<Telemetry> = [];
    idRepr: Function = (o: any) => `ID: ${o.id}`;
    visibleTelemetryIndices: Array<number> = [];
    missions: Array<Mission> = [];
    selectedMission?: Mission = undefined;
    nameRepr: Function = (o: any) => o.name;
    private websocket?: WebSocket;
    private readonly pointsCache: Cache<Array<Point>> = new Cache<Array<Point>>();
    private readonly colorsCache: Cache<Color> = new Cache<Color>();
    @ViewChild(OutboxComponent) outbox?: OutboxComponent;
    private readonly stateApis = ["br/health", "sim/health", "mission/health"];//, "algo/health"
    private readonly missionApis = ["mission/all", "mission/current"];
    private readonly isMissionInvalidated: OnceValue<boolean> = new OnceValue(false);
    private readonly _rtos: RTOS = new RTOS({
        cycleIntervalMs: 100,
        continueAfterInterrupt: true,
        timeSlicePerCycle: true,
        useAnimationFrame: true,
    });
    private popup: APICallback = (d: APIResponse) => alert(d.msg);
    private void: APICallback = () => {};
    private invalidate: APICallback = () => this.isMissionInvalidated.reset();
    private isValidMission(m: any): boolean {
        return m.hasOwnProperty("id") && m.hasOwnProperty("name") && m.hasOwnProperty("description") && m.hasOwnProperty("lead_id") && m.hasOwnProperty("lead_path") && m.hasOwnProperty("follower_ids");
    }
    private fetchStates() { // runs every second
        this.stateApis.forEach((api: string) => this.svc.callAPIWithCache(api, undefined, this.void));
        this.svc.apiFlags.addName("algo/health"); // dummy, remove when implemented
        this.svc.apiFlags.set("algo/health"); // dummy
        this.svc.apiDataCache.set(this.svc.apiFlags.indexOf("algo/health"), { success: false, msg: "Not Implemented", data: {} }); // dummy
    }
    private _displayStatus(s: Status): void {
        if (!this.outbox) return;
        let str = "===== System Health =====\n";
        str += `Backend: ${s.bridge ? "Online" : "Offline"}\n`;
        str += `Simulator: ${s.simulator ? "Running" : "Stopped"}\n`;
        str += `Algorithm: ${"UNIMPLEMENTED"}\n`;
        str += `Mission: ${s.mstatus}`;
        this.outbox.clear(str);
    }
    private onStatesUpdated() {
        const data = this.svc.getAPIData("mission/health").data;
        const rawms = data !== null && data !== undefined ? data.mission_status : "NONE";
        const ms = rawms === "STOPPED" ? "SIGLOST" : rawms;
        this.status.bridge = this.svc.getAPIData("br/health").success;
        this.status.simulator = this.svc.getAPIData("sim/health").success;
        this.status.algo = this.svc.getAPIData("algo/health").success;
        this.status.mstatus = ms;
        this.status.mdone = ["COMPLETED", "ERROR"].includes(ms); // mission done
        this.status.mrun = ["STARTED", "SIGLOST"].includes(ms);
        this._displayStatus(this.status);
        if (!this.status.simulator && this.websocket !== undefined) { // simulator not running but websocket is open
            this.websocket.close();
            this.websocket = undefined;
            this.selectedMission = undefined;
            this.wpGrp.clearMarkers();
            this.mpath.clear();
        }
        this.svc.unsetFlags(this.stateApis);
    }
    private updateMissions() {
        this.missionApis.forEach((api: string) => this.svc.callAPIWithCache(api, undefined, this.void))
    }
    private onRunningMissionChanged(m: Mission) {
        if (!this.isValidMission(m)) return; // invalid
        if (m === this.selectedMission) return; // unchanged
        if (this.status.mrun && m.id === this.selectedMission?.id) { // running same mission, only possible change is lead_id
            this.selectedMission.lead_id = m.lead_id;
            this.runtimeSettings.lead_id = m.lead_id;
            return;
        }
        if (this.websocket !== undefined) { // different mission: close old websocket
            this.websocket.close();
            this.websocket = undefined;
        }
        this.wpGrp.clearMarkers(); // clear old waypoints
        const leadPoints: Array<Point> = [];
        m.lead_path.forEach((wp: Waypoint, idx: number) => {
            const m = new Marker(wp.lat, wp.lon, idx);
            m.alt = wp.alt;
            this.wpGrp.updateMarker(m);
            leadPoints.push(new Point(wp.lon, wp.lat));
        });
        this.mpath.setPoints(leadPoints);
        this.selectedMission = m;
        this.runtimeSettings.lead_id = m.lead_id; // set lead id
        this.websocket = new WebSocket(env.wsUrl); // open new websocket to get telemetry
        this.websocket.onmessage = (e: MessageEvent) => this.onTelemetry(e);
        this.websocket.onclose = () => this.onSocketClosed();
    }
    private onMissionsUpdated() {
        const mdata = this.svc.getAPIData("mission/all").data;
        if (mdata !== null && mdata !== undefined) {
            const ms = mdata.missions_config;
            if (ms !== null && ms !== undefined) this.missions = ms;
        }
        const current: Mission = this.svc.getAPIData("mission/current").data;
        if (current !== null || current !== undefined) this.onRunningMissionChanged(current);
        this.svc.unsetFlags(this.missionApis);
    }
    private onSocketClosed() {
        this.visibleTelemetryIndices = [];
        this.telemetries = [];
        this.planeMgrp.clearMarkers();
        this.pointsCache.clear();
        this.ppaths.splice(0, this.ppaths.length); // clear old paths
    }
    private isValidTelemetry(t: Telemetry): boolean {
        const keys = ["roll", "pitch", "yaw", "lat", "lon", "alt", "hdg", "agl", "speed", "course", "climb", "throttle"];
        return keys.every((k: string) => t.hasOwnProperty(k) && (t as any)[k] !== null && (t as any)[k] !== undefined);
    }
    private onTelemetry(e: MessageEvent) {
        const telemetries: Telemetries = e.data !== null && e.data !== undefined ? JSON.parse(e.data) as Telemetries : {} as Telemetries;
        this.telemetries = [];
        Object.entries(telemetries).forEach(([k, v]: [string, Telemetry]) => {
            if (!this.isValidTelemetry(v)) return; // invalid telemetry
            v.id = parseInt(k);
            this.telemetries.push(v);
        });
        if (this.telemetries.length === 0) return;
        this.planeMgrp.clearMarkers();
        this.ppaths.splice(0, this.ppaths.length); // clear old paths
        this.telemetries.forEach((t: Telemetry) => {
            const m = new Marker(t.lat, t.lon, t.id);
            m.alt = t.alt;
            m.hdg = t.hdg;
            this.planeMgrp.updateMarker(m);
            if (!this.pointsCache.has(t.id)) {
                this.pointsCache.set(t.id, []);
            }
            const path = new Path(t.id);
            const points = this.pointsCache.get(t.id);
            points.push(new Point(t.lon, t.lat));
            if (points.length > this.runtimeSettings.traces) points.splice(0, points.length - this.runtimeSettings.traces); // remove oldest points
            if (!this.colorsCache.has(t.id)) {
                this.colorsCache.set(t.id, Color.Random());
            }
            path.color = this.colorsCache.get(t.id);
            path.weight = 1;
            path.setPoints(points);
            const hashes = this.ppaths.map((p: Path) => p.hash);
            if (!hashes.includes(path.hash)) this.ppaths.push(path);
            else {
                console.log(path.id, path.hash);
                const idx = hashes.indexOf(path.hash);
                this.ppaths[idx] = path;
            }
        });
        if (this.selectedMission !== undefined && this.colorsCache.has(this.selectedMission.lead_id)) {
            this.planeMgrp.setColor(this.selectedMission.lead_id, Color.Red); // set lead plane Border
        }
    }
    constructor(private svc: AppService) {
        this.mpath = new Path(-1);
        this.mpath.color = Color.Orange;
        this.mpath.weight = 2;
        this.mpath.style = PathStyle.Dashed;
        this._rtos.addTask(() => this.fetchStates(), {
            priority: 1, // low priority
            intervalMs: 1000, // fetches states per one second
            missedPolicy: MissedDeadlinePolicy.RUN_ONCE,
        });
        this._rtos.addInterrupt(() => this.svc.testFlags(this.stateApis), () => this.onStatesUpdated());
        this._rtos.addInterrupt(() => this.isMissionInvalidated.value, () => this.updateMissions());
        this._rtos.addInterrupt(() => this.svc.testFlags(this.missionApis), () => this.onMissionsUpdated());
    }
    ngOnInit(): void {
        this._rtos.start();
        this.isMissionInvalidated.reset(true);
    }
    ngOnDestroy(): void {
        this._rtos.stop();
        console.log("RTOS stopped");
        console.log(this._rtos.stats);
        if (this.websocket !== undefined) {
            this.websocket.close();
        }
    }
    onPlaneSelected(indices: Array<number>) {
        this.visibleTelemetryIndices = indices;
    }
    onMissionSelected(m: Mission) {
        this.selectedMission = m;
    }
    onLaunchSettingsChanged(newSettings: LaunchSettings) {
        if (newSettings.fgEnable !== this.launchSettings.fgEnable) {
            if (newSettings.fgEnable) {
                alert("Enabling FlightGear makes launching a mission takes very long, please be patient. We recommend disabling this option.");
            }
            this.svc.callAPI("sim/fgenable", this.void, { fg_enable: newSettings.fgEnable }, this.popup);
        }
        this.launchSettings = newSettings;
    }
    onRuntimeSettingsChanged(newSettings: RuntimeSettings) {
        if (newSettings.traces < 1) newSettings.traces = 1; // minimum traces is one
        if (this.selectedMission !== undefined) {
            const all_ids = [this.selectedMission.lead_id, ...this.selectedMission.follower_ids];
            if (!all_ids.includes(newSettings.lead_id)) { // invalid lead id
                newSettings.lead_id = this.selectedMission.lead_id; // reset to old lead id
            }
        }
        if (newSettings.lead_id !== this.runtimeSettings.lead_id) { // lead id changed
            const backup_settings = this.runtimeSettings;
            this.svc.callAPI("mission/changelead", (d) => {
                if (d.success) this.invalidate(d);
                else this.runtimeSettings = backup_settings;
            }, newSettings.lead_id, (d) => {
                this.popup(d);
                this.runtimeSettings = backup_settings;
            });
        }
        this.runtimeSettings = newSettings;
    }
    onLaunch() {
        this.svc.callAPI("mission/start", this.invalidate, this.selectedMission!.id, this.popup);
    }
    onSigLoss(isSiglost: boolean) {
        if (isSiglost) {
            this.svc.callAPI("mission/start", (_) => alert("Signal resumed"), this.selectedMission!.id);
        } else {
            this.svc.callAPI("mission/stop", (_) => alert("Signal blocked"));
        }
    }
    onStop() {
        this.svc.callAPI("sim/stop", this.invalidate);
    }
}