import { Component, OnDestroy, OnInit } from "@angular/core";
import { RTOS } from "../../../utils/rtos/rtos";
import { Flag } from "../../../utils/flag/flag";
import { AppService } from "../../app.service";
import { MissedDeadlinePolicy, RTOSIntervalOptions } from "../../../utils/rtos/rtostypes";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";

@Component({
    selector: 'page-configs',
    imports: [DropSelectComponent],
    templateUrl: 'configs.html'
})
export class ConfigsPage implements OnInit, OnDestroy {
    readonly D_JSB = 0;
    readonly C_JSB = 1;
    readonly D_PAP = 2;
    readonly C_PAP = 3;
    readonly F = 4;
    private _rtos: RTOS = new RTOS({
        cycleIntervalMs: 100,
        continueAfterInterrupt: true,
        timeSlicePerCycle: true,
        useAnimationFrame: false,
    });
    private _flags: Flag = new Flag([
        "djsbver",
        "cjsbver",
        "dpapver",
        "cpapver",
        "fver"
    ]);
    private _apiIntervalOptions: RTOSIntervalOptions = {
        priority: 1,
        intervalMs: 1000,
        missedPolicy: MissedDeadlinePolicy.RUN_ONCE,
    };
    djsbvers: Array<string> = [];
    cjsbvers: Array<string> = [];
    dpapvers: Array<string> = [];
    cpapvers: Array<string> = [];
    fvers: Array<string> = [];
    private d2sarr(d: any): Array<string> {
        let arr: Array<string> = [];
        for (let k in d) {
            arr.push(k + ": " + d[k]);
        }
        return arr;
    }
    private callApi(apiName: string, flagName: string, arr: Array<string>) {
        if (this._flags.get(flagName)) return; // already called
        this.svc.call(apiName, (d: any) => {
            arr = this.d2sarr(d);
            this._flags.set(flagName);
        });
    }
    private refreshLists() {
    }
    constructor(private svc: AppService) {
        this._rtos.addTask(()=>this.callApi("djsbver", "djsbver", this.djsbvers), this._apiIntervalOptions);
        this._rtos.addTask(()=>this.callApi("cjsbver", "cjsbver", this.cjsbvers), this._apiIntervalOptions);
        this._rtos.addTask(()=>this.callApi("dpapver", "dpapver", this.dpapvers), this._apiIntervalOptions);
        this._rtos.addTask(()=>this.callApi("cpapver", "cpapver", this.cpapvers), this._apiIntervalOptions);
        this._rtos.addTask(()=>this.callApi("fver", "fver", this.fvers), this._apiIntervalOptions);
        this._rtos.addInterrupt(() => this._flags.all, () => {
            this.refreshLists();
            this._flags.all = false;
        });
    }
    onUpload(type: number) {
    }
    onDownload(type: number) {
    }
    onApply(type: number) {
    }
    onSelectionChanged(event: any, type: number) {
    }
    ngOnInit(): void {
        this._rtos.start();
        console.log("RTOS started");
    }
    ngOnDestroy(): void {
        this._rtos.stop();
        console.log("RTOS stopped");
        console.log(this._rtos.stats);
    }
}