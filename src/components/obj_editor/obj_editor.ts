import { Component, Input, Output, EventEmitter } from '@angular/core';
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
export class ObjEditorComponent {
    @Input() textMode: boolean = true;
    @Input() objName: string = 'Object';
    @Input() readOnly: boolean = false;
    @Input() defaultExpanded: boolean = false;
    @Input() includeFilter: (key: string) => boolean = () => true;
    @Output() updated = new EventEmitter<any>();
    private _objToEdit: any = {};
    private _objRef: any = {};
    get objToEdit() {
        return this._objToEdit;
    }
    @Input() set objToEdit(obj: any) {
        this._objRef = obj;
        this._objToEdit = cloneable.deepCopy(obj);
    }
    errorState: boolean = false;

    toggleText(): void {
        this.textMode = !this.textMode;
    }

    private getObjKeys(obj: any): string[] {
        const keys = Object.keys(obj);
        const includedKeys = keys.filter(this.includeFilter);
        return includedKeys;
    }

    getObjStr(obj?: any): string {
        obj = obj === undefined ? this._objToEdit : obj;
        const isArray = this.isArray(obj);
        const isObject = this.isObject(obj, isArray);
        if (!isArray && !isObject) {
            return JSON.stringify(obj, null, 2);
        }
        if (isObject) {
            const keys = this.getObjKeys(obj);
            const partialObj: any = {};
            for (const key of keys) {
                partialObj[key] = obj[key];
            }
            return JSON.stringify(partialObj, null, 2);
        }
        const subStrs = [];
        for (let i = 0; i < obj.length; i++) {
            subStrs.push(this.getObjStr(obj[i]));
        }
        const jsonStr = subStrs.join(',\n');
        return `[\n${jsonStr}\n]`;
    }

    onFieldChange(change: Change): void {
        let change_key = change.key;
        if (change_key.startsWith(this.objName)) {
            change_key = change_key.slice(this.objName.length);
            if (change_key.startsWith('.'))change_key = change_key.slice(1);
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
        let parent: any = this._objToEdit;
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
            let obj = {};
            try {
                obj = JSON.parse(value);
            } catch (e) {
                this.errorState = true;
                return;
            }
            this.errorState = false;
            this.updateObj(this._objToEdit, obj, this.objName);
        }
    }
    private isArray(obj: any): boolean {
        return Array.isArray(obj) || ArrayBuffer.isView(obj);
    }
    private isObject(obj: any, isArray: boolean = false): boolean {
        return typeof obj === 'object' && !isArray;
    }
    updateObj(originalobj: any, targetobj: any, key: string = "Object"): void {
        if (Object.keys(targetobj).length === 0) {
            this.onFieldChange({ key, oldValue: originalobj, newValue: targetobj });
        }
        else {
            const isArray = this.isArray(targetobj);
            const isObject = this.isObject(targetobj, isArray);
            const targetKeys = Object.keys(targetobj);
            for (let i = 0; i < targetKeys.length; i++) {
                const targetKey = targetKeys[i];
                const newKey = isArray ? `${key}[${targetKey}]` :
                    isObject ? `${key}.${targetKey}` : key;
                if (originalobj[targetKey] === undefined) {
                    this.onFieldChange({ key: newKey, oldValue: undefined, newValue: targetobj[targetKey] });
                }
                else if (originalobj[targetKey] !== targetobj[targetKey]) {
                    this.updateObj(originalobj[targetKey], targetobj[targetKey], newKey);
                }
            }
            const originalKeys = this.getObjKeys(originalobj);
            const removedKeys = originalKeys.filter((key) => !targetKeys.includes(key));
            for (let i = 0; i < removedKeys.length; i++) {
                delete originalobj[removedKeys[i]];
            }
        }
    }

    reset(): void {
        this._objToEdit = cloneable.deepCopy(this._objRef);
    }

    apply(): void {
        this.objToEdit = this._objToEdit; // update reference and create deep copy
        this.updated.emit(cloneable.deepCopy(this._objToEdit)); // emit deep copy
    }
}