import { Component } from "@angular/core";
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";
import { FieldEditorComponent } from "../../../components/obj_editor/field_editor/field_editor";
import { ValueEditorComponent } from "../../../components/obj_editor/value_editor/value_editor";

@Component({
    selector: "page-obj-editing",
    standalone: true,
    imports: [ObjEditorComponent, FieldEditorComponent, ValueEditorComponent],
    templateUrl: "./obj_editing.html"
})
export class ObjEditingPage {

    myObj: any = {
        name: 'Alice',
        age: 30,
        isActive: true,
        startDate: new Date(Date.now()),
        numlist: [1, 2, 3],
        obj: {
            key: 'value',
            name: 'Bob',
            numlist: [4, 5, 6]
        },
        objlist: [
            { name: 'Charlie', age: 25 },
            { name: 'David', age: 35 }
        ],
        nested: {
            key: 'value',
            name: 'Eve',
            inner: {
                key: 'value',
                name: 'Frank'
            }
        },
        listoflists: [
            [1, 2, 3],
            [
                [7, 8, 9],
                [10, 11, 12]
            ]
        ]
    }
    textMode: boolean = false;
    teststr = "test";

    onUpdate(obj: any) {
        this.myObj = obj;
    }
}