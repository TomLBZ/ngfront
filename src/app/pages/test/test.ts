import { Component, ViewChild, OnInit, OnDestroy } from "@angular/core";
import { WebGLShaderHostComponent } from "../../../components/webglshaderhost/webglshaderhost";
import { RTOS } from "../../../utils/rtos/rtos";
import { AU, SUNR } from "../../../utils/geo/geo";
import { Earth } from "../../../utils/geo/earth";
import { ObserverOnEarth } from "../../../utils/geo/observer";
import { Vec3 } from "../../../utils/vec/vec3";
import { Queue } from "../../../utils/queue/q";
import { MissedDeadlinePolicy } from "../../../utils/rtos/rtostypes";
import { UniformDict, UniformTexture, UniformTextureArray, UniformVec2, UniformVec3, UniformVec4, UniformVec4Array } from "../../../utils/uniform/u";
import { KeyController } from "../../../utils/controller/keyctrl";
import { MapTiler } from "../../../utils/api/maptiler";
import { env } from "../../app.config";

@Component({
    selector: 'page-test',
    imports: [WebGLShaderHostComponent],
    templateUrl: 'test.html'
})
export class TestPage implements OnInit, OnDestroy {
    private lift = -1.57; // changes pitch
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
    private lat = 0.00; // latitude is fixed at the equator
    private alt = 637100;
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
        if (this.keyCtrl.getKeyState("r")) this.alt += 1000;
        if (this.keyCtrl.getKeyState("f")) this.alt -= 1000;
        return observer;
    }
    private bdCount = 0;
    private updateUniforms(observer: ObserverOnEarth) {
        const msInMin = 60 * 1000; // number of milliseconds in a minute
        const dt = new Date(Math.round(Date.now() / msInMin) * msInMin); // round to the nearest minute
        const sunVec = Earth.getSunPositionVector(dt); // updated only in a minute
        const eScale = 1e-6; // scale for earth related values
        const sScale = 1e-9; // scale for sun related values
        const rE = Earth.getRadius(this.lat) * eScale; // in million meters
        const dS = Earth.R_AU * AU * sScale; // in million meters
        const mts = this.mapTiler.autoTiles(this.lng, this.lat, this.alt, 2); // get the urls
        const textures = mts.map((t, i) => new UniformTexture(t.url, i)); // create textures
        const bounds = mts.map((t) => new UniformVec4([t.tl[0], t.tl[1], t.br[0], t.br[1]]));
        const new_uniforms = {
            u_epos: new UniformVec3(observer.E2O_p(new Vec3()).mul(eScale).ToArray()),
            u_sundir: new UniformVec3(observer.E2O_v(sunVec).ToArray()),
            u_ex: new UniformVec3(observer.eX.ToArray()),
            u_ey: new UniformVec3(observer.eY.ToArray()),
            u_ez: new UniformVec3(observer.eZ.ToArray()),
            u_rE: rE,
            u_dS: dS,
            u_rS: SUNR * sScale,
            u_tx: new UniformTextureArray(textures, 0),
            u_bd: new UniformVec4Array(bounds),
            u_nbd: bounds.length, // zoom level and number of skirts
        };
        if (this.bdCount !== new_uniforms.u_nbd) {
            console.log(new_uniforms.u_bd);
            this.bdCount = new_uniforms.u_nbd;
        }
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