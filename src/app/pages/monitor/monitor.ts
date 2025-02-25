import { Component, OnInit, ViewChild } from '@angular/core';
import { MarkerGroup } from '../../../utils/marker/markergrp';
import { Icon } from '../../../utils/icon/icon';
import { Color } from '../../../utils/color/color';
import { MapViewComponent } from '../../../components/mapview/mapview';
import { OutboxComponent } from '../../../components/outbox/outbox';
import { env } from '../../app.config';
import { RTOS } from '../../../utils/rtos/rtos';
import { MissedDeadlinePolicy } from '../../../utils/rtos/rtostypes';

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
    });
    @ViewChild(OutboxComponent) outbox!: OutboxComponent;
    private get timeStr(): string {
        return performance.now().toFixed(0);
    }
    private heartbeatCallback() {
        this.outbox.append("Heartbeat " + this.timeStr, true);
    }
    private sensorPoolCallback() {
        this.outbox.append("Sensor Pool " + this.timeStr, true);
    }
    private task1Callback() {
        this.outbox.append("Task 1 " + this.timeStr, true);
    }
    private task2Callback() {
        this.outbox.append("Task 2 " + this.timeStr, true);
    }
    private task3Callback() {
        this.outbox.append("Task 3 " + this.timeStr, true);
    }
    private interruptRandomCondition(): boolean {
        return Math.random() < 0.2;
    }
    private interruptCallback() {
        this.outbox.append("Interrupt " + this.timeStr, true);
    }
    constructor() {
        this._rtos.addTask(() => this.heartbeatCallback(), {
            name: "Heartbeat",
            priority: 10,
            intervalMs: 1000,
            missedPolicy: MissedDeadlinePolicy.RUN_ONCE,
        });
        this._rtos.addTask(() => this.sensorPoolCallback(), {
            name: "Sensor Pool",
            priority: 5,
            intervalMs: 500,
            missedPolicy: MissedDeadlinePolicy.SKIP,
        });
        this._rtos.addTask(() => this.task1Callback(), {
            name: "Task 1",
            priority: 3,
            deadlineMs: 400,
        });
        this._rtos.addTask(() => this.task2Callback(), {
            name: "Task 2",
            priority: 3,
            deadlineMs: 200,
        });
        this._rtos.addTask(() => this.task3Callback(), {
            name: "Task 3",
            priority: 2,
            deadlineMs: 200,
        });
        this._rtos.addInterrupt(() => this.interruptRandomCondition(), () => this.interruptCallback());
    }
    
    ngOnInit(): void {
        this._rtos.start();
        // after 5 seconds, stop the RTOS
        setTimeout(() => {
            this._rtos.stop();
            this.outbox.append("=== RTOS stopped ===", true);
            this.outbox.append(this._rtos.stats, true);
        }, 3000);
    }

}