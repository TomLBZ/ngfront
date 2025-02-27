import { Component, ViewChild, OnInit, OnDestroy } from "@angular/core";
import { WebGLShaderHostComponent, UniformDict } from "../../../components/webglshaderhost/webglshaderhost";
import { RTOS } from "../../../utils/rtos/rtos";
import { Earth, ObserverOnEarth } from "../../../utils/geo/geo";

@Component({
    selector: 'page-test',
    imports: [WebGLShaderHostComponent],
    templateUrl: 'test.html'
})
export class TestPage implements OnInit, OnDestroy {
    private lift = 0.01; // changes pitch
    private tilt = 0.01; // changes roll
    private turn = 0.01; // changes yaw
    uniforms: UniformDict = {
        u_time: 0,
        u_campos: [0, 0, 0],
        u_camdir: [0, 0, 1],
        u_camright: [1, 0, 0],
        u_camup: [0, 1, 0],
        u_sundir: [1, 1, 1],
        u_RE: 6371000,
        u_RAU: 1.0,
    }
    private _rtos: RTOS = new RTOS({
        cycleIntervalMs: 100,
        continueAfterInterrupt: true,
        timeSlicePerCycle: true,
        useAnimationFrame: true,
    });
    @ViewChild(WebGLShaderHostComponent) shaderHost?: WebGLShaderHostComponent;
    private draw() {
        if (!this.shaderHost) return;
        this.updateUniforms();
        this.shaderHost.drawFrame();
    }
    private updateUniforms() {
        if (!this.shaderHost) return;
        const t_s = performance.now() / 1000;
        const msInMin = 60 * 1000; // number of milliseconds in a minute
        const dt = new Date(Math.round(Date.now() / msInMin) * msInMin); // round to the nearest minute
        const sunVec = Earth.getSunPositionVector(dt); // updated only in a minute
        const lng = 103.822872;
        const lat = 1.364917;
        const alt = 6000;
        const observer = new ObserverOnEarth(lng, lat, alt); // updated each cycle
        observer.transform(this.tilt, this.lift, this.turn); // updated each cycle
        const camPos = observer.position;
        const camDir = observer.front;
        const camRight = observer.right;
        const camUp = observer.up;
        const rE = Earth.getRadius(lat);
        const rAU = Earth.R_AU;
        const new_uniforms = {
            u_time: t_s,
            u_campos: camPos.div(1000.0).ToArray(),
            u_camdir: camDir.ToArray(),
            u_camright: camRight.ToArray(),
            u_camup: camUp.ToArray(),
            u_sundir: sunVec.ToArray(),
            u_RE: rE,
            u_RAU: rAU,
        }
        console.log(new_uniforms.u_campos);
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
        console.log("RTOS stopped");
        console.log(this._rtos.stats);
    }
}