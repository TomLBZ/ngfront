export class OnceFunction {
    private _called: boolean = false;
    constructor(private _fn: Function) {}
    public call(...args: any[]): void { // calls the function only once
        if (this._called) return;
        this._fn(...args);
        this._called = true;
    }
    public reset(): void {
        this._called = false;
    }
    public get called(): boolean {
        return this._called;
    }
}
export class OnceValue<T> {
    private _accessed: boolean = false;
    private _value: T;
    constructor(private _default: T) {
        this._value = _default;
    }
    public get accessed(): boolean {
        return this._accessed;
    }
    public reset(value?: T): void {
        if (value !== undefined) this._value = value; // update value if a new value is given
        this._accessed = false;
    }
    public set value(value: T) {
        this._value = value; // update value
    }
    public get value(): T { // after first access, returns last value
        if (!this._accessed) {
            this._accessed = true;
            return this._value;
        }
        return this._default;
    }
}