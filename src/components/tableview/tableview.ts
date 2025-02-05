import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'tableview',
  standalone: true,
  templateUrl: './tableview.html',
  styleUrls: ['./tableview.less']
})
export class TableViewComponent implements OnChanges {
  // The input data to be visualized (an array of objects)
  @Input() data: any[] = [];

  // The list of keys from the first object, used as table columns
  columns: string[] = [];

  // Update columns whenever input data changes.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data && this.data.length > 0) {
      // Use the keys from the first object as the table headers.
      this.columns = Object.keys(this.data[0]);
    } else {
      this.columns = [];
    }
  }

  // Convert a string to title case without using a pipe.
  getTitleCase(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
}
