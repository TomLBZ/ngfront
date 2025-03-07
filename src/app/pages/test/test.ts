import { Component, ViewChild, OnInit, OnDestroy } from "@angular/core";
import { WebGLShaderHostComponent, UniformDict } from "../../../components/webglshaderhost/webglshaderhost";
import { RTOS } from "../../../utils/rtos/rtos";
import { AU, c, Earth, ObserverOnEarth, SUNR } from "../../../utils/geo/geo";
import { OnceFunction } from "../../../utils/once/once";
import { Vec3 } from "../../../utils/vec/vec3";
import { Queue } from "../../../utils/queue/q";
import { MissedDeadlinePolicy } from "../../../utils/rtos/rtostypes";
import { GeoZones } from "../../../utils/geo/zone";
import { CreateUniformVec, UniformTexture, UniformTextureArray, UniformVec2, UniformVec3 } from "../../../utils/uniform/u";

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
    private dayzones = new GeoZones<UniformTexture>(4, 2);
    private nightzones = new GeoZones<UniformTexture>(4, 2);
    private loadZones: OnceFunction = new OnceFunction(() => {
        for (let i = 0; i < 8; i++) { // 0 to 7
            this.dayzones.bindData(i, new UniformTexture(`textures/day/${i + 1}.jpg`, i));
            this.nightzones.bindData(i, new UniformTexture(`textures/night/${i + 1}.jpg`, i + 8));
        }
    });
    private frameTimeQ: Queue<number> = new Queue<number>();
    private lastFrameTime: number = Date.now();
    private lastIntFps: number = 0;
    private frameCount: number = 0;
    @ViewChild(WebGLShaderHostComponent) shaderHost?: WebGLShaderHostComponent;
    private draw() {
        if (!this.shaderHost) return;
        this.loadZones.call(); // load zones only once
        this.updateUniforms();
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
    private updateUniforms() {
        const msInMin = 60 * 1000; // number of milliseconds in a minute
        const dt = new Date(Math.round(Date.now() / msInMin) * msInMin); // round to the nearest minute
        const sunVec = Earth.getSunPositionVector(dt); // updated only in a minute
        const lng = Date.now() / 100 % 360 - 180; // longitude changes 10 degrees per second
        const lat = 0.0; // latitude is fixed at the equator
        const alt = 6371000;
        const observer = new ObserverOnEarth(lng, lat, alt); // updated each cycle
        observer.transform(this.tilt, this.lift, this.turn); // updated each cycle
        const eScale = 1e-6; // scale for earth related values
        const sScale = 1e-9; // scale for sun related values
        const rE = Earth.getRadius(lat) * eScale; // in million meters
        const dS = Earth.R_AU * AU * sScale; // in million meters
        const texids = this.dayzones.getDualZoneIds(lng, lat); // get the zone id
        const cid = texids.shift() as number; // get the center zone id
        const tc: Array<UniformTexture> = [this.dayzones.getData(cid), this.nightzones.getData(cid)];
        const ad = texids.map((id) => this.dayzones.getData(id));
        const an = texids.map((id) => this.nightzones.getData(id));
        const new_uniforms = {
            u_epos: new UniformVec3(observer.E2O_p(new Vec3()).mul(eScale).ToArray()),
            u_sundir: new UniformVec3(observer.E2O_v(sunVec).ToArray()),
            u_ex: new UniformVec3(observer.eX.ToArray()),
            u_ey: new UniformVec3(observer.eY.ToArray()),
            u_ez: new UniformVec3(observer.eZ.ToArray()),
            u_rE: rE,
            u_dS: dS,
            u_rS: SUNR * sScale,
            u_texzones: new UniformVec2(this.dayzones.zones.ToArray()),
            u_tids: CreateUniformVec([cid, ...texids]),
            u_tc: new UniformTextureArray(tc, 0),
            u_ad: new UniformTextureArray(ad, 1),
            u_an: new UniformTextureArray(an, 2),
        };
        this.uniforms = new_uniforms;
        // console.log("TexIDs: ", texids); // should be 0, 1, 2, 3
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