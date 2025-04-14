import { Component, Input } from "@angular/core";
import { DropSelectComponent } from "../dropselect/dropselect";
import { WebFile } from "../../utils/src/ctrl/webfile";

@Component({
    selector: "download",
    imports: [DropSelectComponent],
    templateUrl: "download.html"
})
export class DownloadComponent {
    @Input() title: string = "Download";
    @Input() multiple: boolean = false; // allow multiple files to be downloaded
    @Input() aszip: boolean = false; // download as a zip file
    public files: Array<WebFile> = [];
    private selectedIdx: Array<number> = [];
    onSelectionChanged(idx: Array<number> | number) {
        if (this.multiple) {
            this.selectedIdx = idx as Array<number>;
        } else {
            this.selectedIdx = [idx as number];
        }
    }
    download() {
        if (this.selectedIdx.length > 0) {
            if (this.aszip) {
                WebFile.AggregateDownloads(this.selectedIdx.map((idx) => this.files[idx]));
            } else {
                this.selectedIdx.forEach((idx) => this.files[idx].download());
            }
        }
    }
}