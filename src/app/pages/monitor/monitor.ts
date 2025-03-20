import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MarkerGroup } from '../../../utils/marker/markergrp';
import { Icon } from '../../../utils/icon/icon';
import { Color } from '../../../utils/color/color';
import { MapViewComponent } from '../../../components/mapview/mapview';
import { OutboxComponent } from '../../../components/outbox/outbox';
import { WebGLShaderHostComponent } from '../../../components/webglshaderhost/webglshaderhost';
import { env } from '../../app.config';
import { UniformDict } from '../../../utils/uniform/u';
import { RTOS } from '../../../utils/rtos/rtos';
import { MissedDeadlinePolicy } from '../../../utils/rtos/rtostypes';
import { AppService } from '../../app.service';
import { DropSelectComponent } from '../../../components/dropselect/dropselect';
import { OnceValue } from '../../../utils/once/once';
import { APICallback, APIResponse } from '../../../utils/api/api';
import { TelemetryAPIResponse, TelemetryInstance } from '../../../utils/telemetry/telemetry';
import { Marker } from '../../../utils/marker/marker';
import { ObjEditorComponent } from '../../../components/obj_editor/obj_editor';
import { Path } from '../../../utils/path/path';
import { Point } from '../../../utils/point/point';
import { UniformVec3 } from '../../../utils/uniform/u';
import { Cache } from '../../../utils/cache/cache';
interface Waypoint {
    alt: number;
    lat: number;
    lon: number;
    toa: number;
}
interface Mission {
    id: number;
    name: string;
    description: string;
    lead_id: number;
    lead_path: Array<Waypoint>;
    follower_ids: Array<number>;
}
interface Settings {
    fgEnable: boolean;
    traces: number;
    lead_id: number;
}
interface Status {
    bridge: boolean;
    simulator: boolean;
    algo: boolean;
    mstatus: string;
    siglost: boolean;
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
    planeMgrp: MarkerGroup = new MarkerGroup(Icon.Poly(16, Icon.polyPlaneVecs, Color.Blue));
    wpGrp: MarkerGroup = new MarkerGroup(Icon.Circle(16, Color.Magenta));
    paths: Array<Path> = [];
    apiKey: string = env.mapKey;
    settings: Settings = { fgEnable: true, traces: 50, lead_id: 0 };
    status: Status = { bridge: false, simulator: false, algo: false, mstatus: "None", siglost: false, mdone: false };
    telemetries: Array<TelemetryInstance> = [];
    visibleTelemetryIndices: Array<number> = [];
    telemetryFilter = (field: string) => {
        if (field.includes("home")) return false;
        if (["battery", "groundspeed", "name", "id"].includes(field)) return false;
        return true;
    }
    missions: Array<Mission> = [];
    selectedMission?: Mission = undefined;
    nameRepr: Function = (o: any) => o.name;
    idRepr: Function = (o: any) => `ID: ${o.id}`;
    uniforms: UniformDict = {
        u_time: 0,
        u_campos  : new UniformVec3([0, 0, 0]),
        u_camdir  : new UniformVec3([0, 0, 1]),
        u_camright: new UniformVec3([1, 0, 0]),
        u_camdown : new UniformVec3([0, -1, 0]),
        u_sundir  : new UniformVec3([1, 1, 1]),
    }
    private websocket?: WebSocket;
    private pointsCache: Cache<Array<Point>> = new Cache<Array<Point>>();
    private colorsCache: Cache<Color> = new Cache<Color>();
    @ViewChild(WebGLShaderHostComponent) shaderHost?: WebGLShaderHostComponent;
    @ViewChild(OutboxComponent) outbox?: OutboxComponent;
    private stateApis = ["br/health", "sim/health", "mission/health"];//, "algo/health"
    private listApis = ["mission/all", "mission/current"];
    private isFetchingListApis: OnceValue<boolean> = new OnceValue(false);
    private _rtos: RTOS = new RTOS({
        cycleIntervalMs: 100,
        continueAfterInterrupt: true,
        timeSlicePerCycle: true,
        useAnimationFrame: true,
    });
    private popup: APICallback = (d: APIResponse) => alert(d.msg);
    private void: APICallback = () => {};
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
        str += `Algorithm: ${s.algo ? "Running" : "Stopped"}\n`;
        str += `Mission: ${s.mstatus}`;
        this.outbox.clear(str);
    }
    private onStates() {
        const ms = this.svc.getAPIData("mission/health").mission_status;
        this.status.bridge = this.svc.getAPIData("br/health").success;
        this.status.simulator = this.svc.getAPIData("sim/health").success;
        this.status.algo = this.svc.getAPIData("algo/health").success;
        this.status.mstatus = ms === undefined ? "NONE" : ms === "STOPPED" ? "SIGLOST" : ms;
        this.status.mdone = this.status.simulator && ["COMPLETED", "ERROR"].includes(ms);
        this.status.siglost = this.status.simulator && ["SIGLOST", "STARTED"].includes(ms);
        this._displayStatus(this.status);
        if (!this.status.simulator && this.websocket !== undefined) { // simulator not running but websocket is open
            this.websocket.close();
            this.websocket = undefined;
            this.selectedMission = undefined;
            this.wpGrp.clearMarkers();
            this.paths = [];
        }
        this.svc.unsetFlags(this.stateApis);
    }
    private onListData() {
        const missions = this.svc.getAPIData("mission/all");
        if (missions?.missions_config) this.missions = missions.missions_config;
        const current = this.svc.getAPIData("mission/current");
        this.selectedMission = this.isValidMission(current) ? current : undefined;
        if (this.selectedMission !== undefined) {
            const leadPoints: Array<Point> = [];
            this.wpGrp.clearMarkers();
            this.selectedMission.lead_path.forEach((wp: Waypoint, idx: number) => {
                const m = new Marker(wp.lat, wp.lon, idx);
                m.alt = wp.alt;
                this.wpGrp.updateMarker(m);
                leadPoints.push(new Point(wp.lon, wp.lat));
            });
            const leadPath = new Path(-1); // avoid collision with actual path
            leadPath.color = Color.Red;
            leadPath.weight = 2;
            leadPath.setPoints(leadPoints);
            this.paths = [leadPath];
            if (this.websocket === undefined) {
                this.websocket = new WebSocket(env.wsUrl);
                this.websocket.onmessage = (e: MessageEvent) => this.onTelemetry(e);
                this.websocket.onclose = () => this.onSocketClosed();
            }
        }
        this.svc.unsetFlags(this.listApis);
    }
    private onSocketClosed() {
        this.visibleTelemetryIndices = [];
        this.telemetries = [];
        this.planeMgrp.clearMarkers();
        this.pointsCache.clear();
    }
    private onTelemetry(e: MessageEvent) {
        this.telemetries = TelemetryInstance.fromAPIResponse(JSON.parse(e.data) as TelemetryAPIResponse);
        this.planeMgrp.clearMarkers();
        this.paths = [this.paths[0]]; // keep the lead path only
        this.telemetries.forEach((t: TelemetryInstance) => {
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
            if (points.length > 50) points.shift(); // keep only last 50 points
            if (!this.colorsCache.has(t.id)) {
                this.colorsCache.set(t.id, Color.Random());
            }
            const c = this.colorsCache.get(t.id);
            path.color = c;
            path.weight = 1;
            path.setPoints(this.pointsCache.get(t.id));
            this.paths.push(path);
        });
        if (this.selectedMission !== undefined) {
            this.planeMgrp.setColor(this.selectedMission.lead_id, Color.Red);
        }
        
    }
    constructor(private svc: AppService) {
        this._rtos.addTask(() => this.fetchStates(), {
            priority: 1, // low priority
            intervalMs: 1000,
            missedPolicy: MissedDeadlinePolicy.RUN_ONCE,
        });
        this._rtos.addTask(() => this.shaderHost?.drawFrame(), { // normal task
            priority: 2,
            deadlineMs: 30,
        });
        this._rtos.addInterrupt(() => this.svc.testFlags(this.stateApis), () => this.onStates());
        this._rtos.addInterrupt(() => this.isFetchingListApis.value, () => this.listApis.forEach((api: string) => this.svc.callAPIWithCache(api, undefined, this.void)));
        this._rtos.addInterrupt(() => this.svc.testFlags(this.listApis), () => this.onListData());
    }
    
    ngOnInit(): void {
        this._rtos.start();
        this.isFetchingListApis.reset(true);
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
    onMissionSelected(event: Mission) {
        this.selectedMission = event;
    }
    onSettingsChanged(newSettings: Settings) {
        if (newSettings.traces !== this.settings.traces) {
            this.settings.traces = Math.max(1, newSettings.traces);
        }
        if (newSettings.fgEnable !== this.settings.fgEnable) {
            this.svc.callAPI("sim/fgenable", (d: APIResponse) => {
                if (d.success) this.settings.fgEnable = newSettings.fgEnable;
                else alert(d.msg);
            }, { fg_enable: newSettings.fgEnable }, this.popup);
        }
        if (newSettings.lead_id !== this.settings.lead_id) {
            this.svc.callAPI("mission/changelead", (d: APIResponse) => {
                if (d.success) this.settings.lead_id = newSettings.lead_id;
                else alert(d.msg);
            },  newSettings.lead_id, this.popup);
        }
    }
    onLaunch() {
        if (this.selectedMission === undefined) {
            alert("Please select a mission first.");
            return;
        }
        const popupAndReset = (d: APIResponse) => {
            alert(d.msg);
            this.isFetchingListApis.reset();
        }
        this.svc.callAPI("mission/start", popupAndReset, this.selectedMission.id);
        this.isFetchingListApis.reset();
    }
    onSigLoss() {
        if (this.status.siglost && this.status.mstatus === "SIGLOST" ) {
            this.svc.callAPI("mission/start", (_) => alert("Signal resumed"), this.selectedMission?.id);
        } else {
            this.svc.callAPI("mission/stop", (_) => alert("Signal blocked"));
        }
    }
    onStop() {
        this.svc.callAPI("sim/stop", this.popup);
    }
}