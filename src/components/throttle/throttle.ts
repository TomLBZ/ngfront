import { Component, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { SliderComponent } from '../slider/slider';
import { KnobComponent } from '../knob/knob';

@Component({
    standalone: true,
    selector: 'throttle',
    imports: [SliderComponent, KnobComponent],
    templateUrl: './throttle.html',
    styleUrls: ['./throttle.less']
})
export class ThrottleComponent {
    @Input() upKey: string = 'w';
    @Input() downKey: string = 's';
    @Input() showText: boolean = true;
    @Input() showTitle: boolean = true;
    @Input() title: string = 'Throttle';
    private _style: string = 'v';
    get style(): string {
        return this._style;
    }
    @Input() set style (s: string) {
        const styleLower = s.toLowerCase();
        if (styleLower === 'vertical' || styleLower === 'v') this._style = 'v';
        else if (styleLower === 'horizontal' || styleLower === 'h') this._style = 'h';
        else if (styleLower === 'knob' || styleLower === 'k') this._style = 'k';
        else this._style = 'v';
    }
    get styleIsVertical(): boolean {
        return this.style === 'v';
    }
    get styleIsHorizontal(): boolean {
        return this.style === 'h';
    }
    get styleIsKnob(): boolean {
        return this.style === 'k';
    }
    private _value: number = 0.0;
    get value(): number {
        return this._value;
    }
    @Input() minValue: number = 0.0;
    @Input() maxValue: number = 1.0;
    @Input() set value(v: number) {
        const newValue = this.clampValue(v);
        if (this._value === newValue) return;
        this._value = newValue;
        this.valueChanged.emit(v);
    }
    @Output() valueChanged = new EventEmitter<number>();
    @Output() sensitivityChanged = new EventEmitter<number>();
    private _sensitivity: number = 0.1;
    get sensitivity(): number {
        return this._sensitivity;
    }
    @Input() set sensitivity(s: number) {
        const newSensitivity = this.clampValue(s);
        if (this._sensitivity === newSensitivity) return;
        this._sensitivity = newSensitivity;
        this.sensitivityChanged.emit(s);
    }
    shiftActive: boolean = false;

    private clampValue(value: number): number {
        return Math.min(Math.max(value, this.minValue), this.maxValue);
    }

    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        const upKey = this.upKey.toLowerCase();
        const downKey = this.downKey.toLowerCase();
        if (!this.shiftActive && event.shiftKey) {
            this.shiftActive = true; // toggle shift status
        }
        if (key !== upKey && key !== downKey) return;
        let newValue = this.value;
        let newSensitivity = this.sensitivity;
        if (key === this.upKey.toLowerCase()) {
            if (event.shiftKey) newSensitivity += 0.01;
            else newValue += this.sensitivity;
        } else if (key === this.downKey.toLowerCase()) {
            if (event.shiftKey) newSensitivity -= 0.01;
            else newValue -= this.sensitivity;
        }
        this.value = newValue;
        this.sensitivity = this.clampValue(newSensitivity);
    }

    @HostListener('window:keyup', ['$event'])
    onKeyUp(event: KeyboardEvent): void {
      if (!event.shiftKey && this.shiftActive) {
        this.shiftActive = false;
      }
    }

    onValueChanged(value: number): void {
        if (this.shiftActive) {
            this.sensitivity = value;
        } else {
            this.value = value;
        }
    }
}
