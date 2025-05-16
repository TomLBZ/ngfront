import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'slider',
    standalone: true,
    templateUrl: './slider.html'
})
export class SliderComponent {
    @Input() maxValue = 1;
    @Input() minValue = 0;
    @Input() isVertical = false;
    @Input() isDraggable = false;
    @Input() showText = true;
    @Input() showLabel = true;
    @Input() isPercentage = false;
    @Input() isReversed = false;
    @Input() lengthStr = '200px';
    @Input() widthStr = '20px';
    @Input() isEmphasized = false;
    private _value = 0;
    get value(): number {
        return this._value;
    }
    @Input() set value(v: number) {
        const newValue = Math.min(this.maxValue, Math.max(this.minValue, v));
        if (this._value === newValue) return;
        this._value = newValue;
        this.valueChanged.emit(newValue);
    }

    @Output() valueChanged = new EventEmitter<number>();
  
    isDragging = false;
    get ratio(): number {
        const r = (this.value - this.minValue) / (this.maxValue - this.minValue);
        if (isNaN(r)) return 0;
        return r < 0 ? 0 : r > 1 ? 1 : r;
    }
    get displayValue(): string {
        return this.isPercentage ? 
            Math.round(this.ratio * 100) + '%' : 
            this.value.toFixed(2).toString();
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

    private updateValueFromEvent(event: MouseEvent | PointerEvent): void {
        const sliderRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        this.setValueFromRatio(this.getRatioFromEvent(event.clientX, event.clientY, sliderRect));
    }
    private getRatioFromEvent(clientX: number, clientY: number, rect: DOMRect): number {
        if (!this.isVertical) {
            const offsetX = clientX - rect.left;
            return offsetX / rect.width;
        } else {
            const offsetY = rect.bottom - clientY;
            return offsetY / rect.height;
        }
    }
    private setValueFromRatio(r: number): void {
        r = Math.max(0, Math.min(1, r));
        if (this.isReversed) r = 1 - r;
        const newValue = this.minValue + r * (this.maxValue - this.minValue);
        this.value = newValue;
    }
}