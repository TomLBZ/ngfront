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
    @Input() baseSize: number = 200;
    @Input() knobSize: number = 60;
    @Input() knobText: string = '';
    @Input() showValues: boolean = false;
    @Output() valueChanged = new EventEmitter<Vec2>();

    radius = this.baseSize / 2 - this.knobSize / 2;
    centerX = this.baseSize / 2;
    centerY = this.baseSize / 2;
    knobX = this.centerX;
    knobY = this.centerY;
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
        const dx = mouseX - this.centerX;
        const dy = mouseY - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let limitedX = dx;
        let limitedY = dy;
        if (distance > this.radius) {
            const angle = Math.atan2(dy, dx);
            limitedX = Math.cos(angle) * this.radius;
            limitedY = Math.sin(angle) * this.radius;
        }
        this.knobX = this.centerX + limitedX;
        this.knobY = this.centerY + limitedY;
        this.horizontalValue = limitedX / this.radius;
        this.verticalValue = -limitedY / this.radius;
        this.valueChanged.emit(new Vec2(this.horizontalValue, this.verticalValue));
    }

    onPointerUp(event: PointerEvent): void {
        if (this.isDragging) {
            this.isDragging = false;
            this.knobX = this.centerX;
            this.knobY = this.centerY;
            this.horizontalValue = 0;
            this.verticalValue = 0;
            (event.target as HTMLElement).releasePointerCapture(event.pointerId);
        }
    }
}
