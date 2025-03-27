import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { APIResponse } from '../../app.interface';
import { Marker } from '../../../utils/marker/marker';
import { ObjEditorComponent } from '../../../components/obj_editor/obj_editor';
import { Path, PathStyle } from '../../../utils/path/path';
import { Point } from '../../../utils/point/point';
import { Cache } from '../../../utils/cache/cache';
import { Waypoint, Mission, Telemetry } from '../../app.interface';
import { StructValidator } from '../../../utils/api/validate';
import { Callback, DictN } from '../../../utils/type/types';
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
    private readonly _planePtsCache: Cache<Array<Point>> = new Cache<Array<Point>>();
    private readonly _colorsCache: Cache<Color> = new Cache<Color>();
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
    public get healthStr(): string {
        const header = "===== System Health =====\n";
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
    public get launchable(): boolean { return ["EXITED", "COMPLETED", "ERROR"].includes(this._health.mstatus); }
    public get stoppable(): boolean { return this._health.sim; } // can stop simulator when running
    public get markerGroups(): Array<MarkerGroup> { return [this._planeMgrp, this._wpGrp]; }
    public get paths(): Array<Path> { return [this._mpath, ...this._ppaths]; }
    public get apiKey(): string { return env.mapKey; }
    public get allPlaneIds(): Array<number> { return this.selectedMission !== undefined ? [this.selectedMission.lead_id, ...this.selectedMission.follower_ids] : [0]; }
    public get telemetryNames(): Array<string> { return this._telemetries.map((t: Telemetry) => `ID: ${t.id}`); }
    public get visibleTelemetries(): Array<Telemetry> { return this._visibleTelemetryIndices.map((i: number) => this._telemetries[i]); }
    public readonly idRepr: Function = (o: any) => `ID: ${o.id}`;
    public readonly nameRepr: Function = (o: any) => o.name;
    public missions: Array<Mission> = [];
    public launchSettings: LaunchSettings = { fgEnable: false };
    public runtimeSettings: RuntimeSettings = { traces: 50, lead_id: 0 };
    public selectedMission?: Mission = undefined;
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
        this._planePtsCache.clear(); // clear all cached path points
        this._ppaths.splice(0, this._ppaths.length); // clear all plane paths
        this.runtimeSettings = { traces: 50, lead_id: 0 }; // reset runtime settings
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
        this._ppaths.splice(0, this._ppaths.length); // clear old plane paths
        this._telemetries.forEach((t: Telemetry) => {
            const m = new Marker(t.lat, t.lon, t.id);
            m.alt = t.alt;
            m.hdg = t.hdg;
            this._planeMgrp.updateMarker(m);
            if (!this._planePtsCache.has(t.id)) {
                this._planePtsCache.set(t.id, []);
            }
            const path = new Path(t.id);
            const points = this._planePtsCache.get(t.id);
            const last = points.length > 0 ? points[points.length - 1] : undefined;
            const newp = new Point(t.lon, t.lat);
            if (last === undefined || !last.equals(newp)) points.push(newp); // add new point if it's different from the last
            if (points.length > this.runtimeSettings.traces) points.splice(0, points.length - this.runtimeSettings.traces); // remove oldest points
            if (!this._colorsCache.has(t.id)) {
                this._colorsCache.set(t.id, Color.Random());
            }
            path.color = this._colorsCache.get(t.id);
            path.weight = 1;
            path.setPoints(points);
            this._ppaths.push(path);
        });
        if (this.selectedMission !== undefined && this._colorsCache.has(this.selectedMission.lead_id)) {
            this._planeMgrp.setColor(this.selectedMission.lead_id, Color.Red); // set lead plane Border
        }
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
        this.runtimeSettings = { traces: 50, lead_id: m.lead_id }; // reset runtime settings
    }
    onLaunchSettingsChanged(newSettings: LaunchSettings) {
        if (newSettings.fgEnable !== this.launchSettings.fgEnable) {
            if (newSettings.fgEnable) {
                alert("Enabling FlightGear makes launching a mission takes very long, please be patient. We recommend disabling this option.");
            }
            this._svc.callAPI("sim/fgenable", this.void, { fg_enable: newSettings.fgEnable }, alert);
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
            }, newSettings.lead_id, (d: APIResponse) => {
                alert(d);
                this.runtimeSettings = backup_settings;
            });
        }
        this.runtimeSettings = newSettings;
    }
    onLaunch() {
        this._svc.callAPI("mission/start", (d: any) => {
            if (!StructValidator.hasFields(d, ["success", "msg"])) alert("Invalid response");
            else if (!(d as APIResponse).success) alert(d.msg);
        }, this.selectedMission!.id, alert);
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
}