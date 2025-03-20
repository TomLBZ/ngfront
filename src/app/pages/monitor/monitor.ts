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
import { Change, ValueEditorComponent } from "../../../components/obj_editor/value_editor/value_editor";
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
    fg_enable: boolean;
    trace_count: number;
    lead_id: number;
}

@Component({
    selector: 'page-monitor',
    imports: [
        MapViewComponent, OutboxComponent, 
        DropSelectComponent, ValueEditorComponent, ObjEditorComponent
    ],
    templateUrl: 'monitor.html'
})
export class MonitorPage implements OnInit, OnDestroy {
    planeMgrp: MarkerGroup = new MarkerGroup(Icon.Poly(16, Icon.polyPlaneVecs, Color.Blue));
    wpGrp: MarkerGroup = new MarkerGroup(Icon.Circle(16, Color.Purple));
    paths: Array<Path> = [];
    apiKey: string = env.mapKey;
    settings: Settings = { fg_enable: true, trace_count: 50, lead_id: 0 };
    runningAirIds: Array<number> = [];
    telemetries: Array<TelemetryInstance> = [];
    editableTelemetryIndices: Array<number> = [];
    telemetryFilter = (field: string) => {
        if (field.includes("home")) return false;
        if (["battery", "groundspeed", "name", "id"].includes(field)) return false;
        return true;
    }
    missions: Array<Mission> = [];
    selectedMission?: Mission = undefined;
    nameRepr: Function = (o: any) => o.name;
    idRepr: Function = (o: any) => `ID: ${o.id}`;
    isSimulatorRunning: boolean = false;
    isLaunchEnabled: boolean = false;
    isSigLostEnabled: boolean = false;
    launchText: string = "Launch Mission";
    sigLossText: string = "Block Signal";
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
    private onStates() {
        if (!this.outbox) return;
        this.outbox.clear("===== System Health =====\n");
        const bridge = this.svc.getAPIData("br/health");
        this.outbox.append(`Backend: ${bridge.success ? "Online" : "Offline"}`);
        const simulator = this.svc.getAPIData("sim/health");
        this.outbox.append(`Simulator: ${simulator.success ? "Running" : "Stopped"}`);
        this.isSimulatorRunning = simulator.success;
        const algo = this.svc.getAPIData("algo/health");
        this.outbox.append(`Algorithm: ${algo.success ? "Running" : "Stopped"}`);
        const mission = this.svc.getAPIData("mission/health");
        const mstatus = mission.mission_status === "STOPPED" ? "SIGLOST" : mission.mission_status;
        this.outbox.append(`Mission: ${mstatus ? mstatus : "None"}`);
        if (!simulator.success) { // simulator not running
            this.isSigLostEnabled = false;
            this.isLaunchEnabled = true; // can launch the simulator with a mission
            this.launchText = "Launch Mission";
            this.sigLossText = "Block Signal";
            if (this.websocket !== undefined) {
                this.websocket.close();
                this.websocket = undefined;
                this.selectedMission = undefined;
                this.wpGrp.clearMarkers();
                this.paths = [];
            }
        } else { // simulator running
            this.launchText = this.isLaunchEnabled ? "Restart Mission" : "Launch Mission";
            this.isLaunchEnabled = ["COMPLETED", "ERROR"].includes(mstatus); // mission has failed or completed
            this.sigLossText = mstatus === "SIGLOST" ? "Resume Signal" : "Block Signal";
            this.isSigLostEnabled = ["STARTED", "SIGLOST"].includes(mstatus); // mission has started or signal lost
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
        this.editableTelemetryIndices = [];
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
        this._rtos.addInterrupt(() => this.isFetchingListApis.value, () => this.listApis.forEach((api: string) => this.svc.callAPIWithCache(api)));
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
        this.editableTelemetryIndices = indices;
    }
    onMissionSelected(event: Mission) {
        this.selectedMission = event;
    }
    onSettingsChanged(change: Change) {
        console.log(change);
        this.settings.fg_enable = change.newValue;
        this.svc.callAPI("sim/fgenable", this.popup, { fg_enable: this.settings.fg_enable });
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
        if (this.launchText.includes("Launch")) {
            this.svc.callAPI("mission/start", popupAndReset, this.selectedMission.id);
        } else {
            this.svc.callAPI("mission/start", popupAndReset, this.selectedMission.id);
        }
        this.isFetchingListApis.reset();
    }
    onSigLoss() {
        const isRunning = this.sigLossText.includes("Block");
        if (isRunning) {
            this.svc.callAPI("mission/stop", (_) => alert("Signal blocked"));
        } else {
            this.svc.callAPI("mission/start", (_) => alert("Signal resumed"), this.selectedMission?.id);
        }
    }
    onStop() {
        this.svc.callAPI("sim/stop", this.popup);
    }
}