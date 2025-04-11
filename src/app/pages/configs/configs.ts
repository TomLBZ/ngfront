import { Component, OnDestroy, OnInit } from "@angular/core";
import { AppService } from "../../app.service";
import { ConfigFile, APIResponse, ConfigFileType } from "../../app.interface";
import { HttpResponse } from "@angular/common/http";
import { FormDataEntry } from "../../app.interface";
import { StructValidator } from "../../../utils/api/validate";
import { DictN, Callback } from "../../../utils/types";
import { FileOpComponent } from "../../../components/fileop/fileop";

@Component({
    selector: 'page-configs',
    imports: [FileOpComponent],
    templateUrl: 'configs.html'
})
export class ConfigsPage implements OnInit, OnDestroy {
    private readonly _svc: AppService;
    private readonly _res2str: Callback = (d: any) => {
        if (!StructValidator.hasFields(d, ['success', 'msg'])) alert("Invalid Response!");
        else alert(`${(d as APIResponse).success ? "Success" : "Failure"}: ${(d as APIResponse).msg}\n${JSON.stringify((d as APIResponse).data)}`);
    }
    private _timeoutInterval?: any;
    public readonly repr: Function = (cfg: ConfigFile) => cfg.id < 0 ? "[Default]" : `${cfg.id}: ${cfg.name}`;
    public readonly D_JSB = 0;
    public readonly C_JSB = 1;
    public readonly D_PAP = 2;
    public readonly C_PAP = 3;
    public readonly AC_CFG = [0, 1, 2, 3];
    public readonly F = 4;
    public readonly fileDict: DictN<Array<ConfigFile>> = {0: [], 1: [], 2: [], 3: [], 4: []};
    public waiting: boolean = false;
    constructor(svc: AppService) { this._svc = svc; }
    private clearFileDict() {
        for (const key in this.fileDict) this.fileDict[key].length = 0;
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
    private cfgFileToType(cfg: ConfigFile): ConfigFileType {
        return {
            id: cfg.id,
            file_type: cfg.type.file_type,
            airframe_type: cfg.type.airframe_type
        } as ConfigFileType;
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
    ngOnInit(): void {
        this._timeoutInterval = setInterval(() => {
            this._svc.callAPI("files/all", (d: any) => {
                if (!StructValidator.hasFields(d, ['success', 'data'])) return; // invalid response
                const dd: APIResponse = d as APIResponse;
                if (dd.success) {
                    this.clearFileDict();
                    (dd.data.simulation_files_config as Array<ConfigFile>).forEach((cfg: ConfigFile) => this.fileDict[this.typeToNumber(cfg.type)].push(cfg));
                    for (const key in this.fileDict) {
                        const k: number = parseInt(key);
                        const type: ConfigFileType = this.numberToType(k);
                        const file: ConfigFile = {
                            id: -1,
                            name: this.numberToDefaultName(k),
                            description: "",
                            type: type
                        }
                        this.fileDict[k].unshift(file);
                    }
                }
            });
        }, 1000);
    }
    ngOnDestroy(): void {
        if (this._timeoutInterval) clearInterval(this._timeoutInterval);
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
        }, this.cfgFileToType(items[0]), console.error, 'blob');
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
    }
    onFileOpApplyClicked(items: Array<ConfigFile>) {
        if (items.length === 1 && items[0].id < 0) {
            alert("The default configuration is a reference for download only, it cannot be applied!");
            return;
        }
        this._svc.callAPI("files/apply", this._res2str, { selected_files: items });
    }
    onFileOpDeleteClicked(items: Array<ConfigFile>) {
        if (items.length === 1 && items[0].id < 0) { // id must exist
            alert("The default configuration is a reference for download only, it cannot be deleted!");
            return;
        }
        const cfgType = this.cfgFileToType(items[0]);
        if (cfgType.airframe_type === null || cfgType.airframe_type === undefined) cfgType.airframe_type = 0;
        this._svc.callAPI("files/delete", this._res2str, cfgType);
        const type = this.typeToNumber(items[0].type);
        this.fileDict[type] = this.fileDict[type].filter((cfg: ConfigFile) => cfg.id !== items[0].id);
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
    }
}