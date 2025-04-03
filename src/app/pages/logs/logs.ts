import { Component, OnInit } from "@angular/core";
import { TableViewComponent } from "../../../components/tableview/tableview";
import { AppService } from "../../app.service";
import { LogEntry, MissionMetadata } from "../../app.interface";
import { DateSelectComponent } from "../../../components/dateselect/dateselect";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { DictS, Nullable, Pair } from "../../../utils/type/types";
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";
import { HttpResponse } from "@angular/common/http";

@Component({
    selector: "page-logs",
    standalone: true,
    imports: [TableViewComponent, DateSelectComponent, DropSelectComponent, ObjEditorComponent],
    templateUrl: "./logs.html"
})
export class LogsPage implements OnInit {
    public availableDates: Array<string> = [];
    public missionNames: Array<string> = [];
    public missionTimes: Array<string> = [];
    public loading: boolean = false;
    public readonly missionTimesRepr: (s: string) => string = s => s.replace(/_/g, ':');
    public get nameSelectable(): boolean { return this._selectedDateStr.length > 0; }
    public get timeSelectable(): boolean { return this._selectedMissionName.length > 0 && this.nameSelectable; }
    public get logsFetchable(): boolean { return this._selectedMissionTime.length > 0 && this.timeSelectable && !this._logsFetching; }
    public get fileName(): string { return `${this._selectedDateStr}_${this._selectedMissionName}_${this._selectedMissionTime}.csv`; }
    public missionMetaData: DictS<string> = {};
    public previewLogList: Array<LogEntry> = [];
    private readonly _svc: AppService;
    private readonly void = () => {};
    private _loopTimer: any = null;
    private _selectedDateStr: string = "";
    private _selectedMissionName: string = "";
    private _selectedMissionTime: string = "";
    private _logsFetching: boolean = false;
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
            if (!this._svc.hasDataProperties(d, ["logged_missions"])) return; // invalid data
            this.missionNames = d.data.logged_missions as Array<string>;
        }, { date: this._selectedDateStr }, this.void);
    }
    private fetchMissionTimes() {
        this._svc.callAPI("logs/metadata", (d: any) => {
            if (!this._svc.isValidAPIResponse(d)) return; // invalid data
            if (!d.success) return; // skip when failed
            if (!this._svc.hasDataProperties(d, ["logged_missions"])) return; // invalid data
            this.missionTimes = d.data.logged_missions as Array<string>;
        }, { date: this._selectedDateStr, name: this._selectedMissionName }, this.void);
    }
    private fetchMissionMetadata() {
        this._svc.callAPI("logs/metadata", (d: any) => {
            if (!this._svc.isValidAPIResponse(d)) return; // invalid data
            this.missionMetaData = {};
            if (!d.success) {
                alert(`Mission data access failed. Simulation could still be running, or file is corrupt!`);
                return; // skip when failed
            }
            if (!this._svc.hasDataProperties(d, ["meta_data"])) return; // invalid data
            const metadata = d.data.meta_data as MissionMetadata;
            for (const key in metadata) {
                if (metadata.hasOwnProperty(key)) {
                    const value: string = (metadata as any)[key] as string;
                    if (key.includes("time")) this.missionMetaData[key] = new Date(value).toUTCString();
                    else this.missionMetaData[key] = value;
                }
            }
        }, { date: this._selectedDateStr, name: this._selectedMissionName, time: this._selectedMissionTime }, this.void);
    }
    private downloadMissionLogs() {
        this._svc.callAPI("logs/download", (d: HttpResponse<Blob>) => {
            if (d.body) {
                if (d.body.type === 'text/csv') {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const csvText = e.target?.result as string;
                        const lines = csvText.split('\n');
                        const headerText = lines[0].split(',').map((col: string) => col.trim());
                        const dataText = lines.slice(1).map((line: string) => line.split(',').map((col: string) => col.trim()));
                        const data = dataText.map((row: string[]) => {
                            const obj: any = {};
                            headerText.forEach((header: string, index: number) => {
                                obj[header] = row[index];
                            });
                            return obj;
                        });
                        this.previewLogList = data as Array<LogEntry>;
                    }
                    reader.readAsText(d.body);
                } else alert("Download failed: Invalid Blob Type!\n" + d.body.type);
            } else alert("Download failed: Empty Data Response!");
            this.loading = false;
        }, 
        { date: this._selectedDateStr, name: this._selectedMissionName, time: this._selectedMissionTime }, 
        () => this.loading = false, "blob");
    }

    onDateRangeChanged(dates: Pair<Nullable<Date>>) {
        const [start, end] = dates;
        if (!start) return; // no start date
        const date = new Date(start);
        const [year, month, day] = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
        this._selectedDateStr = `${year}_${month}_${day}`;
        this.fetchMissionNames();
    }
    onMissionNameSelected(mName: string) {
        this._selectedMissionName = mName;
        this.fetchMissionTimes();
    }
    onMissionTimeSelected(mTime: string) {
        this._selectedMissionTime = mTime;
        this.fetchMissionMetadata();
    }
    onViewMissionLogs() {
        if (this.loading) return; // skip when loading
        this.loading = true;
        this.downloadMissionLogs();
        alert("Fetching mission logs may takes a long time since log files could be large.\nPlease be patient.");
    }
    onReplayMissionLogs() {
        this._svc.callAPI("logs/replay", (d: any) => {
            if (!this._svc.isValidAPIResponse(d)) return; // invalid data
            if (!d.success) return; // skip when failed
            console.log(d.data);
            if (!d.data || !d.data.hasOwnProperty("mission_log")) return; // invalid data
            this.previewLogList = d.data.mission_log as Array<LogEntry>;
        }, { date: this._selectedDateStr, name: this._selectedMissionName, time: this._selectedMissionTime }, this.void);
    }
}