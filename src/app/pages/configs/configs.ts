import { Component } from "@angular/core";
import { AppService } from "../../app.service";
import { ConfigFile, APIResponse, ConfigFileType } from "../../app.interface";
import { HttpResponse } from "@angular/common/http";
import { FormDataEntry } from "../../app.interface";
import { FileOpComponent } from "../../../components/fileop/fileop";
import { Callback, DictN } from "../../../utils/types";
import { StructValidator } from "../../../utils/ds";

@Component({
    selector: 'page-configs',
    imports: [FileOpComponent],
    templateUrl: 'configs.html'
})
export class ConfigsPage {
    private readonly _svc: AppService;
    private readonly _res2str: Callback<APIResponse> = (d: APIResponse) => {
        if (!StructValidator.hasFields(d, ['success', 'msg'])) alert(`Invalid Response:\n${JSON.stringify(d, null, 2)}`);
        else alert(`${d.success ? "Success" : "Failure"}: ${d.msg}\n${JSON.stringify(d.data ?? "No Data", null, 2)}`);
    }
    public readonly repr: Function = (cfg: ConfigFile) => cfg.id < 0 ? "[Default]" : `${cfg.id}: ${cfg.name}`;
    public readonly D_JSB = 0;
    public readonly C_JSB = 1;
    public readonly D_PAP = 2;
    public readonly C_PAP = 3;
    public readonly AC_CFG = [0, 1, 2, 3];
    public readonly F = 4;
    public readonly fileDict: DictN<Array<ConfigFile>> = {0: [], 1: [], 2: [], 3: [], 4: []};
    public readonly selectedIdxDict: DictN<number> = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}; // selected indices for each type
    public waiting: boolean = false;
    public applying: boolean = false; // flag to indicate if applying files
    public applyingType: number = -1; // type of file being applied
    private _fgEnable: boolean = false;
    constructor(svc: AppService) { 
        this._svc = svc; 
        this.fetchFiles();
    }
    private typeToNumber(type: ConfigFileType): number {
        if (type.file_type === "jsbsim") return type.airframe_type === 0 ? this.D_JSB : this.C_JSB;
        if (type.file_type === "pprz") return type.airframe_type === 0 ? this.D_PAP : this.C_PAP;
        return this.F;
    }
    private numberToType(num: number): ConfigFileType {
        const ftype = num === this.D_JSB || num === this.C_JSB ? "jsbsim" : (num === this.D_PAP || num === this.C_PAP ? "pprz" : "flocking_algo");
        const atype = num === this.F ? 0 : (num === this.D_JSB || num === this.D_PAP ? 0 : 1);
        return { file_type: ftype, airframe_type: atype };
    }
    private numberToDefaultName(num: number): string {
        const ext = num === this.F ? "" : ".xml";
        const name = this.numToName(num);
        return `[Default]${name}${ext}`;
    }
    public numToName(num: number): string {
        return num === this.D_JSB ? "JSB (Default Model)" :
            num === this.C_JSB ? "JSB (Custom Model)" :
            num === this.D_PAP ? "PPRZ (Default Model)" :
            num === this.C_PAP ? "PPRZ (Custom Model)" :
            num === this.F ? "Flocking Algorithm" : "Unknown";
    }
    private refreshFileDict(res: APIResponse): void {
        if (!res.success) return; // skip if not successful
        if (!StructValidator.hasFields(res.data, ['simulation_files_config'])) {
            console.error("Invalid response: simulation_files_config not found!");
            return;
        }
        for (const key in this.fileDict) this.fileDict[key].length = 0;
        (res.data.simulation_files_config as Array<ConfigFile>).forEach((cfg: ConfigFile) => this.fileDict[this.typeToNumber(cfg.type)].push(cfg));
        for (const key in this.fileDict) {
            const k: number = parseInt(key);
            const file: ConfigFile = {
                id: -1,
                name: this.numberToDefaultName(k),
                type: this.numberToType(k)
            }
            this.fileDict[k].unshift(file);
        }
    }
    private fetchFiles(): void { // TODO: refactor ngOnInit to use this method for fetching files/all API
        this._svc.callAPI("files/all", (d: any) => {
            if (!StructValidator.hasFields(d, ['success', 'data'])) return; // invalid response
            this.refreshFileDict(d as APIResponse);
            this.fetchCurrentFiles(); // fetch current files after refreshing the file dictionary
        });
    }
    private refreshSelectedIdxDict(res: APIResponse): void {
        if (!res.success) return; // skip if not successful
        if (!StructValidator.hasFields(res.data, ['mission_settings'])) {
            console.error("Invalid response: mission_settings not found!");
            return;
        }
        if (!StructValidator.hasFields(res.data.mission_settings, ['selected_files', 'fg_enable'])) {
            console.error("Invalid response: mission_settings has incomplete fields!");
            return;
        }
        for (const key in this.selectedIdxDict) this.selectedIdxDict[key] = 0;
        const configs: Array<ConfigFile> = res.data.mission_settings.selected_files as Array<ConfigFile>;
        configs.forEach((cfg: ConfigFile) => {
            const type: number = this.typeToNumber(cfg.type);
            const idx: number = this.fileDict[type].findIndex((c: ConfigFile) => c.id === cfg.id);
            if (idx >= 0) this.selectedIdxDict[type] = idx; // set selected id if found
            else {
                console.warn(`Config file with id ${cfg.id} not found in type ${type}!`);
                this.selectedIdxDict[type] = 0; // reset to 0 if not found
            }
        });
        this._fgEnable = res.data.mission_settings.fg_enable ?? false; // set fg_enable
    }
    private fetchCurrentFiles(): void {
        this._svc.callAPI("files/current", (d2: any) => {
            if (!StructValidator.hasFields(d2, ['success', 'data'])) return; // invalid response
            this.refreshSelectedIdxDict(d2 as APIResponse);
        });
    }
    onRefreshFiles() {
        this.fetchFiles(); // fetch files again
    }
    onFileOpSelectionChanged(_: Array<ConfigFile> | ConfigFile) {
        this.fetchCurrentFiles(); // refresh current files on selection change
    }
    onFileOpDownloadClicked(items: Array<ConfigFile>) {
        this._svc.callAPI("files/download", (d: HttpResponse<Blob>) => {
            if (d.body) {
                if (d.body.type === 'application/json') {
                    d.body.text().then((t: string) => this._res2str(JSON.parse(t)));
                } else if (d.body.type === 'application/xml') {
                    const url = window.URL.createObjectURL(d.body);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = items[0].name;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                } else alert("Download failed: Invalid Blob Type!\n" + d.body.type);
            } else alert("Download failed: Empty Data Response!");
        }, items[0], console.error, 'blob');
    }
    onFileOpUploadClicked(numType: number) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = numType === this.F ? '' : '.xml';
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files === null || files.length === 0) return;
            const ffieldName = files.length > 1 ? 'files' : 'file';
            const formDataEntries: Array<FormDataEntry> = [];
            for (let i = 0; i < files.length; i++) {
                formDataEntries.push({ name: ffieldName, value: files[i] });
            }
            this._svc.callAPI("files/upload", this._res2str, { type: this.numberToType(numType) }, console.error, 'json', ...formDataEntries);
        };
        input.click();
        input.remove();
        this.fetchFiles(); // refresh files after upload
    }
    onFileOpApplyClicked(items: Array<ConfigFile>) {
        if (items.length === 1 && items[0].id < 0) {
            alert("The default configuration is a reference for download only, it cannot be applied!");
            return;
        }
        this.applying = true; // set applying flag
        this.applyingType = this.typeToNumber(items[0].type); // set applying type
        this._svc.callAPI("files/apply", (d: APIResponse) => {
            this.applying = false; // reset applying flag
            this.applyingType = -1; // reset applying type
            this._res2str(d); // show success message
            this.fetchCurrentFiles(); // refresh current files after applying
        }, { selected_files: items, fg_enable: this._fgEnable }, console.error);
    }
    onFileOpDeleteClicked(items: Array<ConfigFile>) {
        if (items.length === 1 && items[0].id < 0) { // id must exist
            alert("The default configuration is a reference for download only, it cannot be deleted!");
            return;
        }
        this._svc.callAPI("files/delete", this._res2str, items[0]);
        const type = this.typeToNumber(items[0].type);
        this.fileDict[type] = this.fileDict[type].filter((cfg: ConfigFile) => cfg.id !== items[0].id);
        this.fetchFiles(); // refresh files after deletion
    }
    onReset() {
        if (this.waiting) return; // skip when waiting
        this.waiting = true;
        this._svc.callAPI("sim/reset", (d: any) => {
            this.waiting = false; // stop waiting
            if (!StructValidator.hasFields(d, ["success", "msg"])) alert("Failed to reset simulator configs: Invalid Response!");
            else if (!(d as APIResponse).success) alert(`Failed to reset simulator configs!\n${d.msg}`);
            else alert("Simulator configs reset successfully!");
        }, undefined, (e: any) => {
            this.waiting = false; // stop waiting
            alert(`Failed to reset simulator: ${e}`);
        });
        this.fetchCurrentFiles(); // refresh current files after reset
    }
}