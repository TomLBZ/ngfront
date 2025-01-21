import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
    selector: 'dropselect',
    standalone: true,
    templateUrl: './dropselect.html',
    styleUrls: ['./dropselect.less']
})
export class DropSelectComponent {
    @Input() items: any[] = [];
    private _defaultItem: any = null;
    get defaultItem() {
        return this._defaultItem;
    }
    @Input() set defaultItem(item: any) {
        this._defaultItem = item;
        if (item) {
            const index = this.items.indexOf(item);
            if (index >= 0) {
                this.selectedIndices = [index];
            }
        }
    }
    @Input() representation: Function = (a: any) => a;
    @Input() indexMode: boolean = false;
    @Input() hoverMode: boolean = false;
    @Input() multiSelect: boolean = false;
    @Input() fixDropdown: boolean = false;
    @Input() title: string = "";
    @Output() selectionChanged = new EventEmitter<any>();

    searchTerm: string = "";
    showDropdown: boolean = this.fixDropdown;
    private mouseOver: boolean = false;
    private selectedIndices: number[] = [];

    get selected() {
        if (this.multiSelect) {
            return this.indexMode ? this.selectedIndices : 
                this.selectedIndices.map((i: number) => this.items[i]);
        }
        else {
            return this.indexMode ? this.selectedIndices[0] :
                this.items[this.selectedIndices[0]];
        }
    }

    get filteredItems() {
        return this.items.filter((item: any) => this.searchTerm.length > 0 ?
            (this.representation(item) as string).toLowerCase().includes(this.searchTerm.toLowerCase()) :
            true);
    }

    get placeholder() {
        if (this.multiSelect) {
            return this.selectedIndices.length > 0 ? 
                this.selectedIndices.map((i: number) => this.representation(this.items[i])).join(", ") :
                "Select / Search items";
        }
        else {
            return this.selectedIndices.length > 0 ? 
                this.representation(this.items[this.selectedIndices[0]]) :
                "Select / Search item";
        }
    }

    toggleDropdown() {
        if (!this.hoverMode) this.showDropdown = this.fixDropdown || !this.showDropdown;
    }

    onMouseEnter() {
        this.mouseOver = true;
        if (this.hoverMode) this.showDropdown = true;
    }

    onMouseLeave() {
        this.mouseOver = false;
        if (this.hoverMode) this.showDropdown = this.fixDropdown;
    }

    clearSearch() {
        this.searchTerm = "";
    }

    onSearchChanged(event: Event) {
        this.searchTerm = ((event as InputEvent).target as HTMLInputElement).value;
    }

    onSearchFocus() {
        this.showDropdown = true;
    }

    onSearchBlur() {
        this.showDropdown = this.fixDropdown || this.mouseOver;
    }

    onSelectItem(index: number, isEmitting: boolean = true) {
        if (this.multiSelect) {
            if (this.selectedIndices.includes(index)) {
                this.selectedIndices = this.selectedIndices.filter((i: number) => i !== index);
            }
            else {
                this.selectedIndices.push(index);
            }
        }
        else { // single select
            this.selectedIndices = [index];
            this.showDropdown = this.fixDropdown;
        }
        this.searchTerm = ''; // clear search after selection
        if (isEmitting) this.selectionChanged.emit(this.selected);
    }

    isItemSelected(index: number) {
        return this.selectedIndices.includes(index);
    }

    getIndex(item: any) {
        return this.items.indexOf(item);
    }
}