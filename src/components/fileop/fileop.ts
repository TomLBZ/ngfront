import { Component, Input, Output, EventEmitter } from "@angular/core";
import { DropSelectComponent } from "../dropselect/dropselect";

@Component({
    selector: "fileop",
    imports: [DropSelectComponent],
    templateUrl: "fileop.html"
})
export class FileOpComponent {
    @Input() title: string = "Download";
    @Input() multiple: boolean = false; // allow multiple files to be downloaded
    @Input() items: Array<any> = [];
    @Input() representation: Function = (item: any) => item;
    @Input() buttonsShown: Array<string> = ["download", "upload", "apply", "rename", "duplicate", "delete"];
    @Output() selectionChanged  = new EventEmitter<Array<any>>();
    @Output() downloadClicked   = new EventEmitter<Array<any>>();
    @Output() uploadClicked     = new EventEmitter<void>();
    @Output() applyClicked      = new EventEmitter<Array<any>>();
    @Output() renameClicked     = new EventEmitter<Array<any>>();
    @Output() duplicateClicked  = new EventEmitter<Array<any>>();
    @Output() deleteClicked     = new EventEmitter<Array<any>>();
    
    public get itemSelected(): boolean { return this.selectedItems.length > 0; }
    private selectedItems: Array<any> = [];
    onSelectionChanged(sel: Array<any> | any) {
        this.selectedItems = this.multiple ? sel as Array<any> : [sel as any];
        this.selectionChanged.emit(this.selectedItems);
    }
    onDownload() {
        this.downloadClicked.emit(this.selectedItems);
    }
    onUpload() {
        this.uploadClicked.emit();
    }
    onApply() {
        this.applyClicked.emit(this.selectedItems);
    }
    onRename() {
        this.renameClicked.emit(this.selectedItems);
    }
    onDuplicate() {
        this.duplicateClicked.emit(this.selectedItems);
    }
    onDelete() {
        this.deleteClicked.emit(this.selectedItems);
    }
}