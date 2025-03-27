import { Component, OnDestroy, OnInit } from "@angular/core";
import { AppService } from "../../app.service";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { RawFileConfig, DownloadConfig, APIResponse, UploadConfig } from "../../app.interface";
import { HttpResponse } from "@angular/common/http";
import { FormDataEntry } from "../../app.interface";
import { StructValidator } from "../../../utils/api/validate";

interface FileConfig {
    id: number;
    name: string;
    kind: number;
}

interface Dict<T> {
    [key: number]: T;
}

@Component({
    selector: 'page-configs',
    imports: [DropSelectComponent],
    templateUrl: 'configs.html'
})
export class ConfigsPage implements OnInit, OnDestroy {
    private readonly svc: AppService;
    private _timeoutInterval?: any;
    public readonly repr: Function = (cfg: FileConfig) => `${cfg.name} (${cfg.id})`;
    public readonly D_JSB = 0;
    public readonly C_JSB = 1;
    public readonly D_PAP = 2;
    public readonly C_PAP = 3;
    public readonly F = 4;
    public readonly nameDict: Dict<string> = {
        0: "JSB Config List",
        1: "JSB Config List",
        2: "Paparazzi Config List",
        3: "Paparazzi Config List",
        4: "Flocking Algorithm List"
    };
    public readonly fileDict: Dict<Array<FileConfig>> = {0: [], 1: [], 2: [], 3: [], 4: []};
    public readonly selectedDict: Dict<FileConfig> = {};
    constructor(svc: AppService) { this.svc = svc; }
    private clearFileDict() {
        for (const key in this.fileDict) this.fileDict[key].length = 0;
    }
    private ParseFileConfig(f: RawFileConfig): FileConfig {
        let kind = this.F;
        switch (f.type.file_type) {
            case "jsbsim":
                kind = f.type.airframe_type === 0 ? this.D_JSB : this.C_JSB;
                break;
            case "pprz":
                kind = f.type.airframe_type === 0 ? this.D_PAP : this.C_PAP;
                break;
        }
        return {
            id: f.id,
            name: f.name,
            kind: kind
        } as FileConfig;
    }
    private typeToUploadConfig(type: number): UploadConfig {
        const aftype: number | null = type === this.F ? 0 : (type === this.D_JSB || type === this.D_PAP ? 0 : 1);
        const typestr = type === this.F ? "flocking_algo" : type === this.D_JSB || type === this.C_JSB ? "jsbsim" : "pprz";
        return {
            file_type: typestr,
            airframe_type: aftype
        } as UploadConfig;
    }
    private cfgToDownloadConfig(cfg: FileConfig): DownloadConfig {
        const ucfg = this.typeToUploadConfig(cfg.kind);
        return {
            id: cfg.id,
            file_type: ucfg.file_type,
            airframe_type: ucfg.airframe_type
        } as DownloadConfig;
    }
    onUpload(type: number) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === this.F ? '' : '.xml';
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files === null || files.length === 0) return;
            const ucfg = this.typeToUploadConfig(type);
            const ffieldName = files.length > 1 ? 'files' : 'file';
            const formDataEntries: Array<FormDataEntry> = [];
            for (let i = 0; i < files.length; i++) {
                formDataEntries.push({ name: ffieldName, value: files[i] });
            }
            const payload = { type: ucfg };
            this.svc.uniPost("files/upload", payload, 'json', ...formDataEntries).subscribe({
                next: (d: APIResponse) => {
                    alert(d.success ? "Upload successful" : d.msg);
                }, error: console.error
            });
        };
        input.click();
        input.remove();
    }
    onDownload(type: number) {
        if (!this.selectedDict[type]) { alert("No file selected!"); return; }
        this.svc.uniPost("files/download", this.cfgToDownloadConfig(this.selectedDict[type]), 'blob').subscribe({
            next: (d: HttpResponse<Blob>) => {
                if (d.body) {
                    console.log(d.body);
                    if (d.body.type === 'application/json') {
                        d.body.text().then((t: string) => {
                            const j = JSON.parse(t);
                            console.log(j);
                            if (StructValidator.hasFields(j, ['success', 'msg', "data"])) alert(j.msg);
                            else alert("Download failed: Invalid JSON Response!");
                        });
                    } else if (d.body.type === 'application/octet-stream') {
                        console.log(d.body);
                        const url = window.URL.createObjectURL(d.body);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = this.selectedDict[type].name;
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                    } else alert("Download failed: Invalid Blob Type!");
                } else alert("Download failed: Empty Data Response!");
            }, error: console.error
        });
    }
    onApply(type: number) {
        if (!this.selectedDict[type]) { alert("No file selected!"); return; }
    }
    onSelectionChanged(fc: FileConfig, type: number) {
        this.selectedDict[type] = fc;
    }
    ngOnInit(): void {
        this._timeoutInterval = setInterval(() => {
            this.svc.callJsonAPI("files/all", (d: APIResponse) => {
                if (d.success) {
                    const cfglist: Array<FileConfig> = d.data.simulation_files_config.map((f: RawFileConfig) => this.ParseFileConfig(f));
                    this.clearFileDict();
                    cfglist.forEach((cfg: FileConfig) => this.fileDict[cfg.kind].push(cfg));
                }
            });
        }, 1000);
    }
    ngOnDestroy(): void {
        if (this._timeoutInterval) clearInterval(this._timeoutInterval);
    }
}