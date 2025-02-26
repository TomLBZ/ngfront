import { Component, ViewChild, OnInit, OnDestroy } from "@angular/core";
import { WebGLShaderHostComponent, UniformDict } from "../../../components/webglshaderhost/webglshaderhost";
import { RTOS } from "../../../utils/rtos/rtos";

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
        u_pitch: 0.25,
        u_roll: 0.25,
        u_yaw: 0.25
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
        this.shaderHost.drawFrame();
    }
    private updateUniforms() {
        if (!this.shaderHost) return;
        const t_s = performance.now() / 1000;
        const new_uniforms = {
            u_pitch: (this.uniforms['u_pitch'] as number) + this.lift * t_s,
            u_roll: (this.uniforms['u_roll'] as number) + this.tilt * t_s,
            u_yaw: (this.uniforms['u_yaw'] as number) + this.turn * t_s,
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
        console.log("RTOS stopped");
        console.log(this._rtos.stats);
    }
}