import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DropSelectComponent } from '../dropselect/dropselect';

@Component({
    selector: 'tableview',
    standalone: true,
    imports: [DropSelectComponent],
    templateUrl: './tableview.html',
    styleUrls: ['./tableview.less']
})
export class TableViewComponent implements OnChanges {
    @Input() data: any[] = [];
    columns: string[] = [];
    selectedColumns: string[] = [];
    repr = (item: string): string => this.getTitleCase(item);

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data'] && this.data && this.data.length > 0) {
            this.columns = Object.keys(this.data[0]);
            this.selectedColumns = [...this.columns].filter(col => this.selectedColumns.includes(col));
            if (this.selectedColumns.length === 0) {
                this.selectedColumns = [...this.columns];
            }
        } else {
            this.columns = [];
            this.selectedColumns = [];
        }
    }

    getTitleCase(value: string): string {
      if (!value) return '';
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }

    onSelectionChanged(selected: number[]) {
        if (selected.length === 0) {
            this.selectedColumns = [...this.columns];
        }
        else {
            const sortedSelected = selected.sort((a, b) => a - b);
            this.selectedColumns = sortedSelected.map(index => this.columns[index]);
        }
    }

      // Exports the current table data (using selected columns) as a CSV file.
    exportToCSV(): void {
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
        a.download = 'table_export.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    }
}