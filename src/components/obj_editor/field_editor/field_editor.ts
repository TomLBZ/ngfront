import { Component, Input, EventEmitter, Output} from '@angular/core';
import { ValueEditorComponent, Change } from '../value_editor/value_editor';
import { Color } from '../../../utils/color/color';
import { Func1 } from '../../../utils/type/types';

@Component({
    standalone: true,
    selector: 'field-editor',
    imports: [ValueEditorComponent],
    templateUrl: './field_editor.html'
})
export class FieldEditorComponent {
    @Input() set objToEdit(obj: any) {
        this._objToEdit = obj;
        this._isArrayLike = undefined;
        this._isArrayBufferLike = undefined;
        this._isObject = undefined;
    }
    @Input() objName: string = '';
    @Input() fullObjName: string = '';
    @Input() expanded: boolean = false;
    @Input() readOnly: boolean = false;
    @Input() showBorder: boolean = false;
    @Input() scrollChildren: boolean = false;
    @Input() includeFieldFilter: Func1<string, boolean> = () => true; // default to include all fields
    @Input() readOnlyFieldFilter: Func1<string, boolean> = () => false; // default to editable all fields
    @Input() expandFieldFilter: Func1<string, boolean> = () => true; // default to expand all fields
    @Output() fieldChanged = new EventEmitter<Change>();
    private _isArrayLike?: boolean = undefined;
    private _isArrayBufferLike?: boolean = undefined;
    private _isObject?: boolean = undefined;
    private _objToEdit: any = {};
    public get objToEdit(): any { return this._objToEdit; }
    public get isArray(): boolean {
        if (this._isArrayLike === undefined) this._isArrayLike = Array.isArray(this.objToEdit);
        if (this._isArrayBufferLike === undefined) this._isArrayBufferLike = ArrayBuffer.isView(this.objToEdit);
        return this._isArrayLike || this._isArrayBufferLike;
    }
    public get isObject(): boolean {
        if (this._isObject !== undefined) return this._isObject;
        this._isObject = this.objToEdit !== undefined && this.objToEdit !== null && (typeof this.objToEdit) === 'object' &&
            !this.isArray && !(this.objToEdit instanceof Date) && !(this.objToEdit instanceof Color);
        return this._isObject;
    }
    public get typeStr(): string { return this.isObject ? '<Object>' : this.isArray ? '<Array>' : '<Value>'; }
    public get keys(): string[] {
        const keys = this.isObject ? Object.keys(this.objToEdit) : this.isArray ? this.getArrayKeys() : [];
        return keys.filter(this.includeFieldFilter);
    }
    private getArrayKeys(): string[] { // only called if isArray has been computed
        if (this._isArrayLike) { // ArrayLike takes precedence over ArrayBufferLike
            const arrObj = this.objToEdit as ArrayLike<any>;
            return Array.from({ length: arrObj.length }, (_, i) => i.toString());
        }
        const arrObj = this.objToEdit as ArrayBufferLike;
        return Array.from({ length: arrObj.byteLength }, (_, i) => i.toString());
    }
    fieldName(key: string): string {
        return this.isArray ? `[${key}]` : key;
    }
    fieldFullName(key: string): string {
        return this.fullObjName.length > 0 ?
            this.isArray ? `${this.fullObjName}[${key}]` : `${this.fullObjName}.${key}` :
            this.fieldName(key); // if fullObjName is empty, we are at the root, full name is just field name
    }
    fieldReadOnly(key: string): boolean {
        return this.readOnly || this.readOnlyFieldFilter(this.fieldFullName(key));
    }
    fieldExpanded(key: string): boolean {
        return this.expanded || this.expandFieldFilter(this.fieldFullName(key));
    }
    toggleSelfExpand(): void {
        this.expanded = !this.expanded
    }
    onFieldChanged(change: Change): void {
        const combinedKey = this.isArray ? `${this.objName}${change.key}` : `${this.objName}.${change.key}`;
        this.fieldChanged.emit({ key: combinedKey, oldValue: change.oldValue, newValue: change.newValue });
    }
    onItemChanged(change: Change): void {
      this.fieldChanged.emit(change);
    }
}
