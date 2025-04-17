import { Component, ViewChild, OnDestroy, AfterViewInit, ElementRef } from "@angular/core";
// import { WebGLShaderHostComponent } from "../../../components/webglshaderhost/webglshaderhost";
// import { RTOS } from "../../../utils/rtos/rtos";
// import { AU, SUNR } from "../../../utils/geo/helper";
// import { Earth } from "../../../utils/geo/earth_old";
// import { ObserverOnEarth } from "../../../utils/geo/observer_old";
// import { Vec3 } from "../../../utils/vec/vec3";
// import { Queue } from "../../../utils/queue/q";
// import { MissedDeadlinePolicy } from "../../../utils/rtos/rtostypes";
// import { UniformDict, UniformTexture, UniformTextureArray, UniformVec2, UniformVec3, UniformVec3Array } from "../../../utils/gpu/uniform";
// import { KeyController } from "../../../utils/controller/keyctrl";
// import { MapTiler } from "../../../utils/api/maptiler";
// import { env } from "../../app.config";
import { RenderPipeline, RenderHelper, UniformRecord, ProgramSource, PassSource } from "../../../utils/gpu";
import { Queue } from "../../../utils/src/ds/q";
import { Attitude, GeodeticCoords, LocalCoordsType } from "../../../utils/geo";
import { AppService } from "../../app.service";
import { GeoCam } from "../../../utils/src/geo/cam";

@Component({
    selector: 'page-test',
    // imports: [WebGLShaderHostComponent],
    templateUrl: 'test.html'
})
export class TestPage implements AfterViewInit, OnDestroy {
    private _gl!: WebGL2RenderingContext;
    private _pipeline!: RenderPipeline;
    private _startTimeMs: number = 0;
    private _frameTimeQ: Queue<number> = new Queue<number>(32);
    private _lastFrameTime: number = Date.now();
    private _running: boolean = false;
    private _lastIntFps: number = 0;
    private _geoCoords: GeodeticCoords = [0, 0, 1000]; // longitude, latitude, altitude
    private _attitude: Attitude = [0, 0, 0]; // roll, pitch, yaw
    private fpsText: string = "FPS: 0.00";
    private attText: string = "Attitude: [0, 0, 0]";
    private coordsText: string = "Coords: [0, 0, 0]";
    public get Text(): string {
        return this.fpsText + "\n" + this.attText + "\n" + this.coordsText;
    }
    constructor(private _svc: AppService) {}
    @ViewChild('canvas', {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
    ngAfterViewInit(): void {
        const gl: WebGL2RenderingContext = this.canvasRef.nativeElement.getContext("webgl2") as WebGL2RenderingContext;
        if (!gl) {
            console.error("WebGL2 not supported");
            return;
        }
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
            this._running = true;
            this.drawFrame();
        });
    }
    ngOnDestroy(): void {
        this._running = false;
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
        if (!this._pipeline) return;
        const resolution = [this.canvasRef.nativeElement.clientWidth, this.canvasRef.nativeElement.clientHeight];
        const minres = Math.min(...resolution);
        const scale = [resolution[0] / minres, resolution[1] / minres];
        this.controllerUpdate();
        const cam = new GeoCam(this._geoCoords, this._attitude, LocalCoordsType.NED);
        const epos = cam.ecefToCamFrame([0, 0, 0]); // earth position in camera frame
        // console.log(`Epos: [${epos[0].toFixed(2)}, ${epos[1].toFixed(2)}, ${epos[2].toFixed(2)}]`);
        // const epos = [0, 16371000, 0]; // earth position in camera frame
        const globalUniforms: UniformRecord = {
            "u_scale": scale,
        };
        const uniforms: Record<string, UniformRecord> = {
            "raymarch": {
                "u_fov": [Math.PI / 3, Math.PI / 3], // field of view of 60 degrees
                "u_minres": minres, // minimum resolution
                "u_sundir": [Math.sqrt(3) / 2, 0, 0.5], // sun direction in observer frame
                "u_epos": epos, // earth position in observer frame
                "u_escale": 1e-6, // scale factors for earth and sun
            },
        };
        this._pipeline.setGlobalUniforms(globalUniforms);
        this._pipeline.renderAll(uniforms);
        this.updateText();
        if (this._running) requestAnimationFrame(() => this.drawFrame());
        else this._pipeline.dispose();
    }
    private controllerUpdate(): void {
        // update attitude based on key presses
        if (this._svc.keyCtrl.getKeyState("a")) this._attitude[2] -= 0.01; // yaw left
        if (this._svc.keyCtrl.getKeyState("d")) this._attitude[2] += 0.01; // yaw right
        if (this._svc.keyCtrl.getKeyState("w")) this._attitude[1] -= 0.01; // pitch up
        if (this._svc.keyCtrl.getKeyState("s")) this._attitude[1] += 0.01; // pitch down
        if (this._svc.keyCtrl.getKeyState("q")) this._attitude[0] -= 0.01; // roll left
        if (this._svc.keyCtrl.getKeyState("e")) this._attitude[0] += 0.01; // roll right
        // update geodetic coordinates based on key presses
        if (this._svc.keyCtrl.getKeyState("ArrowUp")) this._geoCoords[1] += 0.01; // move north
        if (this._svc.keyCtrl.getKeyState("ArrowDown")) this._geoCoords[1] -= 0.01; // move south
        if (this._svc.keyCtrl.getKeyState("ArrowLeft")) this._geoCoords[0] -= 0.01; // move west
        if (this._svc.keyCtrl.getKeyState("ArrowRight")) this._geoCoords[0] += 0.01; // move east
        if (this._svc.keyCtrl.getKeyState("Shift")) this._geoCoords[2] -= 0.01; // move down
        if (this._svc.keyCtrl.getKeyState(" ")) this._geoCoords[2] += 0.01; // move up
    }
    private fixedFloats(arr: number[], digits: number = 4): string[] {
        return arr.map((v) => v.toFixed(digits));
    }
    private toDegs(arr: number[]): string[] {
        return arr.map((v) => (v * 180 / Math.PI).toFixed(2) + "°");
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
        this.coordsText = `Coords: [${this.fixedFloats(this._geoCoords).join(", ")}]`;
        this.attText = `Attitude: [${this.toDegs(this._attitude).join(", ")}]`;
    }
}

