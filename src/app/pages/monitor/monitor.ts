import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MarkerGroup } from '../../../utils/marker/markergrp';
import { Icon } from '../../../utils/icon/icon';
import { Color } from '../../../utils/color/color';
import { MapViewComponent } from '../../../components/mapview/mapview';
import { OutboxComponent } from '../../../components/outbox/outbox';
import { env } from '../../app.config';
import { RTOS } from '../../../utils/rtos/rtos';
import { MissedDeadlinePolicy } from '../../../utils/rtos/rtostypes';
import { Flag } from '../../../utils/flag/flag';

@Component({
    selector: 'page-monitor',
    imports: [MapViewComponent, OutboxComponent],
    templateUrl: 'monitor.html'
})
export class MonitorPage implements OnInit {
    planes: MarkerGroup = new MarkerGroup(Icon.Poly(16, Icon.polyPlaneVecs, Color.Blue, Color.Blue));
    apiKey: string = env.mapKey;
    private _rtos: RTOS = new RTOS({
        cycleIntervalMs: 100,
        continueAfterInterrupt: true,
        timeSlicePerCycle: true,
        useAnimationFrame: true,
    });
    private _flags: Flag = new Flag([
        "Heartbeat",
        "Task 1",
        "Interrupt",
    ]);
    private get timeStr(): string {
        return performance.now().toFixed(0);
    }
    private heartbeatCallback() {
        console.log("Heartbeat " + this.timeStr);
        setTimeout(() => {
            this._flags.set("Heartbeat");
        }, 50);
    }
    private task1Callback() {
    }
    private interruptCondition(): boolean {
        return this._flags.get("Heartbeat");
    }
    private interruptCallback() {
        console.log("Interrupt " + this.timeStr);
        this._flags.clear("Heartbeat");
    }
    constructor() {
        this._rtos.addTask(() => this.heartbeatCallback(), {
            name: "Heartbeat",
            priority: 10,
            intervalMs: 1000,
            missedPolicy: MissedDeadlinePolicy.RUN_ONCE,
        });
        this._rtos.addTask(() => this.task1Callback(), {
            name: "Task 1",
            priority: 3,
            deadlineMs: 400,
        });
        this._rtos.addInterrupt(() => this.interruptCondition(), () => this.interruptCallback());
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