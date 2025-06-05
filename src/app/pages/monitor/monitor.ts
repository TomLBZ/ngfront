import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { MarkerGroup } from '../../../utils/src/graphics/markergrp';
import { Icon } from '../../../utils/src/graphics/icon';
import { Color } from '../../../utils/src/graphics/color';
import { MapViewComponent } from '../../../components/mapview/mapview';
import { OutboxComponent } from '../../../components/outbox/outbox';
import { env } from '../../app.config';
import { RTOS } from '../../../utils/src/ctrl/rtos';
import { KeyControlMode, MissedDeadlinePolicy } from '../../../utils/ctrl';
import { AppService } from '../../app.service';
import { DropSelectComponent } from '../../../components/dropselect/dropselect';
import { AircraftMaxParams, APIResponse, Joystick } from '../../app.interface';
import { Marker } from '../../../utils/src/graphics/marker';
import { ObjEditorComponent } from '../../../components/obj_editor/obj_editor';
import { Path, PathStyle } from '../../../utils/graphics';
import { Point } from '../../../utils/src/ds/point';
import { Cache } from '../../../utils/src/ds/cache';
import { Waypoint, Mission, Telemetry } from '../../app.interface';
import { StructValidator } from '../../../utils/src/ds/validate';
import { Callback, DictN } from '../../../utils/types';
import { SliderComponent } from '../../../components/slider/slider';
import { RenderHelper, RenderPipeline, UniformRecord } from '../../../utils/gpu';
import { Queue } from '../../../utils/ds';
import { Attitude, CoordsFrameType, GeodeticCoords, GeoHelper } from '../../../utils/geo';
import { GeoCam } from '../../../utils/src/geo/cam';
import { dateToSunData, sunDataToSunPositionVectorEcef } from '../../../utils/src/geo/astro';
import { geodeticToECEF } from '../../../utils/src/geo/earth';
import { Angles } from '../../../utils/math';
interface LaunchSettings {
    fg_enable: boolean;
    joystick_enable: boolean;
}
interface RuntimeSettings {
    traces: number;
    lead_id: number;
}
@Component({
    selector: 'page-monitor',
    imports: [
        MapViewComponent, OutboxComponent, DropSelectComponent, ObjEditorComponent, SliderComponent
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
    private readonly r90deg: number = Math.PI / 2; // 90 degrees in radians
    private readonly _telemetries: Array<Telemetry> = [];
    private readonly _visibleTelemetryIndices: Array<number> = [];
    private websocket?: WebSocket;
    private void: Callback = () => {};
    private alert: Callback = (e: any) => { this.waiting = false; alert(e); };
    private _gl!: WebGL2RenderingContext;
    private _pipeline!: RenderPipeline;
    private _startTimeMs: number = 0;
    private _frameTimeQ: Queue<number> = new Queue<number>(32);
    private _lastFrameTime: number = Date.now();
    private _glRunning: boolean = false;
    private _lastIntFps: number = 0;
    private _geoCoords: GeodeticCoords = [0, 0, 1000]; // longitude, latitude, altitude
    private _attitude: Attitude = [0, 0, 0]; // roll, pitch, yaw
    private _yawN: number = 0; // heading in radians
    private _speed: number = 0; // speed value
    private fpsText: string = "FPS: 0.00";
    private attText: string = "Attitude: -";
    private coordsText: string = "Coords: -";
    private teleText: string = "Tele: -";
    private _maxParams: AircraftMaxParams = { max_altitude: 0, max_speed: 0 }; // max params for aircraft
    private get joystickStr() {
        return `Aileron: ${this.joystick.roll}, Elevator: ${this.joystick.pitch}, Throttle: ${this.joystick.throttle}`;
    }
    public get Text(): string {
        return this.fpsText + "\n" + this.attText + "\n" + this.coordsText + "\n" + this.teleText;
    }
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
    public get replaying(): boolean { return this._health.sim && this._health.mstatus === "REPLAY"; }
    public get stoppable(): boolean { return this._health.sim; } // can stop simulator when running
    public get telemetryEnabled(): boolean { return this._health.sim && this._health.mstatus !== "EXITED" && this.selectedMission !== undefined; }
    public get markerGroups(): Array<MarkerGroup> { return [this._wpGrp, this._planeMgrp]; }
    public get paths(): Array<Path> { return [this._mpath, ...this._ppaths]; }
    public get allPlaneIds(): Array<number> { return this.selectedMission !== undefined ? [this.selectedMission.lead_id, ...this.selectedMission.follower_ids] : [0]; }
    public get telemetryNames(): Array<string> { return this._telemetries.map((t: Telemetry) => `ID: ${t.id}`); }
    public get visibleTelemetries(): Array<Telemetry> { return this._visibleTelemetryIndices.map((i: number) => this._telemetries[i]); }
    public readonly idRepr: Function = (o: any) => `ID: ${o.id}`;
    public readonly nameRepr: Function = (o: any) => o.name;
    public readonly apiKey: string = env.mapKey;
    public readonly mapUrlBase: string = env.mapUrlBase;
    public readonly localMapUrlBase: string = env.localMapUrlBase;
    public readonly production: boolean = env.production;
    public missions: Array<Mission> = [];
    public launchSettings: LaunchSettings = { fg_enable: false, joystick_enable: false };
    public runtimeSettings: RuntimeSettings = { traces: 100, lead_id: 0 };
    public selectedMission?: Mission = undefined;
    public resetNeeded: boolean = false;
    public waiting: boolean = false;
    public joystick: Joystick = { roll: 500, pitch: 1000, throttle: 5000 };
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
        this._ppaths.forEach((p: Path) => p.clear()); // clear all plane paths
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
            else this._ppaths[pathIdx] = path; // update existing path
            if (isLeader) {
                this._geoCoords = [t.lon, t.lat, t.alt]; // update geo coords
                this._attitude = [t.roll, t.pitch, Angles.wrapRadPi(t.yaw - this.r90deg)]; // update attitude
                this._yawN = t.yaw; // update yaw from north
                this._speed = t.speed; // update speed
            }
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
                    this.launchSettings.joystick_enable = m.lead_mission_type === "JOYSTICK";
                    this.launchSettings = { ...this.launchSettings }; // trigger change detection
                    this.joystick = m.joystick_input ?? { roll: 500, pitch: 1000, throttle: 5000 }; // update joystick input
                    if (this.websocket === undefined) this.startTelemetry();
                }
                if (this.telemetryEnabled && this.launchSettings.joystick_enable) {
                    this._svc.callAPI("aircraft/maxparams", (d: any) => {
                        if (!StructValidator.hasFields(d, ["success", "data"])) return; // invalid data
                        const dd = d as APIResponse;
                        if (!dd.success) return; // skip when failed
                        if (!StructValidator.hasNonEmptyFields(dd.data, ["max_altitude", "max_speed"])) return; // invalid data
                        this._maxParams = dd.data as AircraftMaxParams; // update max params
                    }, m.lead_id, this.void);
                }
            }, undefined, this.void);
        }, undefined, this.void);
        if (!this._glRunning) {
            const gl = this.tryLoadGL();
            if (gl) this.onGlLoaded(gl);
        }
    }
    private updateJoystick() {
        this._svc.callAPI("sim/joystick", (d: any) => {
            if (!StructValidator.hasFields(d, ["success", "msg"])) alert("Failed to update joystick: Invalid Response!");
            else if (!(d as APIResponse).success) alert(`Failed to update joystick with ${this.joystickStr}!\n${d.msg}`);
        }, { id: this.selectedMission!.lead_id, joystick: this.joystick }, this.alert);
    }
    private keyUpdated(key: string) {
        if (!this.launchSettings.joystick_enable) return; // skip when joystick is disabled
        if (this.replaying) return; // skip when replaying
        switch (key) {
            case "w":
                this.joystick.throttle = Math.min(this.joystick.throttle + 100, 9600);
                break;
            case "s":
                this.joystick.throttle = Math.max(this.joystick.throttle - 100, 0);
                break;
            case "a":
                this.joystick.roll = Math.max(this.joystick.roll - 100, -9600);
                break;
            case "d":
                this.joystick.roll = Math.min(this.joystick.roll + 100, 9600);
                break;
            case "q":
                this.joystick.pitch = Math.max(this.joystick.pitch - 100, -9600);
                break;
            case "e":
                this.joystick.pitch = Math.min(this.joystick.pitch + 100, 9600);
                break;
            default:
                return; // skip when key is not valid
        }
        this.updateJoystick();
    }
    private setupPipeline(p: RenderPipeline): void {
        p.setPasses([
            { name: "raymarch" }, // render to texture
            { name: "obj3d" }, // render to texture
            { name: "hud2d" }, // render to canvas
        ], true);
        p.setAttribute("a_position", {
            buffer: RenderHelper.createBuffer(this._gl, new Float32Array([
                -1, -1, 1, -1, -1,  1, 1,  1 // quad
            ])),
            size: 2, // 2 components per vertex
        });
        p.setIndexBuffer(RenderHelper.createBuffer(this._gl, new Uint16Array([
            0, 1, 2, // first triangle
            2, 1, 3 // second triangle
        ]), this._gl.ELEMENT_ARRAY_BUFFER), this._gl.UNSIGNED_SHORT, 6);
    }
    private drawFrame(): void {
        if (this._pipeline) {
            if (this.canvasRef === undefined || this.canvasRef.nativeElement === undefined) { // canvas crashed
                this._glRunning = false; // canvas not ready
                this._pipeline.dispose();
                return; // skip rendering
            }
            const resolution = [this.canvasRef.nativeElement.clientWidth, this.canvasRef.nativeElement.clientHeight];
            const minres = Math.min(...resolution);
            const scale = [resolution[0] / minres, resolution[1] / minres];
            const cam = new GeoCam(this._geoCoords, this._attitude, CoordsFrameType.ENU);
            const epos = cam.ecefToCamFrame([0, 0, 0]); // earth position in camera frame
            const sunData = dateToSunData(new Date(Date.now()));
            const sunVec = sunDataToSunPositionVectorEcef(sunData);
            const sundir = GeoHelper.Normalize(cam.ecefToCamFrame(sunVec, false)); // sun direction in camera frame
            const attitude = [
                (this._attitude[0] / Math.PI * 1.5) + 0.5, // roll +-60 deg normalized to [0, 1]
                (this._attitude[1] / Math.PI * 1.5) + 0.5, // pitch +-60 deg normalized to [0, 1]
                (this._attitude[2] / Math.PI * 0.5) + 0.5, // yaw += 180 deg normalized to [0, 1]
            ]
            const state = [ // throttle, elevator, aileron, rudder
                this.joystick.throttle / 9600, // normalized to [0, 1]
                this.joystick.pitch / 19200 + 0.5, // normalized to [0, 1]
                this.joystick.roll / 19200 + 0.5, // normalized to [0, 1]
                0.5 // rudder is not used, set to 0.5
            ]
            const telemetry = [ // telemetry: speed, altitude
                this._speed / this._maxParams.max_speed, // speed 0-50m/s normalized to [0, 1]
                this._geoCoords[2] / this._maxParams.max_altitude, // altitude 0-10000m normalized to [0, 1]
            ]
            const missionWps: Array<number[]> = (this.selectedMission?.lead_path ?? [])
                .map((wp: Waypoint) => [wp.lon, wp.lat, wp.alt] as GeodeticCoords)
                .map((wp: GeodeticCoords) => cam.ecefToCamFrame(geodeticToECEF(...wp)));
            if (missionWps.length > 16) missionWps.length = 16; // limit to 16 waypoints
            const wpsArray = new Float32Array(16 * 3); // 16 waypoints, each with 3 coordinates
            missionWps.forEach((wp: number[], i: number) => {
                wpsArray.set(wp, i * 3); // set waypoint coordinates in the array
            });
            const globalUniforms: UniformRecord = {
                "u_scale": scale,
                "u_fov": [Math.PI / 3, Math.PI / 3], // field of view of 60 degrees
            };
            const uniforms: Record<string, UniformRecord> = {
                "raymarch": {
                    "u_minres": minres, // minimum resolution
                    "u_sundir": sundir, // sun direction in observer frame
                    "u_epos": epos, // earth position in observer frame
                    "u_escale": 1e-6, // scale factors for earth and sun
                }, // uniforms for raymarching
                "obj3d": {
                    "u_minres": minres, // minimum resolution
                    "u_sundir": sundir, // sun direction in observer frame
                    "u_wps": wpsArray, // waypoints in camera frame
                }, // uniforms for 3D object rendering
                "hud2d": {
                    "u_attitude": attitude, // attitude: roll, pitch, yaw
                    "u_state": state, // aircraft state: throttle, elevator, aileron, rudder
                    "u_telemetry": telemetry, // telemetry: speed, altitude
                    "u_wps": wpsArray, // waypoints in camera frame
                }, // uniforms for 2D HUD rendering
            };
            this._pipeline.setGlobalUniforms(globalUniforms);
            this._pipeline.renderAll(uniforms);
            this.updateText();
        }
        if (this._glRunning) requestAnimationFrame(() => this.drawFrame());
        else this._pipeline.dispose();
    }
    private updateText(): void {
        const now = Date.now();
        this._frameTimeQ.enqueue(now - this._lastFrameTime);
        this._lastFrameTime = now;
        const fps = 1000 / this._frameTimeQ.average();
        const intfps = Math.round(fps);
        if (intfps !== this._lastIntFps && this._frameTimeQ.size() === this._frameTimeQ.maxLength) {
            this._lastIntFps = intfps;
            this.fpsText = `FPS: ${fps.toFixed(2)}`;
        }
        this.coordsText = `Lng: ${this._geoCoords[0].toFixed(4)}°\nLat: ${this._geoCoords[1].toFixed(4)}°\nAlt: ${this._geoCoords[2].toFixed(2)}m`;
        const attStrs = this._attitude.map((v) => (v * 180 / Math.PI).toFixed(2) + "°");
        this.attText = `Roll: ${attStrs[0]}\nPitch: ${attStrs[1]}\nYaw: ${(this._yawN * 180 / Math.PI).toFixed(2)}°`;
        this.teleText = `Speed: ${this._speed.toFixed(2)}m/s`;
    }
    private onGlLoaded(gl: WebGL2RenderingContext): void {
        this._gl = gl;
        this._pipeline = new RenderPipeline(gl);
        this._pipeline.loadPrograms([
            { name: "raymarch", vertex: "/shaders/twotrig.vert", fragment: "/shaders/raymarch.frag", url: true},
            { name: "obj3d", vertex: "/shaders/twotrig.vert", fragment: "/shaders/obj3d.frag", url: true },
            { name: "hud2d", vertex: "/shaders/twotrig.vert", fragment: "/shaders/hud2d.frag", url: true },
        ]).then((p: RenderPipeline) => {
            this.setupPipeline(p);
            this._startTimeMs = Date.now();
            this._lastFrameTime = this._startTimeMs;
            this._glRunning = true;
            this.drawFrame();
        });
    }
    private tryLoadGL(): WebGL2RenderingContext | undefined {
        if (this.canvasRef === undefined || this.canvasRef === null) {
            return undefined; // canvas not ready
        }
        // check if canvasRef has a key called nativeElement
        if (this.canvasRef.hasOwnProperty('nativeElement') === false) {
            return undefined; // canvas not ready
        }
        if (this.canvasRef.nativeElement === undefined || this.canvasRef.nativeElement === null) {
            return undefined; // canvas not ready
        }
        const gl: WebGL2RenderingContext = this.canvasRef.nativeElement.getContext("webgl2") as WebGL2RenderingContext;
        if (!gl) {
            console.error("WebGL2 not supported");
            return undefined; // WebGL2 not supported
        }
        return gl; // WebGL2 supported
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
    @ViewChild('canvasgl', {static: false}) canvasRef!: ElementRef<HTMLCanvasElement>;
    ngOnInit(): void {
        this._svc.keyCtrl.setKeyCallback("w", () => this.keyUpdated("w"), KeyControlMode.EVENT_PRESS);
        this._svc.keyCtrl.setKeyCallback("s", () => this.keyUpdated("s"), KeyControlMode.EVENT_PRESS);
        this._svc.keyCtrl.setKeyCallback("a", () => this.keyUpdated("a"), KeyControlMode.EVENT_PRESS);
        this._svc.keyCtrl.setKeyCallback("d", () => this.keyUpdated("d"), KeyControlMode.EVENT_PRESS);
        this._svc.keyCtrl.setKeyCallback("q", () => this.keyUpdated("q"), KeyControlMode.EVENT_PRESS);
        this._svc.keyCtrl.setKeyCallback("e", () => this.keyUpdated("e"), KeyControlMode.EVENT_PRESS);
        this._rtos.start();
    }
    ngOnDestroy(): void {
        this._svc.keyCtrl.removeKeyCallback("w", KeyControlMode.EVENT_PRESS);
        this._svc.keyCtrl.removeKeyCallback("s", KeyControlMode.EVENT_PRESS);
        this._svc.keyCtrl.removeKeyCallback("a", KeyControlMode.EVENT_PRESS);
        this._svc.keyCtrl.removeKeyCallback("d", KeyControlMode.EVENT_PRESS);
        this._svc.keyCtrl.removeKeyCallback("q", KeyControlMode.EVENT_PRESS);
        this._svc.keyCtrl.removeKeyCallback("e", KeyControlMode.EVENT_PRESS);
        this._rtos.stop();
        this.stopTelemetry();
        console.log("RTOS stopped");
        console.log(this._rtos.stats);
        this._glRunning = false;
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
        if (newSettings.fg_enable !== this.launchSettings.fg_enable) {
            if (newSettings.fg_enable) {
                alert("Enabling FlightGear makes launching a mission takes very long, please be patient. We recommend disabling this option.");
            }
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
        }, { id: this.selectedMission!.id, params: this.launchSettings }, this.alert);
    }
    onSigLoss(resumable: boolean) {
        if (resumable) this._svc.callAPI("mission/start", () => alert("Signal resumed"), { id: this.selectedMission!.id, params: this.launchSettings }, alert);
        else this._svc.callAPI("mission/stop", () => alert("Signal blocked"), undefined, alert);
    }
    onStop() {
        this._svc.callAPI("sim/stop", (d: any) => {
            if (!StructValidator.hasFields(d, ["success", "msg"])) alert("Invalid response");
            else if (!(d as APIResponse).success) alert(d.msg); // not successful
            else this.stopTelemetry(); // stop telemetry when stopped successfully
        }, undefined, this.alert);
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
    onThrottleChanged(newThrottle: number) {
        newThrottle = Math.floor(newThrottle);
        if (newThrottle !== this.joystick.throttle) {
            this.joystick.throttle = newThrottle;
            this.updateJoystick();
        }
    }
    onElevatorChanged(newPitch: number) {
        newPitch = Math.floor(newPitch);
        if (newPitch !== this.joystick.pitch) {
            this.joystick.pitch = newPitch;
            this.updateJoystick();
        }
    }
    onAileronChanged(newRoll: number) {
        newRoll = Math.floor(newRoll);
        if (newRoll !== this.joystick.roll) {
            this.joystick.roll = newRoll;
            this.updateJoystick();
        }
    }
}