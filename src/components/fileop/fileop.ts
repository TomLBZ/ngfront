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
    @Input() representation: Function = (item: any) => item;
    @Input() buttonsShown: Array<string> = ["download", "upload", "apply", "rename", "duplicate", "delete"];
    @Input() applyBusy: boolean = false;
    @Output() selectionChanged  = new EventEmitter<Array<any>>();
    @Output() downloadClicked   = new EventEmitter<Array<any>>();
    @Output() uploadClicked     = new EventEmitter<void>();
    @Output() applyClicked      = new EventEmitter<Array<any>>();
    @Output() renameClicked     = new EventEmitter<Array<any>>();
    @Output() duplicateClicked  = new EventEmitter<Array<any>>();
    @Output() deleteClicked     = new EventEmitter<Array<any>>();
    
    public get itemSelected(): boolean { return this.selectedItems.length > 0; }
    // @Input() items: Array<any> = [];
    private _items: Array<any> = [];
    @Input() set items(value: Array<any>) {
        const newIndices = this.selectedIndices.filter(i => i < value.length);
        this._items = value;
        this.selectedIndices = newIndices.length > 0 ? newIndices : [];
        const newItems = this._items.filter((_, i) => this.selectedIndices.includes(i));
        this.selectedItems = this.multiple ? newItems : value.length > 0 ? [value[0]] : [];
    }
    public get items(): Array<any> {
        return this._items;
    }
    // @Input() selectedIndices: Array<number> = [];
    private _selectedIndices: Array<number> = [];
    @Input() set selectedIndices(value: Array<number>) {
        this._selectedIndices = value;
        const newItems = this._items.filter((_, i) => this._selectedIndices.includes(i));
        this.selectedItems = this.multiple ? newItems : newItems.length > 0 ? [newItems[0]] : [];
    }
    public get selectedIndices(): Array<number> {
        return this._selectedIndices;
    }
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