import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Vec2 } from '../../utils/vec/vec2';

@Component({
    standalone: true,
    selector: 'joystick',
    templateUrl: './joystick.html'
})
export class JoystickComponent {
    @ViewChild('joystickBase', { static: true }) joystickBaseRef!: ElementRef;
    @ViewChild('joystickKnob', { static: true }) joystickKnobRef!: ElementRef;
    @Input() baseSizeStr: string = '200px';
    @Input() knobSizeStr: string = '60px';
    @Input() knobText: string = '';
    @Input() showValues: boolean = false;
    @Input() showTitle: boolean = false;
    @Input() showBorder: boolean = false;
    @Input() title: string = 'Joystick';
    @Output() valueChanged = new EventEmitter<Vec2>();

    private get baseSizePx(): number {
        if (this.joystickBaseRef === undefined) {
            return 200;
        }
        const joystickBase = this.joystickBaseRef.nativeElement as HTMLElement;
        return joystickBase.clientWidth;
    }
    private get knobSizePx(): number {
        if (this.joystickKnobRef === undefined) {
            return 60;
        }
        const joystickKnob = this.joystickKnobRef.nativeElement as HTMLElement;
        return joystickKnob.clientWidth;
    }
    private get radius(): number {
        return this.baseSizePx / 2 - this.knobSizePx / 2;
    }
    private get center(): number {
        return this.baseSizePx / 2;
    }
    private x_offset: number = 0;
    private y_offset: number = 0;
    get knobX(): number {
        return this.center + this.x_offset;
    }
    get knobY(): number {
        return this.center + this.y_offset;
    }
    isDragging = false;
    horizontalValue = 0;
    verticalValue = 0;

    onPointerDown(event: PointerEvent): void {
        event.preventDefault();
        this.isDragging = true;
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
    }

    onPointerMove(event: PointerEvent): void {
        if (!this.isDragging) {
            return;
        }
        const baseElem = this.joystickBaseRef.nativeElement as HTMLElement;
        const rect = baseElem.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const dx = mouseX - this.center;
        const dy = mouseY - this.center;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let limitedX = dx;
        let limitedY = dy;
        if (distance > this.radius) {
            const angle = Math.atan2(dy, dx);
            limitedX = Math.cos(angle) * this.radius;
            limitedY = Math.sin(angle) * this.radius;
        }
        this.x_offset = limitedX;
        this.y_offset = limitedY;
        this.horizontalValue = limitedX / this.radius;
        this.verticalValue = -limitedY / this.radius;
        this.valueChanged.emit(new Vec2(this.horizontalValue, this.verticalValue));
    }

    onPointerUp(event: PointerEvent): void {
        if (this.isDragging) {
            this.x_offset = 0;
            this.y_offset = 0;
            this.horizontalValue = 0;
            this.verticalValue = 0;
            (event.target as HTMLElement).releasePointerCapture(event.pointerId);
            this.isDragging = false;
        }
    }
}
