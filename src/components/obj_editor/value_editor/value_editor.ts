import { Component, Input, Output, EventEmitter } from "@angular/core";
import { Dates } from "../../../utils/src/ds/dates";
import { Color } from "../../../utils/src/graphics/color";

export interface Change {
    key: string;
    oldValue: any;
    newValue: any;
}

@Component({
    standalone: true,
    selector: "value-editor",
    templateUrl: "./value_editor.html"
})
export class ValueEditorComponent {
    @Input() itemName: string = "";
    @Input() readOnly: boolean = false;
    @Input() itemToEdit: any = {};
    @Input() showBorder: boolean = false;
    @Output() itemChanged = new EventEmitter<Change>();

    getInputType(): string {
        if (this.isString(this.itemToEdit)) return "text";
        if (this.isNumber(this.itemToEdit)) return "number";
        if (this.isBoolean(this.itemToEdit)) return "checkbox";
        if (Dates.isDate(this.itemToEdit)) return "datetime-local";
        if (this.isColor(this.itemToEdit)) return "color";
        return "unsupported";
    }

    get itemStr(): string {
        if (Dates.isDate(this.itemToEdit)) return Dates.toInputString(this.itemToEdit);
        else if (this.isColor(this.itemToEdit)) return (this.itemToEdit as Color).hex7;
        else if (this.isString(this.itemToEdit)) return this.itemToEdit;
        return this.itemToEdit.toString();
    }

    get checked(): boolean {
        return this.isBoolean(this.itemToEdit) ? this.itemToEdit : false;
    }

    isString(value: any): boolean {
        return typeof value === "string";
    }

    isNumber(value: any): boolean {
        return typeof value === "number";
    }

    isBoolean(value: any): boolean {
        return typeof value === "boolean";
    }

    isColor(value: any): boolean {
        return value !== null && value !== undefined && value instanceof Color;
    }

    onItemChange(event: any): void {
        const targetValue: string = event.target.value;
        let newValue: any;
        if (this.isNumber(this.itemToEdit)) {
            newValue = targetValue ? parseFloat(targetValue) : 0;
        } else if (this.isBoolean(this.itemToEdit)) {
            newValue = event.target.checked;
        } else if (Dates.isDate(this.itemToEdit)) {
            newValue = Dates.fromInputString(targetValue);
        } else if (this.isColor(this.itemToEdit)) {
            newValue = Color.fromHex7(targetValue);
        } else {
            newValue = targetValue;
        }
        if (this.itemToEdit !== newValue) {
            const oldValue = this.itemToEdit;
            this.itemToEdit = newValue;
            this.itemChanged.emit({ key: this.itemName, oldValue, newValue });
        }
    }
}