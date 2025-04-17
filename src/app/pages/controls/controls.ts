import { Component } from "@angular/core";
import { JoystickComponent } from "../../../components/joystick/joystick";
import { ThrottleComponent } from "../../../components/throttle/throttle";
import { Vec2 } from "../../../utils/math";

@Component({
    selector: "page-controls",
    standalone: true,
    imports: [JoystickComponent, ThrottleComponent],
    templateUrl: "./controls.html"
})
export class ControlsPage {
    value: number = 0.0;
    xy: Vec2 = Vec2.New(0, 0);
    sensitivity: number = 0.1;
    private num2Str(n: number, dp: number): string {
        return n.toFixed(dp);
    }
    onJoystickChanged(v: Vec2) {
        console.log(this.num2Str(v.x, 2) + ", " + this.num2Str(v.y, 2));
    }
    onThrottleChanged(n: number) {
        console.log("v: " + this.num2Str(n, 2));
    }
    onSensitivityChanged(n: number) {
        console.log("dv: " + this.num2Str(n, 2));
    }
}