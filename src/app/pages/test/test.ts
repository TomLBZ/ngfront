import { Component, ViewChild, OnInit, OnDestroy } from "@angular/core";
import { WebGLShaderHostComponent, UniformDict } from "../../../components/webglshaderhost/webglshaderhost";
import { RTOS } from "../../../utils/rtos/rtos";

@Component({
    selector: 'page-test',
    imports: [WebGLShaderHostComponent],
    templateUrl: 'test.html'
})
export class TestPage implements OnInit, OnDestroy {
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