// export class TestPage implements OnInit, OnDestroy {
//     private lift = 0.0; // changes pitch
//     private tilt = 0.0; // changes roll
//     private turn = 0.0; // changes yaw
//     uniforms: UniformDict = {}
//     private _rtos: RTOS = new RTOS({
//         cycleIntervalMs: 100,
//         continueAfterInterrupt: true,
//         timeSlicePerCycle: true,
//         useAnimationFrame: true,
//     });
//     private mapTiler = new MapTiler(env.mapKey);
//     private frameTimeQ: Queue<number> = new Queue<number>();
//     private lastFrameTime: number = Date.now();
//     private lastIntFps: number = 0;
//     private frameCount: number = 0;
//     private keyCtrl: KeyController = new KeyController();
//     private lng = 103.85; // longitude changes 10 degrees per second
//     private lat = 1.2900; // latitude is fixed at the equator
//     private alt = 6371;
//     @ViewChild(WebGLShaderHostComponent) shaderHost?: WebGLShaderHostComponent;
//     private draw() {
//         if (!this.shaderHost) return;
//         const obs = this.updatePos();
//         this.updateUniforms(obs);
//         this.shaderHost.drawFrame();
//         const now = Date.now();
//         const diff = now - this.lastFrameTime;
//         this.frameTimeQ.enqueue(diff);
//         this.lastFrameTime = now;
//         const fps = 1000 / this.frameTimeQ.average();
//         const intfps = Math.floor(fps);
//         this.frameCount++;
//         if (intfps !== this.lastIntFps && this.frameCount % intfps === 0) {
//             this.lastIntFps = intfps;
//             console.log(`FPS: ${fps.toFixed(2)}`);
//         }
//     }
//     private updatePos(): ObserverOnEarth {
//         const observer = new ObserverOnEarth(this.lng, this.lat, this.alt); // updated each cycle
//         observer.transform(this.tilt, this.lift, this.turn); // updated each cycle
//         if (this.keyCtrl.getKeyState("w")) observer.forward(2000); // move forward 1 km
//         if (this.keyCtrl.getKeyState("s")) observer.forward(-2000); // move backward 1 km
//         if (this.keyCtrl.getKeyState("a")) this.turn -= 0.1;
//         if (this.keyCtrl.getKeyState("d")) this.turn += 0.1;
//         if (this.keyCtrl.getKeyState("q")) this.tilt -= 1000;
//         if (this.keyCtrl.getKeyState("e")) this.tilt += 1000;
//         if (this.keyCtrl.getKeyState(" ")) this.lift += 0.01;
//         if (this.keyCtrl.getKeyState("Shift")) this.lift -= 0.01;
//         const lnglatalt = Earth.getLngLatAlt(observer.oposE);
//         this.lng = lnglatalt[0];
//         this.lat = lnglatalt[1];
//         this.alt = lnglatalt[2];
//         if (this.keyCtrl.getKeyState("r")) this.alt /= 0.99;
//         if (this.keyCtrl.getKeyState("f")) this.alt *= 0.99;
//         return observer;
//     }
//     data = {alt: 0, tiles: 0, sider: 0, z: 0};
//     private updateUniforms(observer: ObserverOnEarth) {
//         const msInMin = 60 * 1000; // number of milliseconds in a minute
//         const dt = new Date(Math.round(Date.now() / msInMin) * msInMin); // round to the nearest minute
//         const sunVec = Earth.getSunPositionVector(dt); // updated only in a minute
//         const z = this.mapTiler.alt2z(this.alt); // zoom level
//         const scaleR = -this.lift * Math.tan(observer.estm_raylen); // scale factor for the observer's offset
//         const sideR = 0.5 * Math.pow(2, 23) * this.alt / observer.RE; // side length of tile in meters
//         const aggr: Function = (l: number) => {
//             const cl = Math.cos(this.lift);
//             if (cl === 0) return this.alt;
//             return l * cl;
//         }
//         const lkat = observer.lookingAtLngLatAlt(aggr, false); // looking at lng, lat, alt
//         const off = observer.offset(sideR); // offset from the observer
//         // const mts = this.mapTiler.autoTiles(this.lng, this.lat, this.alt); // get the urls
//         const mts = this.mapTiler.autoCenterTiles(lkat.x, lkat.y, this.alt); // get the urls
//         // const mts = this.mapTiler.autoTiles(off.x, off.y, Math.max(off.z, this.alt)); // get the urls
//         const textures = mts.map((t, i) => new UniformTexture(t.url, i)); // create textures
//         const xyzs = mts.map((t) => new UniformVec3(t.xyz));
//         const new_uniforms = {
//             u_fov: new UniformVec2([Math.PI / 3, Math.PI / 3]), // field of view of 60 degrees
//             u_ses: new UniformVec2([1e-6, 1e-9]), // scale factors for earth and sun
//             u_srd: new UniformVec2([SUNR, Earth.sunEclipticCoords.DS_AU * AU]), // sun radius and distance to the sun in meters
//             u_epos: new UniformVec3(observer.E2O_p(new Vec3()).ToArray()), // earth position in observer frame
//             u_sundir: new UniformVec3(observer.E2O_v(sunVec).ToArray()), // sun direction in observer frame
//             u_ex: new UniformVec3(observer.eX.ToArray()), // earth's front in observer frame
//             u_ey: new UniformVec3(observer.eY.ToArray()), // earth's right in observer frame
//             u_ez: new UniformVec3(observer.eZ.ToArray()), // earth's up in observer frame
//             u_tx: new UniformTextureArray(textures, 1), // textures of map tiles
//             u_txyz: new UniformVec3Array(xyzs), // xyz of map tiles
//             u_ntx: xyzs.length, // number of tiles
//             u_gridl: 1, // grid level
//         };
//         this.uniforms = new_uniforms;
//         if (this.data.alt !== this.alt || this.data.tiles !== mts.length || this.data.sider !== sideR || this.data.z !== z) {
//             this.data.z = z;
//             this.data.sider = sideR;
//             this.data.alt = this.alt;
//             this.data.tiles = mts.length;
//             console.log(`Alt: ${this.alt.toFixed(0)}, Tiles: ${mts.length}, Side: ${sideR.toFixed(0)}, Z: ${z}`);
//         }
//     }
//     constructor() {
//         this._rtos.addTask(() => this.draw(), {
//             name: "Draw",
//             priority: 1,
//             intervalMs: 10,
//             missedPolicy: MissedDeadlinePolicy.RUN_ONCE,
//         });
//     }

//     ngOnInit(): void {
//         this._rtos.start();
//     }

//     ngOnDestroy(): void {
//         this._rtos.stop();
//         console.log(this._rtos.stats);
//     }
// }