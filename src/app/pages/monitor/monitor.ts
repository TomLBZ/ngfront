import { Component, OnInit, OnDestroy } from '@angular/core';
import { MarkerGroup } from '../../../utils/src/graphics/markergrp';
import { Icon } from '../../../utils/src/graphics/icon';
import { Color } from '../../../utils/src/graphics/color';
import { MapViewComponent } from '../../../components/mapview/mapview';
import { OutboxComponent } from '../../../components/outbox/outbox';
import { env } from '../../app.config';
import { RTOS } from '../../../utils/src/ctrl/rtos';
import { MissedDeadlinePolicy } from '../../../utils/ctrl';
import { AppService } from '../../app.service';
import { DropSelectComponent } from '../../../components/dropselect/dropselect';
import { APIResponse } from '../../app.interface';
import { Marker } from '../../../utils/src/graphics/marker';
import { ObjEditorComponent } from '../../../components/obj_editor/obj_editor';
import { Path, PathStyle } from '../../../utils/graphics';
import { Point } from '../../../utils/src/ds/point';
import { Cache } from '../../../utils/src/ds/cache';
import { Waypoint, Mission, Telemetry } from '../../app.interface';
import { StructValidator } from '../../../utils/src/ds/validate';
import { Callback, DictN } from '../../../utils/types';
interface LaunchSettings {
    fgEnable: boolean;
}
interface RuntimeSettings {
    traces: number;
    lead_id: number;
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
    private readonly _svc: AppService;
    private readonly _planeMgrp: MarkerGroup = new MarkerGroup(Icon.Poly(16, Icon.polyPlaneVecs, Color.Blue));
    private readonly _wpGrp: MarkerGroup = new MarkerGroup(Icon.Circle(16, Color.Magenta));
    private readonly _mpath: Path = new Path(-1);
    private readonly _ppaths: Array<Path> = [];
    private readonly _colorsCache: Cache<Color> = new Cache<Color>();
    private readonly _leadColor: Color = Color.Red;
    private readonly _rtos: RTOS = new RTOS({
        cycleIntervalMs: 100,
        continueAfterInterrupt: true,
        timeSlicePerCycle: true,
        useAnimationFrame: true,
    });
    private readonly _health = {
        br: false,
        mstatus: "EXITED",
        sim: false,
        algo: false
    }
    private readonly _telemetries: Array<Telemetry> = [];
    private readonly _visibleTelemetryIndices: Array<number> = [];
    private websocket?: WebSocket;
    private void: Callback = () => {};
    private alert: Callback = (e: any) => { this.waiting = false; alert(e); };
    public get healthStr(): string {
        const header = "=== System Health ===\n";
        const br = `Bridge: ${this._health.br ? "Online" : "Offline"}\n`;
        const sim = `Simulator: ${this._health.sim ? "Online" : "Offline"}\n`;
        const algo = `Algorithm: ${this._health.algo ? "Online" : "Offline"}\n`;
        const mstatus = `Mission: ${this._health.mstatus}`;
        return header + br + sim + algo + mstatus;
    }
    public get online(): boolean { return this._health.br; }
    public get running(): boolean { return ["INITIATED", "STARTED"].includes(this._health.mstatus); }
    public get pausable(): boolean { return ["STARTED"].includes(this._health.mstatus); }
    public get resumable(): boolean { return ["STOPPED"].includes(this._health.mstatus); }
    public get restartable(): boolean { return ["COMPLETED", "ERROR"].includes(this._health.mstatus); }
    public get launchable(): boolean { return ["EXITED", "COMPLETED", "ERROR"].includes(this._health.mstatus) && this.selectedMission !== undefined; }
    public get stoppable(): boolean { return this._health.sim; } // can stop simulator when running
    public get telemetryEnabled(): boolean { return this._health.sim && this._health.mstatus !== "EXITED" && this.selectedMission !== undefined; }
    public get markerGroups(): Array<MarkerGroup> { return [this._wpGrp, this._planeMgrp]; }
    public get paths(): Array<Path> { return [this._mpath, ...this._ppaths]; }
    public get apiKey(): string { return env.mapKey; }
    public get allPlaneIds(): Array<number> { return this.selectedMission !== undefined ? [this.selectedMission.lead_id, ...this.selectedMission.follower_ids] : [0]; }
    public get telemetryNames(): Array<string> { return this._telemetries.map((t: Telemetry) => `ID: ${t.id}`); }
    public get visibleTelemetries(): Array<Telemetry> { return this._visibleTelemetryIndices.map((i: number) => this._telemetries[i]); }
    public readonly idRepr: Function = (o: any) => `ID: ${o.id}`;
    public readonly nameRepr: Function = (o: any) => o.name;
    public missions: Array<Mission> = [];
    public launchSettings: LaunchSettings = { fgEnable: false };
    public runtimeSettings: RuntimeSettings = { traces: 100, lead_id: 0 };
    public selectedMission?: Mission = undefined;
    public resetNeeded: boolean = false;
    public waiting: boolean = false;
    private isValidMission(m: any): boolean {
        return StructValidator.hasNonEmptyFields(m, ["id", "name", "description", "lead_id", "lead_path", "follower_ids"]);
    }
    private isValidTelemetry(t: Telemetry): boolean {
        return StructValidator.hasNonEmptyFields(t, ["roll", "pitch", "yaw", "lat", "lon", "alt", "hdg", "agl", "speed", "course", "climb", "throttle"]);
    }
    private resetMissionStatus() {
        this._visibleTelemetryIndices.length = 0; // clear all visible telemetries
        this._telemetries.length = 0; // clear all telemetries
        this._planeMgrp.clearMarkers(); // clear all plane markers
        this._ppaths.splice(0, this._ppaths.length); // clear all plane paths
        this.runtimeSettings = { traces: 100, lead_id: 0 }; // reset runtime settings
        this.selectedMission = undefined; // reset selected mission
        this._wpGrp.clearMarkers(); // clear all waypoints
        this._mpath.clear(); // clear lead path
    }
    private onTelemetry(e: MessageEvent) {
        if (!this._health.sim) return; // skip when simulator is offline
        if (this._health.mstatus === "EXITED") return; // skip when mission is not running
        const telemetries: DictN<Telemetry> = (e.data !== null && e.data !== undefined ? JSON.parse(e.data) : {}) as DictN<Telemetry>;
        this._telemetries.length = 0; // clear old telemetries
        Object.entries(telemetries).forEach(([k, v]: [string, Telemetry]) => {
            if (!this.isValidTelemetry(v)) return; // invalid telemetry
            v.id = parseInt(k);
            this._telemetries.push(v);
        });
        if (this._telemetries.length === 0) return;
        this._telemetries.forEach((t: Telemetry) => {
            const m = new Marker(t.lat, t.lon, t.id);
            m.alt = t.alt;
            m.hdg = t.hdg;
            this._planeMgrp.updateMarker(m);
            if (!this._colorsCache.has(t.id)) this._colorsCache.set(t.id, Color.Random());
            const isLeader: boolean = t.id === this.selectedMission?.lead_id;
            this._planeMgrp.setColor(t.id, isLeader ? this._leadColor : Color.Transparent); // set plane Border
            const pathIdx = this._ppaths.findIndex((p: Path) => p.id === t.id);
            const path = pathIdx >= 0 ? this._ppaths[pathIdx] : new Path(t.id);
            path.color = isLeader ? this._leadColor : this._colorsCache.get(t.id);
            path.weight = 1;
            const newp = new Point(t.lon, t.lat);
            const isNew = path.last === undefined || !path.last.equals(newp); // check if new point is different from the last
            if (isNew) path.addPoint(newp); // add new point if it's different from the last
            if (path.length > this.runtimeSettings.traces) path.shift(); // remove oldest points
            if (pathIdx < 0) this._ppaths.push(path); // add new path
            else this._ppaths.splice(pathIdx, 1, path); // remove old path and add new path
        });
    }
    private stopTelemetry() {
        if (this.websocket !== undefined) {
            this.websocket.close();
            this.websocket = undefined;
        }
    }
    private startTelemetry() {
        this.stopTelemetry(); // close old websocket
        this.websocket = new WebSocket(env.wsUrl); // open new websocket to get telemetry
        this.websocket.onmessage = (e: MessageEvent) => this.onTelemetry(e);
        this.websocket.onclose = () => this.resetMissionStatus();
    }
    private apiLoop() { // replace rtos
        this._svc.callAPI("health", (d: any) => {
            if (!StructValidator.hasFields(d, ["success", "data"])) return; // invalid data
            const dd: APIResponse = d as APIResponse;
            this._health.br = dd.success; // update bridge status
            this._health.mstatus = dd.data.mission_status ?? "EXITED";
            this._health.sim = dd.data.simulation_status ?? false;
            this._health.algo = dd.data.algorithm_status ?? false;
            if (!this._health.br) { return; } // skip the rest when bridge is offline
            this._svc.callAPI("mission/all", (d: any) => {
                if (!StructValidator.hasFields(d, ["success", "data"])) return; // invalid data
                const dd = d as APIResponse;
                if (!dd.success) return; // skip when failed
                if (!dd.data || !dd.data.hasOwnProperty("missions_config")) return; // invalid data
                this.missions.length = 0; // clear old missions
                this.missions.push(...(dd.data.missions_config as Array<Mission>));
            }, undefined, this.void);
            this._svc.callAPI("mission/current", (d: any) => {
                if (!StructValidator.hasFields(d, ["success", "data"])) return; // invalid data
                const dd = d as APIResponse;
                if (!dd.success) return; // skip when failed
                if (!this.isValidMission(dd.data)) return; // invalid mission
                const m = dd.data as Mission;
                if (this.selectedMission === undefined) this.onMissionSelected(m); // select mission if not selected
                else if (m.id !== this.selectedMission.id) {
                    alert("Mission changed unexpectedly, please refresh the page.");
                    return;
                } else { // update selected mission data
                    this.selectedMission.lead_id = m.lead_id;
                    this.runtimeSettings.lead_id = m.lead_id;
                    if (this.websocket === undefined) this.startTelemetry();
                }
            }, undefined, this.void);
        }, undefined, this.void);
    }
    constructor(svc: AppService) {
        this._svc = svc;
        this._mpath = new Path(-1);
        this._mpath.color = Color.Orange;
        this._mpath.weight = 2;
        this._mpath.style = PathStyle.Dashed;
        this._rtos.addTask(() => this.apiLoop(), {
            priority: 1, // low priority
            intervalMs: 1000, // fetches states per one second
            missedPolicy: MissedDeadlinePolicy.RUN_ONCE,
        });
    }
    ngOnInit(): void {
        this._rtos.start();
    }
    ngOnDestroy(): void {
        this._rtos.stop();
        this.stopTelemetry();
        console.log("RTOS stopped");
        console.log(this._rtos.stats);
    }
    onPlaneSelected(indices: Array<number>) {
        this._visibleTelemetryIndices.length = 0; // clear all visible telemetries
        this._visibleTelemetryIndices.push(...indices);
    }
    onMissionSelected(m: Mission) {
        if (m === this.selectedMission) return; // unchanged
        if (m.id === this.selectedMission?.id) return; // running same mission
        this._wpGrp.clearMarkers(); // clear old waypoints
        const leadPoints: Array<Point> = [];
        this.selectedMission = m;
        m.lead_path.forEach((wp: Waypoint, idx: number) => {
            const m = new Marker(wp.lat, wp.lon, idx);
            m.alt = wp.alt;
            this._wpGrp.updateMarker(m);
            leadPoints.push(new Point(wp.lon, wp.lat));
        });
        this._mpath.setPoints(leadPoints); // set lead path
        this.runtimeSettings = { traces: this.runtimeSettings.traces, lead_id: m.lead_id }; // set runtime settings
    }
    onLaunchSettingsChanged(newSettings: LaunchSettings) {
        if (newSettings.fgEnable !== this.launchSettings.fgEnable) {
            if (newSettings.fgEnable) {
                alert("Enabling FlightGear makes launching a mission takes very long, please be patient. We recommend disabling this option.");
            }
            const oldLaunchSettings = this.launchSettings;
            this._svc.callAPI("sim/fgenable", (d: any) => {
                if (!d.success) alert(d.msg);
            }, { fg_enable: newSettings.fgEnable }, (d: any) => {
                alert(`Error: ${JSON.stringify(d)}`);
                this.launchSettings = oldLaunchSettings;
            });
        }
        this.launchSettings = newSettings;
    }
    onRuntimeSettingsChanged(newSettings: RuntimeSettings) {
        if (newSettings.traces < 1) newSettings.traces = 1; // minimum traces is one
        if (newSettings.lead_id !== this.runtimeSettings.lead_id) { // lead id changed
            const backup_settings = this.runtimeSettings;
            this._svc.callAPI("mission/changelead", (d: any) => {
                if (!d.success) this.runtimeSettings = backup_settings;
                else this._planeMgrp.setColor(backup_settings.lead_id, Color.Transparent); // reset old lead plane Border
            }, newSettings.lead_id, (d: any) => {
                alert(`Error: ${JSON.stringify(d)}`);
                this.runtimeSettings = backup_settings;
            });
        }
        this.runtimeSettings = newSettings;
    }
    onLaunch() {
        if (this.waiting) return; // skip when waiting
        this.waiting = true;
        this._svc.callAPI("mission/start", (d: any) => {
            this.waiting = false; // stop waiting
            if (!StructValidator.hasFields(d, ["success", "msg"])) alert("Invalid response");
            else if (!(d as APIResponse).success) {
                alert(`Failed to launch mission, please stop simulator immediately and retry: ${d.msg}`);
                this.resetNeeded = true; // reset needed when simulator is offline
            }
        }, this.selectedMission!.id, this.alert);
    }
    onSigLoss(resumable: boolean) {
        if (resumable) this._svc.callAPI("mission/start", () => alert("Signal resumed"), this.selectedMission!.id, alert);
        else this._svc.callAPI("mission/stop", () => alert("Signal blocked"), undefined, alert);
    }
    onStop() {
        this._svc.callAPI("sim/stop", (d: any) => {
            if (!StructValidator.hasFields(d, ["success", "msg"])) alert("Invalid response");
            else if (!(d as APIResponse).success) alert(d.msg); // not successful
            else this.stopTelemetry(); // stop telemetry when stopped successfully
        }, undefined, alert);
    }
    onReset() {
        if (this.waiting) return; // skip when waiting
        this.waiting = true;
        this._svc.callAPI("sim/reset", (d: any) => {
            this.waiting = false; // stop waiting
            if (!StructValidator.hasFields(d, ["success", "msg"])) alert("Failed to reset simulator: Invalid Response!");
            else if (!(d as APIResponse).success) alert(`Failed to reset simulator!\nPlease go to Configurations and apply correct files.\n${d.msg}`);
            else this.resetNeeded = false; // reset not needed
        }, undefined, this.alert);
    }
}