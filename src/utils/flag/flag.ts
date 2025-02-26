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
    public clear(name: string) {
        this._setFlag(name, false);
    }
    public toggle(name: string) {
        this._setFlag(name, !this.get(name));
    }
    public addNames(names: Array<string>) {
        names.forEach(name => {
            if (this.names.indexOf(name) < 0) this.names.push(name);
        });
    }
    public toNumber(): number {
        return this._flags;
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