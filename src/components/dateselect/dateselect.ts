import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Nullable, Pair } from '../../utils/types';

@Component({
    selector: 'dateselect',
    templateUrl: './dateselect.html',
    standalone: true
})
export class DateSelectComponent implements OnInit {
    @Output() dateRangeChanged = new EventEmitter<Pair<Nullable<Date>>>();
    @Input() currentDate: Date = new Date(); // default to current date
    @Input() singleDateMode = true;       // if true, only one date is selectable
    @Input() set allowedDateStrs(dateStrs: string[]) {
        this.allowedDateSet = new Set<string>(dateStrs);
        this.selectedStart = null;
        this.selectedEnd = null;
    }
    public displayedYear = 2025;
    public displayedMonth = 3; // 1=January, 12=December. Default to March 2025 here.
    public daysInMonth: Date[] = [];
    private allowedDateSet = new Set<string>();
    private selectedStart: Date | null = null;
    private selectedEnd: Date | null = null;

    ngOnInit() {
        this.displayedYear = this.currentDate.getFullYear();
        this.displayedMonth = this.currentDate.getMonth() + 1; // Months are 0-indexed in JS
        this.generateCalendar();
    }
    generateCalendar() {
        this.daysInMonth = [];
        const startDate = new Date(this.displayedYear, this.displayedMonth - 1, 1);
        const endDate = new Date(this.displayedYear, this.displayedMonth, 0);
        for (let day = startDate.getDate(); day <= endDate.getDate(); day++) {
            this.daysInMonth.push(new Date(this.displayedYear, this.displayedMonth - 1, day));
        }
    }
    isAllowed(date: Date): boolean {
        return this.allowedDateSet.has(date.toDateString());
    }
    isSelected(date: Date): boolean {
        if (!this.selectedStart) return false;
        if (this.singleDateMode || !this.selectedEnd) return date.toDateString() === this.selectedStart.toDateString();
        else { // Start and end are defined; highlight everything in-between
            const time = date.getTime();
            const startTime = this.selectedStart.getTime();
            const endTime = this.selectedEnd.getTime();
            return (time >= startTime && time <= endTime);
        }
    }
    onDayClick(date: Date) {
        if (!this.isAllowed(date)) return; // Ignore if the date is not allowed
        if (this.singleDateMode) {
            this.selectedStart = date;
            this.selectedEnd = null;
            this.dateRangeChanged.emit([this.selectedStart, this.selectedEnd]);
            return;
        }
        if (!this.selectedStart) { // 1st click: set start
            this.selectedStart = date;
            this.selectedEnd = null;
        } else if (!this.selectedEnd) { // 2nd click: set end
            if (date.getTime() < this.selectedStart.getTime()) { // if user clicked an earlier date, swap them
              this.selectedEnd = this.selectedStart;
              this.selectedStart = date;
            } else this.selectedEnd = date;
            this.dateRangeChanged.emit([this.selectedStart, this.selectedEnd]);
        } else { // 3rd click: reset and pick new start
            this.selectedStart = date;
            this.selectedEnd = null;
        }
    }
    prevMonth() {
        if (this.displayedMonth === 1) {
            this.displayedMonth = 12;
            this.displayedYear--;
        } else {
            this.displayedMonth--;
        }
        this.generateCalendar();
    }
    nextMonth() {
        if (this.displayedMonth === 12) {
            this.displayedMonth = 1;
            this.displayedYear++;
        } else {
            this.displayedMonth++;
        }
        this.generateCalendar();
    }
}
