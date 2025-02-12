import { Component } from "@angular/core";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";

@Component({
    selector: "page-drop-select",
    standalone: true,
    imports: [DropSelectComponent, ObjEditorComponent],
    templateUrl: "./drop_select.html"
})
export class DropSelectPage {
    objList: Array<any> = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 35 },
        { name: 'Charlie', age: 40 },
        { name: 'David', age: 45 }
    ];

    dropRepr: Function = (obj: any) => obj.name;
    selIndex: number = -1;
    textMode: boolean = false;

    get selObj() {
        return this.selIndex >= 0 ? this.objList[this.selIndex] : null;
    }

    get selName() {
        return this.selIndex >= 0 ? this.objList[this.selIndex].name : 'Null';
    }

    onUpdate(obj: any) {
        this.objList[this.selIndex] = obj;
    }

    onSelect(idx: number) {
        this.selIndex = idx;
    }
}