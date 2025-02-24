export class Cache<T> {
    private _cache: { [key: number]: T} = {};
    private _hashValue: number;
    constructor() {
        this._hashValue = this.posRnd;
    }
    private get posRnd(): number {
        let rnd = Math.random(); // between 0 and 1
        while (rnd === 0) rnd = Math.random(); // reshuffle if 0
        return rnd; // cannot be 0
    }
    private refreshHash() {
        this._hashValue += this.posRnd;
        if (isNaN(this._hashValue) || !isFinite(this._hashValue)) this._hashValue = this.posRnd; // re-initialize if necessary
    }
    has(id: number) {
        return this._cache[id] !== undefined;
    }
    get(id: number) {
        return this._cache[id];
    }
    set(id: number, info: T) {
        this._cache[id] = info;
        this.refreshHash();
    }
    remove(id: number) {
        delete this._cache[id];
        this.refreshHash();
    }
    public get keys(): Array<number> {
        return Object.keys(this._cache).map((k) => parseInt(k));
    }
    public get values(): Array<T> {
        return Object.values(this._cache);
    }
    public get entries(): Array<[number, T]> {
        return Object.entries(this._cache).map(([k, v]) => [parseInt(k), v]);
    }
    public clear() {
        this._cache = {};
    }
    public get hash(): number {
        return this._hashValue;
    }
}