export class Timer {
    private _timer: any;
    private _callback: any;
    private _interval: number;
    private _isRunning: boolean;
    constructor(callback: Function, interval: number) {
        this._callback = callback;
        this._interval = interval;
        this._isRunning = false;
    }
    start() {
        if (this._isRunning) return;
        this._isRunning = true;
        this._timer = setInterval(this._callback, this._interval);
    }
    stop() {
        if (!this._isRunning) return;
        this._isRunning = false;
        clearInterval(this._timer);
    }
    get isRunning() {
        return this._isRunning;
    }
    get interval() {
        return this._interval;
    }
    set interval(interval: number) {
        this._interval = interval;
        if (this._isRunning) {
            this.stop();
            this.start();
        }
    }
}