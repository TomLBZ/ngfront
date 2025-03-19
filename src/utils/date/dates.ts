export class Dates {
    static parseDate(value: string): Date | null {
        if (!value) return null;
        const dateStringRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
        if (dateStringRegex.test(value)) return new Date(value);
        return null;
    }
    static isDate(value: any): boolean {
        return value instanceof Date || value.constructor.name === "Date";
    }
    static toLocalDate(date: Date): Date {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date);
        localDate.setMinutes(date.getMinutes() - offset);
        return localDate;
    }
    static toInputString(value: Date): string {
        return Dates.toLocalDate(value).toISOString().slice(0, 16);
    }
    static fromInputString(value: string): Date {
        const nowDate = new Date();
        if (!value) return nowDate;
        const dateTimeParts = value.split("T");
        if (dateTimeParts.length !== 2) return nowDate;
        const datePart = dateTimeParts[0];
        const dateParts = datePart.split("-");
        if (dateParts.length !== 3) return nowDate;
        const yyyy = parseInt(dateParts[0]);
        const mm = parseInt(dateParts[1]) - 1;
        const dd = parseInt(dateParts[2]);
        if (isNaN(yyyy) || isNaN(mm) || isNaN(dd)) return nowDate;
        const date = new Date(yyyy, mm, dd);
        if (!date) return nowDate;
        const timePart = dateTimeParts[1];
        const timeParts = timePart.split(":");
        if (timeParts.length !== 2) return nowDate;
        const _hh = parseInt(timeParts[0]);
        const _mm = parseInt(timeParts[1]);
        if (isNaN(_hh) || isNaN(_mm)) return nowDate;
        date.setHours(_hh);
        date.setMinutes(_mm);
        return date;
    }
    static DateToJulianDay(date: Date): number {
        let Y = date.getUTCFullYear();
        let M = date.getUTCMonth() + 1; // change 0-based to 1-based
        let D = date.getUTCDate() 
            + date.getUTCHours() / 24 
            + date.getUTCMinutes() / 1440 
            + date.getUTCSeconds() / 86400
            + date.getUTCMilliseconds() / 86400000;
        if (M < 3) { // for Jan and Feb, treat as months 13 and 14 of the previous year
            Y -= 1;
            M += 12;
        }
        const A = Math.floor(Y / 100);
        const B = 2 - A + Math.floor(A / 4);
        return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
    }
}