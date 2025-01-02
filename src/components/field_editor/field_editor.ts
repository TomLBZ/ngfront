import { Component, Input, OnInit, EventEmitter, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ValueEditorComponent } from '../value_editor/value_editor';

interface FieldChange {
  key: string;
  oldValue: any;
  newValue: any;
}

@Component({
  standalone: true,
  selector: 'field-editor',
  templateUrl: './field_editor.html',
  styleUrls: ['./field_editor.less'],
  imports: [CommonModule, FormsModule, ValueEditorComponent]
})
export class FieldEditorComponent implements OnInit {
  @Input() objToEdit: { [key: string]: any } = {};
  @Output() fieldChanged = new EventEmitter<FieldChange>();

  private originalObject: { [key: string]: any } = {};
  fieldKeys: string[] = [];
  expandedFields: { [key: string]: boolean } = {};

  ngOnInit() {
    this.fieldKeys = Object.keys(this.objToEdit);
    this.originalObject = JSON.parse(JSON.stringify(this.objToEdit));
  }

  trackByIndex(index: number, _: any): number {
    return index;
  }

  toggleExpand(key: string): void {
    this.expandedFields[key] = !this.expandedFields[key];
  }

  isStringType(value: any): boolean {
    return typeof value === 'string';
  }

  isNumberType(value: any): boolean {
    return typeof value === 'number';
  }

  isBooleanType(value: any): boolean {
    return typeof value === 'boolean';
  }

  isDateType(value: any): boolean {
    if (value instanceof Date) return true;
    if (typeof value === 'string') return !isNaN(Date.parse(value));
    return false;
  }

  isObjectType(value: any): boolean {
    return value && typeof value === 'object' &&
      !Array.isArray(value) && !(value instanceof Date);
  }

  isArrayType(value: any): boolean {
    return Array.isArray(value);
  }

  parseDate(value: string): Date | null {
    if (!value) return null;
    const timestamp = Date.parse(value);
    return isNaN(timestamp) ? null : new Date(timestamp);
  }

  onFieldChange(key: string, newValue: any): void {
    const oldValue = this.originalObject[key];
    if (oldValue !== newValue) {
      this.objToEdit[key] = newValue;
      this.fieldChanged.emit({ key, oldValue, newValue });
      this.originalObject[key] = newValue;
    }
  }

  onItemChange(change: FieldChange): void {
    this.fieldChanged.emit(change);
  }

  onSubFieldChanged(change: FieldChange, parentKey: string): void {
    const combinedKey = `${parentKey}.${change.key}`;
    this.fieldChanged.emit({ key: combinedKey, oldValue: change.oldValue, newValue: change.newValue });
  }

  onArrayItemChange(parentKey: string, index: number, newValue: any): void {
    const oldValue = this.originalObject[parentKey][index];
    if (oldValue !== newValue) {
      // Update the actual item
      this.objToEdit[parentKey][index] = newValue;
      // Emit the change with e.g. "myArray[2]" as the changed key
      this.fieldChanged.emit({
        key: `${parentKey}[${index}]`,
        oldValue,
        newValue
      });
      // Update the reference in originalObject
      this.originalObject[parentKey][index] = newValue;
    }
  }

  onArraySubFieldChanged(change: FieldChange, parentKey: string, index: number) {
    // E.g. combine "parentKey[ index ].childKey" -> "myArray[2].name"
    const combinedKey = `${parentKey}[${index}].${change.key}`;
    this.fieldChanged.emit({
      key: combinedKey,
      oldValue: change.oldValue,
      newValue: change.newValue
    });
  }

  addArrayItem(parentKey: string): void {
    // Decide how you want to initialize a new item; here we'll assume an empty string
    this.objToEdit[parentKey].push('');
    this.originalObject[parentKey].push('');
  }

  removeArrayItem(parentKey: string, index: number): void {
    // Remove items from both current & original references
    this.objToEdit[parentKey].splice(index, 1);
    this.originalObject[parentKey].splice(index, 1);
  }

}
