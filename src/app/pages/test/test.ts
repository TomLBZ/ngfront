import { Component, ViewChild, OnInit, OnDestroy } from "@angular/core";
import { WebGLShaderHostComponent } from "../../../components/webglshaderhost/webglshaderhost";
import { RTOS } from "../../../utils/rtos/rtos";
import { AU, SUNR } from "../../../utils/geo/geo";
import { Earth } from "../../../utils/geo/earth";
import { ObserverOnEarth } from "../../../utils/geo/observer";
import { Vec3 } from "../../../utils/vec/vec3";
import { Queue } from "../../../utils/queue/q";
import { MissedDeadlinePolicy } from "../../../utils/rtos/rtostypes";
import { UniformDict, UniformTexture, UniformTextureArray, UniformVec2, UniformVec2Array, UniformVec3, UniformVec3Array } from "../../../utils/uniform/u";
import { KeyController } from "../../../utils/controller/keyctrl";
import { MapTiler } from "../../../utils/api/maptiler";
import { env } from "../../app.config";

@Component({
    selector: 'page-test',
    imports: [WebGLShaderHostComponent],
    templateUrl: 'test.html'
})
export class TestPage implements OnInit, OnDestroy {
    private lift = 0.0; // changes pitch
    private tilt = 0.0; // changes roll
    private turn = 0.0; // changes yaw
    uniforms: UniformDict = {}
    private _rtos: RTOS = new RTOS({
        cycleIntervalMs: 100,
        continueAfterInterrupt: true,
        timeSlicePerCycle: true,
        useAnimationFrame: true,
    });
    private mapTiler = new MapTiler(env.mapKey);
    private frameTimeQ: Queue<number> = new Queue<number>();
    private lastFrameTime: number = Date.now();
    private lastIntFps: number = 0;
    private frameCount: number = 0;
    private keyCtrl: KeyController = new KeyController();
    private lng = 103.85; // longitude changes 10 degrees per second
    private lat = 1.2900; // latitude is fixed at the equator
    private alt = 6371;
    @ViewChild(WebGLShaderHostComponent) shaderHost?: WebGLShaderHostComponent;
    private draw() {
        if (!this.shaderHost) return;
        const obs = this.updatePos();
        this.updateUniforms(obs);
        this.shaderHost.drawFrame();
        const now = Date.now();
        const diff = now - this.lastFrameTime;
        this.frameTimeQ.enqueue(diff);
        this.lastFrameTime = now;
        const fps = 1000 / this.frameTimeQ.average();
        const intfps = Math.floor(fps);
        this.frameCount++;
        if (intfps !== this.lastIntFps && this.frameCount % intfps === 0) {
            this.lastIntFps = intfps;
            console.log(`FPS: ${fps.toFixed(2)}`);
        }
    }
    private updatePos(): ObserverOnEarth {
        const observer = new ObserverOnEarth(this.lng, this.lat, this.alt); // updated each cycle
        observer.transform(this.tilt, this.lift, this.turn); // updated each cycle
        if (this.keyCtrl.getKeyState("w")) observer.forward(1000); // move forward 1 km
        if (this.keyCtrl.getKeyState("s")) observer.forward(-1000); // move backward 1 km
        if (this.keyCtrl.getKeyState("a")) this.turn -= 0.1;
        if (this.keyCtrl.getKeyState("d")) this.turn += 0.1;
        if (this.keyCtrl.getKeyState("q")) this.tilt -= 1000;
        if (this.keyCtrl.getKeyState("e")) this.tilt += 1000;
        if (this.keyCtrl.getKeyState(" ")) this.lift += 0.01;
        if (this.keyCtrl.getKeyState("Shift")) this.lift -= 0.01;
        const lnglatalt = Earth.getLngLatAlt(observer.oposE);
        this.lng = lnglatalt[0];
        this.lat = lnglatalt[1];
        this.alt = lnglatalt[2];
        if (this.keyCtrl.getKeyState("r")) this.alt /= 0.99;
        if (this.keyCtrl.getKeyState("f")) this.alt *= 0.99;
        return observer;
    }
    private updateUniforms(observer: ObserverOnEarth) {
        const msInMin = 60 * 1000; // number of milliseconds in a minute
        const dt = new Date(Math.round(Date.now() / msInMin) * msInMin); // round to the nearest minute
        const sunVec = Earth.getSunPositionVector(dt); // updated only in a minute
        const aggressionFunc: Function = (r: number) => {
            const compression = Math.pow(r / observer.alt, 1 / 2);
            return compression * observer.alt; // aggression function
        };
        const estm_mp = observer.lookingAtLngLatAlt(aggressionFunc, true); // estimated midpoint of the view
        const tiledist = Math.max(estm_mp.z, observer.alt); // distance to the tile in meters
        const mts = this.mapTiler.autoTiles(estm_mp.x, estm_mp.y, tiledist, 3); // get the urls
        const textures = mts.map((t, i) => new UniformTexture(t.url, i)); // create textures
        const xyzs = mts.map((t) => new UniformVec3(t.xyz));
        const new_uniforms = {
            u_ses: new UniformVec2([1e-6, 1e-9]), // scale factors for earth and sun
            u_srd: new UniformVec2([SUNR, Earth.DS_AU * AU]), // sun radius and distance to the sun in meters
            u_epos: new UniformVec3(observer.E2O_p(new Vec3()).ToArray()), // earth position in observer frame
            u_sundir: new UniformVec3(observer.E2O_v(sunVec).ToArray()), // sun direction in observer frame
            u_ex: new UniformVec3(observer.eX.ToArray()), // earth's front in observer frame
            u_ey: new UniformVec3(observer.eY.ToArray()), // earth's right in observer frame
            u_ez: new UniformVec3(observer.eZ.ToArray()), // earth's up in observer frame
            u_tx: new UniformTextureArray(textures, 0), // textures of map tiles
            u_txyz: new UniformVec3Array(xyzs), // bounds of map tiles
            u_ntx: xyzs.length, // number of tile bounds
            u_gridl: 1, // grid level
        };
        this.uniforms = new_uniforms;
    }
    constructor() {
        this._rtos.addTask(() => this.draw(), {
            name: "Draw",
            priority: 1,
            intervalMs: 10,
            missedPolicy: MissedDeadlinePolicy.RUN_ONCE,
        });
    }

    ngOnInit(): void {
        this._rtos.start();
    }

    ngOnDestroy(): void {
        this._rtos.stop();
        console.log(this._rtos.stats);
    }
}