import { Component } from "@angular/core";
import { JoystickComponent } from "../../../components/joystick/joystick";
import { ThrottleComponent } from "../../../components/throttle/throttle";
import { Vec2 } from "../../../utils/vec/vec2";

@Component({
    selector: "page-controls",
    standalone: true,
    imports: [JoystickComponent, ThrottleComponent],
    templateUrl: "./controls.html",
    styleUrls: ["./controls.less"]
})
export class ControlsPage {
    value: number = 0.0;
    xy: Vec2 = new Vec2(0, 0);
    sensitivity: number = 0.1;
    onJoystickChanged(obj: any) {
        this.xy = obj as Vec2;
        console.log(obj);
    }
    onThrottleChanged(obj: any) {
        this.value = obj as number;
        console.log(obj);
    }
    onSensitivityChanged(obj: any) {
        this.sensitivity = obj as number;
        console.log(obj);
    }
}