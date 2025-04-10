import { Component, ViewChild, OnInit, OnDestroy, AfterViewInit, ElementRef } from "@angular/core";
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
import { RenderPipeline, RenderHelper, UniformRecord, ProgramSource, PassSource } from "../../../utils/gpu/gpu";

@Component({
    selector: 'page-test',
    // imports: [WebGLShaderHostComponent],
    templateUrl: 'test.html'
})
export class TestPage implements AfterViewInit, OnDestroy {
    private _gl!: WebGL2RenderingContext;
    private _pipeline!: RenderPipeline;
    private _startTimeMs: number = 0;
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
            p.setPasses([
                { name: "raymarch" }, // render to texture
                { name: "obj3d" }, // render to texture
                // { name: "hud2d" }, // render to canvas
            ], true);
            p.setAttribute("a_position", {
                buffer: RenderHelper.createBuffer(gl, new Float32Array([
                    -1, -1, 1, -1, -1,  1, 1,  1 // quad
                ])),
                size: 2, // 2 components per vertex
            });
            p.setIndexBuffer(RenderHelper.createBuffer(gl, new Uint16Array([
                0, 1, 2, // first triangle
                2, 1, 3 // second triangle
            ]), gl.ELEMENT_ARRAY_BUFFER), gl.UNSIGNED_SHORT, 6);
            this._startTimeMs = Date.now();
            this.drawFrame();
        });
    }
    ngOnDestroy(): void {
        this._pipeline.dispose();
        console.log("Pipeline destroyed");
    }
    private drawFrame(): void {
        if (!this._pipeline) return;
        const now = Date.now();
        const dt = now - this._startTimeMs;
        const resolution = [this.canvasRef.nativeElement.clientWidth, this.canvasRef.nativeElement.clientHeight];
        const uniforms: UniformRecord = {
            "u_resolution": resolution,
            "u_time": dt,
        };
        this._pipeline.setGlobalUniforms(uniforms);
        this._pipeline.renderAll();
        // requestAnimationFrame(() => this.drawFrame());
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