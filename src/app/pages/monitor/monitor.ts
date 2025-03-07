import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MarkerGroup } from '../../../utils/marker/markergrp';
import { Icon } from '../../../utils/icon/icon';
import { Color } from '../../../utils/color/color';
import { MapViewComponent } from '../../../components/mapview/mapview';
import { OutboxComponent } from '../../../components/outbox/outbox';
import { WebGLShaderHostComponent, UniformDict } from '../../../components/webglshaderhost/webglshaderhost';
import { env } from '../../app.config';
import { RTOS } from '../../../utils/rtos/rtos';
import { MissedDeadlinePolicy } from '../../../utils/rtos/rtostypes';
import { AppService } from '../../app.service';
import { DropSelectComponent } from '../../../components/dropselect/dropselect';
import { Change, ValueEditorComponent } from "../../../components/obj_editor/value_editor/value_editor";
import { OnceValue } from '../../../utils/once/once';
import { APICallback, APIResponse } from '../../../utils/api/api';
import { Telemetry, TelemetryAPIResponse } from '../../../utils/telemetry/telemetry';
import { Marker } from '../../../utils/marker/marker';
import { ObjEditorComponent } from '../../../components/obj_editor/obj_editor';
import { Path } from '../../../utils/path/path';
import { Point } from '../../../utils/point/point';
import { UniformVec3 } from '../../../utils/uniform/u';

@Component({
    selector: 'page-monitor',
    imports: [
        MapViewComponent, OutboxComponent, WebGLShaderHostComponent, 
        DropSelectComponent, ValueEditorComponent, ObjEditorComponent
    ],
    templateUrl: 'monitor.html'
})
export class MonitorPage implements OnInit, OnDestroy {
    planeMgrp: MarkerGroup = new MarkerGroup(Icon.Poly(16, Icon.polyPlaneVecs, Color.Blue, Color.Blue));
    paths: Array<Path> = [];
    apiKey: string = env.mapKey;
    fgEnabled: boolean = true;
    runningAirIds: Array<number> = [];
    telemetries: Array<Telemetry> = [];
    editableTelemetryIndices: Array<number> = [];
    telemetryFilter = (field: string) => {
        if (field.includes("home")) return false;
        if (["battery", "groundspeed", "name", "id"].includes(field)) return false;
        return true;
    }
    missions: any = [];
    selectedMission: any = null;
    nameRepr: Function = (o: any) => o.name;
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
    @ViewChild(WebGLShaderHostComponent) shaderHost?: WebGLShaderHostComponent;
    @ViewChild(OutboxComponent) outbox?: OutboxComponent;
    private stateApis = ["br/health", "sim/health", "mission/health", "aircraft/running"];//, "algo/health"
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
    private fetchStates() { // runs every second
        this.stateApis.forEach((api: string) => this.svc.callAPIWithCache(api));
        this.svc.apiFlags.addName("algo/health"); // dummy, remove when implemented
        this.svc.apiFlags.set("algo/health"); // dummy
        this.svc.apiDataCache.set(this.svc.apiFlags.indexOf("algo/health"), { success: false, msg: "Not Implemented", data: {} }); // dummy
    }
    private onStates() {
        if (!this.outbox) return;
        this.outbox.clear("===== System Health =====\n");
        const bridge = this.svc.getAPIData("br/health");
        this.outbox.append(`Bridge: ${bridge.success ? "Online" : "Offline"}`);
        const simulator = this.svc.getAPIData("sim/health");
        this.outbox.append(`Simulator: ${simulator.success ? "Running" : "Stopped"}`);
        const algo = this.svc.getAPIData("algo/health");
        this.outbox.append(`Algorithm: ${algo.success ? "Running" : "Stopped"}`);
        const mission = this.svc.getAPIData("mission/health");
        const mstatus = mission.mission_status === "STOPPED" ? "SIGLOST" : mission.mission_status;
        this.outbox.append(`Mission: ${mstatus ? mstatus : "None"}`);
        this.isSigLostEnabled = ["STARTED", "SIGLOST"].includes(mstatus); // mission must be running to enable sig loss
        this.sigLossText = mstatus === "SIGLOST" ? "Resume Signal" : "Block Signal";
        this.isLaunchEnabled = ["COMPLETED", "ERROR"].includes(mstatus);
        this.launchText = this.isLaunchEnabled ? "Restart Mission" : "-";
        const running = this.svc.getAPIData("aircraft/running");
        if (running) this.runningAirIds = running.running_instances;
        this.svc.unsetFlags(this.stateApis);
    }
    private onListData() {
        const missions = this.svc.getAPIData("mission/all");
        if (missions?.missions_config) this.missions = missions.missions_config;
        const current = this.svc.getAPIData("mission/current");
        if (current) this.selectedMission = current;
        console.log(current);
        this.svc.unsetFlags(this.listApis);
    }
    private telemetryTrigger(): boolean {
        const fnames = this.svc.searchFlags("aircraft/get_telemetry");
        if (fnames.length <= 0) return false;
        return this.svc.testFlags(fnames);
    }
    private onTelemetry() {
        const fnames = this.svc.searchFlags("aircraft/get_telemetry");
        this.telemetries = [];
        fnames.forEach((fname: string) => {
            const tres = this.svc.getAPIData(fname) as TelemetryAPIResponse;
            if (tres === undefined) return;
            const id = parseInt(fname.replace("aircraft/get_telemetry", ""));
            const t = new Telemetry(tres, id, `Plane ${id}`);
            this.telemetries.push(t);
        });
        this.planeMgrp.clearMarkers();
        this.telemetries.forEach((t: Telemetry) => {
            const m = new Marker(t.currLat, t.currLon, t.id, t.name);
            m.alt = t.currAlt;
            m.hdg = t.currHdg;
            this.planeMgrp.updateMarker(m);
        });
        if (this.selectedMission) {
            const lead_id = this.selectedMission.lead_id;
            this.planeMgrp.setColor(lead_id, Color.Red);
            const lead_path_data = this.selectedMission.lead_path; // array of {alt lat lon toa}
            const localPaths = [...this.paths];
            this.paths = [];
            let pathIdx = localPaths.findIndex((p: Path) => p.id === lead_id);
            if (pathIdx >= 0) {
                localPaths[pathIdx].clear();
            } else {
                localPaths.push(new Path(lead_id));
                pathIdx = localPaths.length - 1;
            }
            localPaths[pathIdx].addPoints(lead_path_data.map((d: {alt: number, lat: number, lon: number}) => new Point(d.lat, d.lon)));
            this.paths = [...localPaths];
        }
        this.svc.unsetFlags(fnames);
    }
    constructor(private svc: AppService) {
        this._rtos.addTask(() => this.fetchStates(), {
            priority: 1, // low priority
            intervalMs: 1000,
            missedPolicy: MissedDeadlinePolicy.RUN_ONCE,
        });
        this._rtos.addTask(() => this.runningAirIds?.forEach((id: number) => this.svc.callAPIWithCache(`aircraft/get_telemetry`, id)), {
            priority: 2, // higher priority than fetchStates
            intervalMs: 100,
            missedPolicy: MissedDeadlinePolicy.RUN_ONCE,
        });
        this._rtos.addTask(() => this.shaderHost?.drawFrame(), { // normal task
            priority: 2,
            deadlineMs: 30,
        });
        this._rtos.addInterrupt(() => this.svc.testFlags(this.stateApis), () => this.onStates());
        this._rtos.addInterrupt(() => this.isFetchingListApis.value, () => this.listApis.forEach((api: string) => this.svc.callAPIWithCache(api)));
        this._rtos.addInterrupt(() => this.svc.testFlags(this.listApis), () => this.onListData());
        this._rtos.addInterrupt(() => this.telemetryTrigger(), () => this.onTelemetry(), 2); // higher priority
    }
    
