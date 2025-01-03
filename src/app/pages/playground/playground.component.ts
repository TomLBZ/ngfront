import { Component } from "@angular/core";
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";

@Component({
    selector: "app-playground",
    standalone: true,
    imports: [ObjEditorComponent, DropSelectComponent],
    templateUrl: "./playground.component.html",
    styleUrls: ["./playground.component.less"]
})
export class PlaygroundComponent {
    // objects
    objList: Array<any> = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 35 },
        { name: 'Charlie', age: 40 },
        { name: 'David', age: 45 }
    ];
    dropRepr: Function = (obj: any) => obj.name;
    // left pane
    selIndicesL: Array<number> = [];
    // right pane
    textModeR: boolean = false;
    private selIndexR: number = -1;
    get selObjR() {
        return this.selIndexR >= 0 ? this.objList[this.selIndexR] : null;
    }

    onUpdate(obj: any) {
        console.log(obj);
    }

    onSelectR(obj: any) {
        if (typeof obj === 'number') {
            this.selIndexR = obj;
        }
    }

    onSelectL(obj: any) {
        if (Array.isArray(obj)) {
            this.selIndicesL = obj;
        }
    }
}