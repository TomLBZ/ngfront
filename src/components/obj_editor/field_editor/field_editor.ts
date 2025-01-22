import { Component, Input, EventEmitter, Output} from '@angular/core';
import { ValueEditorComponent, Change } from './value_editor/value_editor';

@Component({
  standalone: true,
  selector: 'field-editor',
  templateUrl: './field_editor.html',
  styleUrls: ['./field_editor.less'],
  imports: [ValueEditorComponent]
})
export class FieldEditorComponent {
  @Input() objToEdit: any = {};
  @Input() objName: string = '';
  @Input() expanded: boolean = false;
  @Input() defaultExpanded: boolean = false;
  @Input() readOnly: boolean = false;
  @Input() includeFilter: (key: string) => boolean = () => true;
  @Output() fieldChanged = new EventEmitter<Change>();

  expandedFields: { [key: string]: boolean } = {};

  getObjKeys(): string[] {
    const keys = Object.keys(this.objToEdit);
    const includedKeys = keys.filter(this.includeFilter);
    return includedKeys;
  }

  toggleSelfExpand(): void {
    this.expanded = !this.expanded
  }

  toggleExpand(key: string): void {
    this.expandedFields[key] = !this.expandedFields[key];
  }

  private _isArray(value: any): boolean {
    const isArr = Array.isArray(value);
    const isTypedArr = ArrayBuffer.isView(value);
    return isArr || isTypedArr;
  }

  isObjectType(value: any): boolean {
    return value && typeof value === 'object' &&
      !this._isArray(value) && !(value instanceof Date);
  }

  isArrayType(value: any): boolean {
    return this._isArray(value);
  }

  onArrayChanged(change: Change): void {
    const combinedKey = `${this.objName}${change.key}`;
    this.fieldChanged.emit({ key: combinedKey, oldValue: change.oldValue, newValue: change.newValue });
  }

  onFieldChanged(change: Change): void {
    const combinedKey = `${this.objName}.${change.key}`;
    this.fieldChanged.emit({ key: combinedKey, oldValue: change.oldValue, newValue: change.newValue });
  }

  onItemChanged(change: Change): void {
    this.fieldChanged.emit(change);
  }
}
