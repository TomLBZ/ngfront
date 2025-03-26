import { Component, OnDestroy, OnInit } from "@angular/core";
import { AppService } from "../../app.service";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { RawFileConfig, DownloadConfig, APIResponse, UploadConfig } from "../../app.interface";
import { HttpResponse } from "@angular/common/http";
import { FormDataEntry } from "../../app.interface";

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
    readonly D_JSB = 0;
    readonly C_JSB = 1;
    readonly D_PAP = 2;
    readonly C_PAP = 3;
    readonly F = 4;
    nameDict: Dict<string> = {};
    fileDict: Dict<Array<FileConfig>> = {};
    selectedDict: Dict<FileConfig> = {};
    private clearLists() {
        for (let i = 0; i < 5; i++) {
            this.fileDict[i] = [];
        }
    }
    constructor(private svc: AppService) {
        this.clearLists();
        this.nameDict[this.D_JSB] = "JSB Config List";
        this.nameDict[this.C_JSB] = "JSB Config List";
        this.nameDict[this.D_PAP] = "Paparazzi Config List";
        this.nameDict[this.C_PAP] = "Paparazzi Config List";
        this.nameDict[this.F] = "Flocking Algorithm List";
    }
    private _timeoutInterval?: any;
    repr: Function = (cfg: FileConfig) => `${cfg.name} (${cfg.id})`;
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
        const aftype: number | null = type === this.F ? null : (type === this.D_JSB || type === this.D_PAP ? 0 : 1);
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
        input.accept = '.xml';
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files === null || files.length === 0) return;
            const ucfg = this.typeToUploadConfig(type);
            const formDataEntries: Array<FormDataEntry> = [
                { name: 'file', value: files[0] },
            ];
            const payload = { type: ucfg };
            this.svc.uniPost("files/upload", payload, 'json', ...formDataEntries).subscribe({
                next: (d: APIResponse) => {
                    if (d.success) {
                        alert("Upload successful");
                    } else alert(d.msg);
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
                if (!d.body) {
                    alert("Download failed: Empty Data Response!");
                    return;
                }
                const url = window.URL.createObjectURL(d.body);
                const a = document.createElement('a');
                a.href = url;
                a.download = this.selectedDict[type].name;
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
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
                    this.clearLists();
                    cfglist.forEach((cfg: any) => this.fileDict[cfg.kind].push(cfg));
                }
            });
        }, 1000);
    }
    ngOnDestroy(): void {
        if (this._timeoutInterval) clearInterval(this._timeoutInterval);
    }
}