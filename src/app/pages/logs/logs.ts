import { Component, OnInit } from "@angular/core";
import { TableViewComponent } from "../../../components/tableview/tableview";
import { AppService } from "../../app.service";
import { LogEntry, MissionMetadata } from "../../app.interface";
import { DateSelectComponent } from "../../../components/dateselect/dateselect";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { DictS, Nullable, Pair } from "../../../utils/type/types";
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";

@Component({
    selector: "page-logs",
    standalone: true,
    imports: [TableViewComponent, DateSelectComponent, DropSelectComponent, ObjEditorComponent],
    templateUrl: "./logs.html"
})
export class LogsPage implements OnInit {
    
    private readonly _svc: AppService;
    private readonly void = () => {};
    private _loopTimer: any = null;
    public availableDates: Array<string> = [];
    public missionNames: Array<string> = [];
    public missionTimes: Array<string> = [];
    public readonly missionTimesRepr: (s: string) => string = s => s.replace(/_/g, ':');
    public get nameSelectable(): boolean { return this.selectedDateStr.length > 0; }
    public get timeSelectable(): boolean { return this.selectedMissionName.length > 0 && this.nameSelectable; }
    public get logsFetchable(): boolean { return this.selectedMissionTime.length > 0 && this.timeSelectable && !this.logsFetching; }
    private selectedDateStr: string = "";
    private selectedMissionName: string = "";
    private selectedMissionTime: string = "";
    private logsFetching: boolean = false;
    public missionMetaData: DictS<string> = {};
    public previewLogList: Array<LogEntry> = [];
    constructor(svc: AppService) {
        this._svc = svc;
    }

    ngOnInit(): void {
        this._loopTimer = setInterval(() => {
            if (this.availableDates.length > 0) {
                clearInterval(this._loopTimer);
                this._loopTimer = null;
            } else this.fetchLogDates();
        }, 1000);
    }

    private fetchLogDates() {
        this._svc.callAPI("logs/dates", (d: any) => {
            if (!this._svc.isValidAPIResponse(d)) return; // invalid data
            if (!d.success) return; // skip when failed
            if (!d.data || !d.data.hasOwnProperty("mission_log_dates")) return; // invalid data
            this.availableDates = (d.data.mission_log_dates as Array<string>).map((s: string) => {
                const [year, month, day] = s.split('_').map(x => +x);
                const dateObj = new Date(year, month - 1, day);
                return dateObj.toDateString(); // Convert to Date string
            });
        }, undefined, this.void);
    }
    private fetchMissionNames() {
        this._svc.callAPI("logs/metadata", (d: any) => {
            if (!this._svc.isValidAPIResponse(d)) return; // invalid data
            if (!d.success) return; // skip when failed
            if (!d.data || !d.data.hasOwnProperty("logged_missions")) return; // invalid data
            this.missionNames = d.data.logged_missions as Array<string>;
        }, { date: this.selectedDateStr }, this.void);
    }
    private fetchMissionTimes() {
        this._svc.callAPI("logs/metadata", (d: any) => {
            if (!this._svc.isValidAPIResponse(d)) return; // invalid data
            if (!d.success) return; // skip when failed
            if (!d.data || !d.data.hasOwnProperty("logged_missions")) return; // invalid data
            this.missionTimes = d.data.logged_missions as Array<string>;
        }, { date: this.selectedDateStr, name: this.selectedMissionName }, this.void);
    }
    private fetchMissionMetadata() {
        this._svc.callAPI("logs/metadata", (d: any) => {
            if (!this._svc.isValidAPIResponse(d)) return; // invalid data
            this.missionMetaData = {};
            if (!d.success) {
                alert(`Mission data access failed. Simulation could still be running, or file is corrupt!`);
                return; // skip when failed
            }
            if (!d.data || !d.data.hasOwnProperty("meta_data")) return; // invalid data
            const metadata = d.data.meta_data as MissionMetadata;
            for (const key in metadata) {
                if (metadata.hasOwnProperty(key)) {
                    const value: string = (metadata as any)[key] as string;
                    if (key.includes("time")) this.missionMetaData[key] = new Date(value).toUTCString();
                    else this.missionMetaData[key] = value;
                }
            }
        }, { date: this.selectedDateStr, name: this.selectedMissionName, time: this.selectedMissionTime }, this.void);
    }
    private fetchPreviewMissionLogs() {
        this._svc.callAPI("logs/preview", (d: any) => {
            if (!this._svc.isValidAPIResponse(d)) return; // invalid data
            if (!d.success) return; // skip when failed
            if (!d.data || !d.data.hasOwnProperty("mission_log")) return; // invalid data
            this.previewLogList = d.data.mission_log as Array<LogEntry>;
        }
        , { date: this.selectedDateStr, name: this.selectedMissionName, time: this.selectedMissionTime, page: 1, limit: 100 }, this.void);
    }
    private fetchAllLogs() {
        console.log(new Date().toUTCString());
        this._svc.callAPI("logs/download", (d: any) => {
            if (!this._svc.isValidAPIResponse(d)) {

                return; // invalid data
            }
            console.log(new Date().toUTCString());
            console.log(d.success);
            console.log(Object.keys(d.data));
            if (!d.success) return; // skip when failed
            if (!d.data || !d.data.hasOwnProperty("mission_log")) return; // invalid data
            this.previewLogList = d.data.mission_log as Array<LogEntry>;
        }, { date: this.selectedDateStr, name: this.selectedMissionName, time: this.selectedMissionTime }, console.log);
    }

    onDateRangeChanged(dates: Pair<Nullable<Date>>) {
        const [start, end] = dates;
        if (!start) return; // no start date
        const date = new Date(start);
        const [year, month, day] = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
        this.selectedDateStr = `${year}_${month}_${day}`;
        this.fetchMissionNames();
    }
    onMissionNameSelected(mName: string) {
        this.selectedMissionName = mName;
        this.fetchMissionTimes();
    }
    onMissionTimeSelected(mTime: string) {
        this.selectedMissionTime = mTime;
        this.fetchMissionMetadata();
    }
    onPreviewMissionLogs() {
        this.fetchPreviewMissionLogs();
        // this.fetchAllLogs();
    }
    onReplayMissionLogs() {
        this._svc.callAPI("logs/replay", (d: any) => {
            if (!this._svc.isValidAPIResponse(d)) return; // invalid data
            if (!d.success) return; // skip when failed
            console.log(d.data);
            if (!d.data || !d.data.hasOwnProperty("mission_log")) return; // invalid data
            this.previewLogList = d.data.mission_log as Array<LogEntry>;
        }, { date: this.selectedDateStr, name: this.selectedMissionName, time: this.selectedMissionTime }, this.void);
    }
}