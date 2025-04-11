import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DropSelectComponent } from '../dropselect/dropselect';
import { Pair } from '../../utils/types';

@Component({
    selector: 'tableview',
    standalone: true,
    imports: [DropSelectComponent],
    templateUrl: './tableview.html'
})
export class TableViewComponent implements OnChanges {
    @Input() data: any[] = [];
    @Input() exportName = 'Export.csv';
    @Input() pageSize = 10;
    @Input() dataContainsAllPages = true; // true if data contains all pages, false if data contains only current page
    @Output() pageChanged = new EventEmitter<Pair<number>>();
    @Output() selectedColumnsChanged = new EventEmitter<string[]>();
    public totalCount = 0;
    public columns: string[] = [];
    public selectedColumns: string[] = [];
    public isShowAllPages: boolean = false;
    public currentPage: number = 1;
    public readonly repr = (item: string): string => item ? item.charAt(0).toUpperCase() + item.slice(1).toLowerCase() : '';
    public get isFirstPage(): boolean { return this.currentPage === 1; }
    public get isLastPage(): boolean { return this.currentPage === this.lastPageIdx; }
    public get lastPageIdx(): number { 
        const num = this.totalCount / this.pageSize;
        const intNum = Math.ceil(num);
        return num === intNum ? intNum + 1 : intNum;
    }
    public get pageInfo(): string {
        if (this.totalCount <= 0) return 'No data available';
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.totalCount);
        return `${start} - ${end} of ${this.totalCount}`;
    }
    public get currentPageData(): any[] {
        if (this.dataContainsAllPages) {
            return this.data.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
        }
        return this.data.length > this.pageSize ? this.data.slice(0, this.pageSize) : this.data;
    }
    private prevPageSize: number = 0;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data'] && this.data && this.data.length > 0) {
            this.columns = Object.keys(this.data[0]);
            this.selectedColumns = [...this.columns].filter(col => this.selectedColumns.includes(col));
            if (this.selectedColumns.length === 0) {
                this.selectedColumns = [...this.columns];
            }
            this.totalCount = this.data.length;
        } else {
            this.columns = [];
            this.selectedColumns = [];
            this.totalCount = 0;
            this.currentPage = 1;
        }
    }

    onSelectionChanged(selected: number[]) {
        if (selected.length === 0) {
            this.selectedColumns = [...this.columns];
        }
        else {
            const sortedSelected = selected.sort((a, b) => a - b);
            this.selectedColumns = sortedSelected.map(index => this.columns[index]);
        }
        this.selectedColumnsChanged.emit(this.selectedColumns);
    }
    // Exports the current table data (using selected columns) as a CSV file.
    onExport(): void {
        if (!this.data || this.data.length === 0 || !this.selectedColumns.length) {
            return;
        }
        let csvContent = '';
        // Create the header row using the filtered column names.
        csvContent += this.selectedColumns.join(',') + "\r\n";
        // Create data rows.
        this.data.forEach(row => {
            const rowData = this.selectedColumns.map(col => {
                let cell = row[col] != null ? row[col] : '';
                // If the cell is a string that contains a comma, quote or newline, escape it.
                if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                    cell = '"' + cell.replace(/"/g, '""') + '"';
                }
                return cell;
            }).join(',');
            csvContent += rowData + "\r\n";
        });
        // Create a Blob with CSV data and trigger a download.
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.exportName;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    onPrevButtonClicked() {
        this.currentPage = Math.max(1, this.currentPage - 1);
        this.pageChanged.emit([this.currentPage, this.pageSize]);
    }
    onNextButtonClicked() {
        this.currentPage = Math.min(this.lastPageIdx, this.currentPage + 1);
        this.pageChanged.emit([this.currentPage, this.pageSize]);
    }
    onIsShowAllPagesChanged() {
        this.isShowAllPages = !this.isShowAllPages;
        if (this.isShowAllPages) this.onPageSizeChangedInner(this.totalCount);
        else this.onPageSizeChangedInner(this.prevPageSize);
    }
    onPageSizeChangedInner(num: number) {
        this.prevPageSize = this.pageSize;
        this.pageSize = num;
        this.currentPage = 1;
        this.pageChanged.emit([this.currentPage, this.pageSize]);
    }
    onPageSizeChanged(event: any) {
        const newPageSizeStr = event.target.value as string;
        const newPageSize = parseInt(newPageSizeStr);
        if (newPageSize <= 0 || newPageSize > this.totalCount) alert(`Invalid page size: Must be between 1 and ${this.totalCount}`);
        else this.onPageSizeChangedInner(newPageSize);
    }
    onCurrentPageChanged(event: any) {
        const newPageStr = event.target.value as string;
        const newPage = parseInt(newPageStr);
        if (newPage <= 0 || newPage > this.lastPageIdx) alert(`Invalid page: Must be between 1 and ${this.lastPageIdx}`);
        else {
            this.currentPage = newPage;
            this.pageChanged.emit([this.currentPage, this.pageSize]);
        }
    }
}