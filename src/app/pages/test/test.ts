import { Component, ViewChild, OnInit, OnDestroy } from "@angular/core";
import { WebGLShaderHostComponent, UniformDict, Texture } from "../../../components/webglshaderhost/webglshaderhost";
import { RTOS } from "../../../utils/rtos/rtos";
import { AU, Earth, ObserverOnEarth, SUNR } from "../../../utils/geo/geo";
import { OnceFunction } from "../../../utils/once/once";
import { Vec3 } from "../../../utils/vec/vec3";

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
    private _dayTexture: Texture | null = null;
    private _nightTexture: Texture | null = null;
    private loadTextures: OnceFunction = new OnceFunction(() => {
        // TOSO: load small high res patches of the earth instead of the whole texture
        this.shaderHost?.loadTexture("assets/8081_earthmap4k.jpg").then((t) => this._dayTexture = new Texture(t, 0));
        this.shaderHost?.loadTexture("assets/8081_earthlights4k.jpg").then((t) => this._nightTexture = new Texture(t, 1));
    });
    @ViewChild(WebGLShaderHostComponent) shaderHost?: WebGLShaderHostComponent;
    private draw() {
        if (!this.shaderHost) return;
        if (!this._dayTexture || !this._nightTexture) {
            this.loadTextures.call();
            return;
        }
        this.updateUniforms();
        this.shaderHost.drawFrame();
    }
    private updateUniforms() {
        if (!this.shaderHost) return;
        const msInMin = 60 * 1000; // number of milliseconds in a minute
        const dt = new Date(Math.round(Date.now() / msInMin) * msInMin); // round to the nearest minute
        const sunVec = Earth.getSunPositionVector(dt); // updated only in a minute
        const lng = Date.now() / 1000 % 360; // longitude changes 10 degrees per second
        const lat = 0.0;
        const alt = 63710;
        const observer = new ObserverOnEarth(lng, lat, alt); // updated each cycle
        observer.transform(this.tilt, this.lift, this.turn); // updated each cycle
        const eScale = 1e-6; // scale for earth related values
        const sScale = 1e-9; // scale for sun related values
        const rE = Earth.getRadius(lat) * eScale; // in million meters
        const dS = Earth.R_AU * AU * sScale; // in million meters
        const new_uniforms = {
            u_epos: observer.E2O_p(new Vec3()).mul(eScale).ToArray(),
            u_ex: observer.eX.ToArray(),
            u_ey: observer.eY.ToArray(),
            u_ez: observer.eZ.ToArray(),
            u_sundir: observer.E2O_v(sunVec).ToArray(),
            u_rE: rE,
            u_dS: dS,
            u_rS: SUNR * sScale,
        }
        if (this._dayTexture) {
            (new_uniforms as any).u_dayTexture = this._dayTexture;
        }
        if (this._nightTexture) {
            (new_uniforms as any).u_nightTexture = this._nightTexture;
        }
        this.uniforms = new_uniforms;
    }
    constructor() {
        this._rtos.addTask(() => this.draw(), {
            name: "Draw",
            priority: 1,
            deadlineMs: 30,
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