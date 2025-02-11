import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
    selector: "knob",
    standalone: true,
    templateUrl: "./knob.html",
    styleUrls: ["./knob.less"]
})
export class KnobComponent {
    @Input() maxValue: number = 1;
    @Input() minValue: number = 0;
    @Input() holeWidthPerc: number = 20;
    @Input() isDraggable: boolean = false;
    @Input() showText: boolean = false;
    @Input() showNeedle: boolean = true;
    @Input() showLabel: boolean = false;
    @Input() isPercentage: boolean = false;
    @Input() isEmphasized: boolean = false;
    @Input() size: string = "100%";
    private _value: number = 0;
    get value(): number {
        return this._value;
    }
    @Input() set value(v: number) {
        const newValue = this.clampValue(v);
        if (this._value === newValue) return;
        this._value = newValue;
        this.valueChanged.emit(newValue);
    }
    @Output() valueChanged = new EventEmitter<number>();
    isDragging = false;
    readonly centerX = 50;
    readonly centerY = 50;
    readonly radius = 40;
    readonly circumference = 2 * Math.PI * this.radius;
    private clampValue(v: number): number {
        return Math.min(this.maxValue, Math.max(this.minValue, v));
    }
    get ratio() {
        const f = (this.value - this.minValue) / (this.maxValue - this.minValue);
        if (isNaN(f)) return 0;
        return f < 0 ? 0 : f > 1 ? 1 : f;
    }
    get fillAngle() {
        return 360 * this.ratio;
    }
    get needleRotation() {
        return `rotate(${this.fillAngle}deg)`;
    }
    get displayValue() {
        return this.isPercentage ? 
            Math.round(this.ratio * 100) + "%" : 
            this.value.toFixed(2).toString();
    }
    get labelValue() {
        const strMin = this.minValue.toString();
        const strMax = this.maxValue.toString();
        // padd with zeros to ensure same length
        const maxLen = Math.max(strMin.length, strMax.length);
        const minLen = Math.min(strMin.length, strMax.length);
        const pad = "0".repeat(maxLen - minLen);
        // if integer, pad to front; if float, pad to back
        const padMin = strMin.includes(".") ? strMin + pad : pad + strMin;
        const padMax = strMax.includes(".") ? strMax + pad : pad + strMax;
        const min = maxLen === strMin.length ? strMin : padMin;
        const max = maxLen === strMax.length ? strMax : padMax;
        return `${max}|${min}`;
    }

    onPointerDown(event: PointerEvent): void {
        if (!this.isDraggable) return;
        this.isDragging = true;
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
    }
    onPointerMove(event: PointerEvent): void {
        if (!this.isDragging) return;
        this.updateValueFromEvent(event);
    }
    onPointerUp(event: PointerEvent): void {
        if (!this.isDraggable) return;
        this.isDragging = false;
        this.updateValueFromEvent(event);
        (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    }
    private updateValueFromEvent(event: PointerEvent): void {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = event.clientX - cx;
        const dy = event.clientY - cy;
        const _angle = Math.atan2(dx, -dy) * 180 / Math.PI;
        const angle = _angle < 0 ? _angle + 360 : _angle;
        const newRatio = angle / 360;
        const newValue = this.minValue + newRatio * (this.maxValue - this.minValue);
        this.value = newValue;
    }
}