    ngOnInit(): void {
        this._rtos.start();
        this.isFetchingListApis.reset(true);
    }
    ngOnDestroy(): void {
        this._rtos.stop();
        console.log("RTOS stopped");
        console.log(this._rtos.stats);
    }
    onPlaneSelected(indices: Array<number>) {
        this.editableTelemetryIndices = indices;
    }
    onMissionSelected(event: any) {
        this.selectedMission = event;
        console.log(this.selectedMission);
    }
    onFgToggle(change: Change) {
        this.fgEnabled = change.newValue;
        this.svc.callAPI("sim/fgenable", this.popup, { fg_enable: this.fgEnabled });
    }
    onRefreshData() {
        this.isFetchingListApis.reset();
    }
    onLaunch() {
        if (!this.selectedMission) {
            alert("Please select a mission first.");
            return;
        }
        if (this.launchText.includes("Launch")) {
            this.svc.callAPI("mission/start", this.popup, this.selectedMission.id);
        } else {
            this.svc.callAPI("mission/start", this.popup, this.selectedMission.id);
        }
    }
    onSigLoss() {
        const isRunning = this.sigLossText.includes("Block");
        if (isRunning) {
            this.svc.callAPI("mission/stop", this.popup);
        } else {
            this.svc.callAPI("mission/start", this.popup, this.selectedMission.id);
        }
    }
    onStop() {
        this.svc.callAPI("sim/stop", this.popup);
    }
}