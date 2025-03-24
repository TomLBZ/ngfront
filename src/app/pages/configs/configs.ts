import { Component, OnDestroy, OnInit } from "@angular/core";
import { AppService } from "../../app.service";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { RawFileConfig, DownloadConfig } from "../../app.interface";

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
            case "jsb":
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
    private ConfigToDownload(cfg: FileConfig): DownloadConfig {
        const aftype: number | null = cfg.kind === this.F ? null : (cfg.kind === this.D_JSB || cfg.kind === this.D_PAP ? 0 : 1);
        const typestr = cfg.kind === this.F ? "flocking_algo" : cfg.kind === this.D_JSB || cfg.kind === this.C_JSB ? "jsb" : "pprz";
        return {
            id: cfg.id,
            type: {
                file_type: typestr,
                airframe_type: aftype
            }
        } as DownloadConfig;
    }
    onUpload(type: number) {
    }
    onDownload(type: number) {
        this.svc.callAPI("files/download", console.log, JSON.stringify(this.ConfigToDownload(this.selectedDict[type])), console.error);
    }
    onApply(type: number) {
    }
    onSelectionChanged(fc: FileConfig, type: number) {
        this.selectedDict[type] = fc;
    }
    ngOnInit(): void {
        this._timeoutInterval = setInterval(() => {
            this.svc.callAPI("files/all", (d: any) => {
                const cfglist: Array<FileConfig> = d.simulation_files_config.map((f: RawFileConfig) => this.ParseFileConfig(f));
                this.clearLists();
                cfglist.forEach((cfg: any) => this.fileDict[cfg.kind].push(cfg));
            });
        }, 1000);
    }
    ngOnDestroy(): void {
        if (this._timeoutInterval) clearInterval(this._timeoutInterval);
    }
}