import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";

interface ValueChange {
    key: string;
    oldValue: any;
    newValue: any;
}

@Component({
    standalone: true,
    selector: "value-editor",
    templateUrl: "./value_editor.html",
    styleUrls: ["./value_editor.less"]
})
export class ValueEditorComponent implements OnInit {
    @Input() itemName: string = "";
    @Input() itemToEdit: any = {};
    @Output() itemChanged = new EventEmitter<ValueChange>();
    private originalItem: any = {};

    ngOnInit(): void {
        this.originalItem = JSON.parse(JSON.stringify(this.itemToEdit));
    }

    isStringType(value: any): boolean {
        return typeof value === "string";
    }

    isNumberType(value: any): boolean {
        return typeof value === "number";
    }

    isBooleanType(value: any): boolean {
        return typeof value === "boolean";
    }

    isDateType(value: any): boolean {
        if (value instanceof Date) return true;
        if (typeof value === "string") return !isNaN(Date.parse(value));
        return false;
    }

    parseDate(value: string): Date | null {
        if (!value) return null;
        const timestamp = Date.parse(value);
        return isNaN(timestamp) ? null : new Date(timestamp);
    }

    onItemChange(event: any): void {
        const targetValue: string = event.target.value;
        let newValue: any;
        if (this.isNumberType(this.itemToEdit)) {
            newValue = parseFloat(targetValue);
        } else if (this.isBooleanType(this.itemToEdit)) {
            newValue = event.target.checked;
        } else if (this.isDateType(this.itemToEdit)) {
            newValue = this.parseDate(targetValue);
        } else {
            newValue = targetValue;
        }
        const oldValue = this.originalItem;
        if (oldValue !== newValue) {
            this.itemToEdit = newValue;
            this.itemChanged.emit({ key: this.itemName, oldValue, newValue });
            this.originalItem = newValue;
        }
    }

    formatDateForInput(value: any): string {
        if (!this.isDateType(value)) return "";
        const dateObj = typeof value === "string" ? this.parseDate(value) : (value as Date);
        if (!dateObj) return "";
        const year = dateObj.getFullYear();
        const month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
        const day = ('0' + dateObj.getDate()).slice(-2);
        return `${year}-${month}-${day}`;
    }
}