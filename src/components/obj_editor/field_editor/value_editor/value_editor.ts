import { Component, Input, Output, EventEmitter } from "@angular/core";

export interface Change {
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
export class ValueEditorComponent {
    @Input() itemName: string = "";
    @Input() readOnly: boolean = false;
    @Input() itemToEdit: any = {};
    @Output() itemChanged = new EventEmitter<Change>();

    getInputType(): string {
        if (this.isStringType(this.itemToEdit)) return "text";
        if (this.isNumberType(this.itemToEdit)) return "number";
        if (this.isBooleanType(this.itemToEdit)) return "checkbox";
        if (this.isDateType(this.itemToEdit)) return "date";
        return "unsupported";
    }

    getStringRepresentation(): string {
        if (this.isDateType(this.itemToEdit)) return this.formatDateForInput(this.itemToEdit);
        return this.itemToEdit.toString();
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
        if (!isNaN(timestamp)) return new Date(timestamp);
        const dateStringRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
        if (dateStringRegex.test(value)) return new Date(value);
        return null;
    }

    onItemChange(event: any): void {
        const targetValue: string = event.target.value;
        let newValue: any;
        if (this.isNumberType(this.itemToEdit)) {
            newValue = targetValue ? parseFloat(targetValue) : 0;
        } else if (this.isBooleanType(this.itemToEdit)) {
            newValue = event.target.checked;
        } else if (this.isDateType(this.itemToEdit)) {
            newValue = this.parseDate(targetValue);
        } else {
            newValue = targetValue;
        }
        if (this.itemToEdit !== newValue) {
            const oldValue = this.itemToEdit;
            this.itemToEdit = newValue;
            this.itemChanged.emit({ key: this.itemName, oldValue, newValue });
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