export class Flag {
    private _flags: number = 0;
    public names: Array<string> = [];
    getFlag(name: string): boolean {
        if (this.names.indexOf(name) < 0) return false;
        return (this._flags & (1 << this.names.indexOf(name))) > 0;
    }
    private _setFlag(name: string, value: boolean) {
        const idx = this.names.indexOf(name);
        if (idx < 0) return;
        if (value) this._flags |= 1 << idx;
        else this._flags &= ~(1 << idx);
    }
    setFlag(name: string) {
        this._setFlag(name, true);
    }
    clearFlag(name: string) {
        this._setFlag(name, false);
    }
    toggleFlag(name: string) {
        this._setFlag(name, !this.getFlag(name));
    }
    constructor(names: Array<string>, value?: number) {
        this.names = names;
        if (value !== undefined) this._flags = value;
    }
    addNames(names: Array<string>) {
        names.forEach(name => {
            if (this.names.indexOf(name) < 0) this.names.push(name);
        });
    }
    toNumber(): number {
        return this._flags;
    }
    static Default = new Flag([]);
}