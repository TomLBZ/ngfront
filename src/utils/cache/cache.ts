export class Cache<T> {
    private _cache: { [key: number]: T} = {};
    has(id: number) {
        return this._cache[id] !== undefined;
    }
    get(id: number) {
        return this._cache[id];
    }
    set(id: number, info: T) {
        this._cache[id] = info;
    }
}