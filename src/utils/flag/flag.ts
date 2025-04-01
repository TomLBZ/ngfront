export class Flag {
    private _flags: number = 0;
    public names: Array<string> = [];
    public get(name: string): boolean {
        if (this.names.indexOf(name) < 0) return false;
        return (this._flags & (1 << this.names.indexOf(name))) > 0;
    }
    public set(name: string) {
        this._setFlag(name, true);
    }
    public unset(name: string) {
        this._setFlag(name, false);
    }
    public clear() {
        this._flags = 0;
    }
    public toggle(name: string) {
        this._setFlag(name, !this.get(name));
    }
    public addName(name: string) {
        if (this.names.indexOf(name) < 0) this.names.push(name);
    }
    public addNames(names: Array<string>) {
        names.forEach((name) => this.addName(name));
    }
    public searchNames(search: string): Array<string> {
        return this.names.filter((name) => name.includes(search));
    }
    public toNumber(): number {
        return this._flags;
    }
    public indexOf(name: string): number {
        return this.names.indexOf(name);
    }
    public get none(): boolean {
        return this._flags === 0; // all bits are 0
    }
    public get any(): boolean {
        return this._flags !== 0; // any bit is 1
    }
    public get all(): boolean {
        return this._flags === (1 << this.names.length) - 1; // all bits are 1
    }
    public set all(value: boolean) {
        if (value) this._flags = (1 << this.names.length) - 1;
        else this._flags = 0;
    }
    private _setFlag(name: string, value: boolean) {
        const idx = this.names.indexOf(name);
        if (idx < 0) return;
        if (value) this._flags |= 1 << idx;
        else this._flags &= ~(1 << idx);
    }
    constructor(names: Array<string>, value?: number) {
        this.names = names;
        if (value !== undefined) this._flags = value;
    }
    static Default = new Flag([]);
}