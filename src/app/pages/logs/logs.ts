import { Component, OnInit } from "@angular/core";
import { TableViewComponent } from "../../../components/tableview/tableview";
import { AppService } from "../../app.service";
import { LogEntry, LogMetadataQuery, MissionMetadata, ReplayData } from "../../app.interface";
import { DateSelectComponent } from "../../../components/dateselect/dateselect";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { DictS, Nullable, Pair } from "../../../utils/types";
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";
import { HttpResponse } from "@angular/common/http";

interface ReplaySettings {
    fg_enable: boolean;
    delay: number;
}

@Component({
    selector: "page-logs",
    standalone: true,
    imports: [TableViewComponent, DateSelectComponent, DropSelectComponent, ObjEditorComponent],
    templateUrl: "./logs.html"
})
export class LogsPage implements OnInit {
    public previewLogList: Array<LogEntry> = [];
    public missionMetaData: DictS<string> = {};
    public missionTimes: Array<string> = [];
    public missionNames: Array<string> = [];
    public missionDates: Array<string> = [];
    public aircraftIds: Array<number> = [];
    public downloading: boolean = false;
    public replayStarting: boolean = false;
    public replaySettings: ReplaySettings = { fg_enable: false, delay: 6.5 };
    public readonly missionTimesRepr: (s: string) => string = s => s.replace(/_/g, ':');
    public readonly aircraftIdsRepr: (n: number) => string = n => n !== 0 ? `ID = ${n}` : "All";
    public get nameSelectable(): boolean { return this._selectedDateStr.length > 0; }
    public get timeSelectable(): boolean { return this._selectedMissionName.length > 0 && this.nameSelectable; }
    public get logsFetchable(): boolean { return this._selectedMissionTime.length > 0 && this.timeSelectable && !this.downloading; }
    public get fileName(): string { return `${this._selectedDateStr}_${this._selectedMissionName}_${this._selectedMissionTime}.csv`; }
    private readonly _svc: AppService;
    private readonly void = () => {};
    private _selectedDateStr: string = "";
    private _selectedMissionName: string = "";
    private _selectedMissionTime: string = "";
    private _selectedAircraftId: number = 0;
    constructor(svc: AppService) {
        this._svc = svc;
    }

    ngOnInit(): void {
        const interval = setInterval(() => {
            if (this.missionDates.length === 0) this.fetchLogDates();
            else clearInterval(interval);
        }, 500);
    }

    private resetTimes(fetch: boolean = true) {
        this.missionTimes = [];
        this.missionMetaData = {};
        this.previewLogList = [];
        this._selectedMissionTime = "";
        if (fetch) this.fetchMissionTimes();
    }
    private resetNames(fetch: boolean = true) {
        this.resetTimes(false);
        this.missionNames = [];
        this._selectedMissionName = "";
        if (fetch) this.fetchMissionNames();
    }
    private resetDates(fetch: boolean = true) {
        this.resetNames(false);
        this.missionDates = [];
        this._selectedDateStr = "";
        if (fetch) this.fetchLogDates();
    }
    private fetchLogDates() {
        this._svc.callAPI("logs/dates", (d: any) => {
            if (!this._svc.isValidAPIResponse(d)) return; // invalid data
            if (!d.success) return; // skip when failed
            if (!d.data || !d.data.hasOwnProperty("mission_log_dates")) return; // invalid data
            this.missionDates = (d.data.mission_log_dates as Array<string>).map((s: string) => {
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
                    const rawValue: any = (metadata as any)[key];
                    const isArray = Array.isArray(rawValue) || ArrayBuffer.isView(rawValue);
                    const value: string = isArray ? `[${(rawValue as any[]).join(", ")}]` : rawValue;
                    if (key.includes("time")) this.missionMetaData[key] = new Date(value).toLocaleString();
                    else this.missionMetaData[key] = value;
                }
            }
            this.aircraftIds = [0, metadata.lead_id, ...metadata.follower_ids].sort();
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
            this.downloading = false;
        }, 
        { date: this._selectedDateStr, name: this._selectedMissionName, time: this._selectedMissionTime, id: this._selectedAircraftId, include_flocking_logs: true } as LogMetadataQuery, 
        () => this.downloading = false, "blob");
    }
    private deleteMissionLogs(date: string = "", name: string = "", time: string = "") {
        this._svc.callAPI("logs/delete", (d: any) => {
            if (!this._svc.isValidAPIResponse(d)) return; // invalid data
            this.missionMetaData = {};
            if (d.success) alert(`Mission logs deleted: Date = ${date}; Mission Name = ${name}; Log Time = ${time}`);
            else alert(`Failed to delete mission logs: Date = ${date}; Mission Name = ${name}; Log Time = ${time}`);
            this.previewLogList = [];
            this.missionMetaData = {};
            if (time.length > 0) this.resetTimes(); // reset time only
            else if (name.length > 0) this.resetNames(); // reset name and time
            else this.resetDates(); // reset all
        }, { date, name, time }, this.void);
    }

    onDateRangeChanged(dates: Pair<Nullable<Date>>) {
        const [start, end] = dates;
        if (!start) return; // no start date
        const date = new Date(start);
        const [year, month, day] = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
        const yyyy = year.toString().padStart(4, "0");
        const mm = month.toString().padStart(2, "0");
        const dd = day.toString().padStart(2, "0");
        const dstr = `${yyyy}_${mm}_${dd}`;
        if (this._selectedDateStr === dstr) return; // skip when same
        this.resetNames(false);
        this._selectedDateStr = dstr;
        this.fetchMissionNames();
    }
    onMissionNameSelected(mName: string) {
        if (mName === this._selectedMissionName) return; // skip when same
        this.resetTimes(false);
        this._selectedMissionName = mName;
        this.fetchMissionTimes();
    }
    onMissionTimeSelected(mTime: string) {
        if (mTime === this._selectedMissionTime) return; // skip when same
        this._selectedMissionTime = mTime;
        this.fetchMissionMetadata();
    }
    onAircraftIdSelected(aId: number) {
        if (aId === this._selectedAircraftId) return; // skip when same
        this.previewLogList = [];
        this._selectedAircraftId = aId;
    }
    onViewMissionLogs() {
        if (this.downloading) return; // skip when loading
        this.downloading = true;
        this.downloadMissionLogs();
        alert("Fetching mission logs may takes a long time since log files could be large.\nPlease be patient.");
    }
    onDeleteMissionLogs(mode: number) {
        if (mode === 0) this.deleteMissionLogs(this._selectedDateStr, this._selectedMissionName, this._selectedMissionTime);
        else if (mode === 1) this.deleteMissionLogs(this._selectedDateStr, this._selectedMissionName);
        else if (mode === 2) this.deleteMissionLogs(this._selectedDateStr);
    }
    onReplaySettingsChanged(settings: ReplaySettings) {
        this.replaySettings = settings;
    }
    onReplayMissionLogs() {
        const repData: ReplayData = {
            date: this._selectedDateStr,
            name: this._selectedMissionName,
            time: this._selectedMissionTime,
            fg_enable: this.replaySettings.fg_enable,
            delay: this.replaySettings.delay
        } as ReplayData;
        this.replayStarting = true;
        this._svc.callAPI("logs/replay", (d: any) => {
            this.replayStarting = false;
            if (!this._svc.isValidAPIResponse(d)) return; // invalid data
            if (!d.success) {
                alert(`Replay failed: ${d.msg}`);
                return; // skip when failed
            }
            this._svc.navigateTo("../monitor");
        }, repData, this.void);
    }
}