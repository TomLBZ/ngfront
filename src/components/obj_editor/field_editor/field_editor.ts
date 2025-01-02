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
  @Output() fieldChanged = new EventEmitter<Change>();

  expandedFields: { [key: string]: boolean } = {};

  getObjKeys(): string[] {
    return Object.keys(this.objToEdit);
  }

  toggleSelfExpand(): void {
    this.expanded = !this.expanded
  }

  toggleExpand(key: string): void {
    this.expandedFields[key] = !this.expandedFields[key];
  }

  isObjectType(value: any): boolean {
    return value && typeof value === 'object' &&
      !Array.isArray(value) && !(value instanceof Date);
  }

  isArrayType(value: any): boolean {
    return Array.isArray(value);
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
