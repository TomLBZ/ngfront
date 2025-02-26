import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MarkerGroup } from '../../../utils/marker/markergrp';
import { Icon } from '../../../utils/icon/icon';
import { Color } from '../../../utils/color/color';
import { MapViewComponent } from '../../../components/mapview/mapview';
import { OutboxComponent } from '../../../components/outbox/outbox';
import { WebGLShaderHostComponent, UniformDict } from '../../../components/webglshaderhost/webglshaderhost';
import { env } from '../../app.config';
import { RTOS } from '../../../utils/rtos/rtos';
import { MissedDeadlinePolicy } from '../../../utils/rtos/rtostypes';
import { Flag } from '../../../utils/flag/flag';
import { AppService } from '../../app.service';

@Component({
    selector: 'page-monitor',
    imports: [MapViewComponent, OutboxComponent, WebGLShaderHostComponent],
    templateUrl: 'monitor.html'
})
export class MonitorPage implements OnInit, OnDestroy {
    planes: MarkerGroup = new MarkerGroup(Icon.Poly(16, Icon.polyPlaneVecs, Color.Blue, Color.Blue));
    apiKey: string = env.mapKey;
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
    private _flags: Flag = new Flag([
        "Heartbeat",
        "Draw",
    ]);
    private get timeStr(): string {
        return performance.now().toFixed(0);
    }
    private heartbeat() {
        // this.svc.call("br/health", (d: any) => {
        //     console.log(d);
        // });
        console.log("Heartbeat " + this.timeStr);
        setTimeout(() => {
            this._flags.set("Heartbeat");
        }, 50);
    }
    @ViewChild(WebGLShaderHostComponent) shaderHost?: WebGLShaderHostComponent;
    private draw() {
        if (!this.shaderHost) return;
        this.shaderHost.drawFrame();
        this.outbox?.clear("On Draw " + this.timeStr);
        this._flags.clear("Draw");
    }
    private onHeartbeat() {
        this.outbox?.clear("On Heartbeat " + this.timeStr);
        this._flags.clear("Heartbeat");
    }
    constructor(private svc: AppService) {
        this._rtos.addTask(() => this.heartbeat(), {
            name: "Heartbeat",
            priority: 10,
            intervalMs: 1000,
            missedPolicy: MissedDeadlinePolicy.RUN_ONCE,
        });
        this._rtos.addTask(() => this.draw(), {
            name: "Draw",
            priority: 1,
            deadlineMs: 30,
        });
        this._rtos.addInterrupt(() => this._flags.get("Heartbeat"), () => this.onHeartbeat());
    }
    
    @ViewChild(OutboxComponent) outbox?: OutboxComponent;
    ngOnInit(): void {
        this._rtos.start();
    }

    ngOnDestroy(): void {
        this._rtos.stop();
        console.log("RTOS stopped");
        console.log(this._rtos.stats);
    }

}