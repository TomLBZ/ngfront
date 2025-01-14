import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FieldEditorComponent } from './field_editor/field_editor';
import { Change } from './field_editor/value_editor/value_editor';

export class cloneable {
    public static deepCopy<T>(source: T): T {
      return Array.isArray(source)
      ? source.map(item => this.deepCopy(item))
      : ArrayBuffer.isView(source)
      ? structuredClone(source)
      : source instanceof Date
      ? new Date(source.getTime())
      : source && typeof source === 'object'
            ? Object.getOwnPropertyNames(source).reduce((o, prop) => {
               Object.defineProperty(o, prop, Object.getOwnPropertyDescriptor(source, prop)!);
               o[prop] = this.deepCopy((source as { [key: string]: any })[prop]);
               return o;
            }, Object.create(Object.getPrototypeOf(source)))
      : source as T;
    }
  }  

@Component({
  selector: 'obj-editor',
  standalone: true,
  templateUrl: './obj_editor.html',
  styleUrls: ['./obj_editor.less'],
  imports: [FieldEditorComponent]
})
export class ObjEditorComponent implements OnInit {
    @Input() textMode: boolean = true;
    @Input() objName: string = 'Object';
    @Input() objToEdit: any = {};
    @Input() readOnly: boolean = false;
    @Input() includeFilter: (key: string) => boolean = () => true;
    @Output() updated = new EventEmitter<any>();
    private _objCopy: any = {};

    ngOnInit(): void {
        this._objCopy = cloneable.deepCopy(this.objToEdit);
        if (this.readOnly) this.textMode = false;
    }

    toggleText(): void {
        this.textMode = !this.textMode;
    }

    getObjStr(): string {
        return JSON.stringify(this.objToEdit, null, 2);
    }

    onFieldChange(change: Change): void {
        let change_key = change.key;
        if (change_key.startsWith(this.objName)) {
            change_key = change_key.slice(this.objName.length + 1);
        }
        const segments = change_key.split('.');
        const tokens: Array<string | number> = [];
        const bracketregex = /([^\[\]]+)|\[(\d+)\]/g;
        for (const segment of segments) {
            const matches = segment.matchAll(bracketregex);
            for (const match of matches) {
                if (match[1] !== undefined) {
                    tokens.push(match[1]);
                }
                else if (match[2] !== undefined) {
                    tokens.push(parseInt(match[2]));
                }
            }
        }
        const lastToken = tokens.pop();
        if (lastToken === undefined) {
            throw new Error('lastToken is undefined');
        }
        let parent: any = this.objToEdit;
        for (const token of tokens) {
            if (!(token in parent)) {
                throw new Error('token not in parent');
            }
            parent = parent[token];
        }
        parent[lastToken] = change.newValue;
    }

    onTextChange(event: any): void {
        const value = event.target.value;
        if (typeof value === 'string') {
            const obj = JSON.parse(value);
            this.updateObj(this.objToEdit, obj);
        }
    }

    updateObj(originalobj: any, targetobj: any, key: string = "Object"): void {
        if (Object.keys(targetobj).length === 0) {
            const oldValue = originalobj;
            originalobj = targetobj;
            if (key !== "") {
                this.onFieldChange({ key, oldValue, newValue: targetobj });
            }
        }
        else {
            const isArray = Array.isArray(targetobj) || ArrayBuffer.isView(targetobj);
            const isObject = typeof targetobj === 'object' && !isArray;
            const local_keys = Object.keys(originalobj);
            for (let i = 0; i < local_keys.length; i++) {
                const local_key = local_keys[i];
                if (targetobj[local_key] === undefined) {
                    delete originalobj[local_key];
                }
                else if (originalobj[local_key] !== targetobj[local_key]) {
                    const newkey = isArray ? key + `[${local_key}]` : 
                        isObject ? key + `.${local_key}` : key;
                    this.updateObj(originalobj[local_key], targetobj[local_key], newkey);
                }
            }
        }
    }

    reset(): void {
        this.objToEdit = cloneable.deepCopy(this._objCopy);
    }

    apply(): void {
        this._objCopy = cloneable.deepCopy(this.objToEdit);
        this.updated.emit(cloneable.deepCopy(this.objToEdit)); // another copy
    }
}