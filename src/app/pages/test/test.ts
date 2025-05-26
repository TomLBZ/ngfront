import { Component, ViewChild, OnDestroy, AfterViewInit, ElementRef } from "@angular/core";
import { RenderPipeline, RenderHelper, UniformRecord } from "../../../utils/gpu";
import { Queue } from "../../../utils/src/ds/q";
import { Attitude, GeodeticCoords, CoordsFrameType } from "../../../utils/geo";
import { AppService } from "../../app.service";
import { GeoCam } from "../../../utils/src/geo/cam";

@Component({
    selector: 'page-test',
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
        const cam = new GeoCam(this._geoCoords, this._attitude, CoordsFrameType.ENU);
        const epos = cam.ecefToCamFrame([0, 0, 0]); // earth position in camera frame
        // const epos = [0, -16371000, 0]; // earth position in camera frame
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
        if (this._svc.keyCtrl.getKeyState("w")) this._attitude[1] += 0.01; // pitch up
        if (this._svc.keyCtrl.getKeyState("s")) this._attitude[1] -= 0.01; // pitch down
        if (this._svc.keyCtrl.getKeyState("q")) this._attitude[0] -= 0.01; // roll left
        if (this._svc.keyCtrl.getKeyState("e")) this._attitude[0] += 0.01; // roll right
        // update geodetic coordinates based on key presses
        if (this._svc.keyCtrl.getKeyState("ArrowUp")) this._geoCoords[1] += 0.1; // move north
        if (this._svc.keyCtrl.getKeyState("ArrowDown")) this._geoCoords[1] -= 0.1; // move south
        if (this._svc.keyCtrl.getKeyState("ArrowLeft")) this._geoCoords[0] -= 0.1; // move west
        if (this._svc.keyCtrl.getKeyState("ArrowRight")) this._geoCoords[0] += 0.1; // move east
        if (this._svc.keyCtrl.getKeyState("Shift")) this._geoCoords[2] -= 0.1; // move down
        if (this._svc.keyCtrl.getKeyState(" ")) this._geoCoords[2] += 0.1; // move up
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