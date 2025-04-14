import { Hash } from "../math/hash";
import { IPoint } from "../../ds";

export class Marker implements IPoint { // a single marker
    private static _maxId: number = 0;
    public id: number;
    public hdg: number = 0; // hdg 0~360, lng -180~180, lat -90~90
    public alt: number = 0; // alt in the thousands, flags in the tens, id in the units
    private _trigger: number = this.posRnd; // initialize with a random number
    private _name: string = "";
    public get name(): string {
        if (this._name === "") return this.id.toString();
        return this._name;
    }
    private get nameHash(): number {
        const charArr = this._name.split('');
        return Hash.hash(charArr.map((c) => c.charCodeAt(0)));
    }
    private get posRnd(): number {
        let rnd = Math.random(); // between 0 and 1
        while (rnd === 0) rnd = Math.random(); // reshuffle if 0
        return rnd; // cannot be 0
    }
    // interface implementation
    public get x(): number { return this.lng; }
    public get y(): number { return this.lat; }
    public get hash() { // smaller primes are used for numerically larger features
        return Hash.hash([this.alt, this.hdg, this.lng, this.lat, this.id, this.nameHash, this._trigger]);
    }
    distanceTo(point: IPoint): number {
        return Math.sqrt((this.lng - point.x) ** 2 + (this.lat - point.y) ** 2);
    }
    equals(point: Marker): boolean {
        return this.hash === point.hash;
    }
    constructor(public lat: number, public lng: number, id?: number, name?: string) {
        if (id === undefined) {
            this.id = Marker._maxId++; // assign and increment
        } else {
            this.id = id; // assign given id
            if (id >= Marker._maxId) Marker._maxId = id + 1; // skip over given id if necessary
        }
        this._name = name === undefined ? "" : name;
    }
    public clone(rehash: boolean = false): Marker {
        const m = new Marker(this.lat, this.lng, this.id);
        m.alt = this.alt;
        m.hdg = this.hdg;
        m._trigger = rehash ? this._trigger + this.posRnd : this._trigger; // rehash if necessary
        if (isNaN(m._trigger) || !isFinite(m._trigger)) m._trigger = this.posRnd; // re-initialize if necessary
        m._name = this._name;
        return m;
    }
    public moveTo(lat: number, lng: number): Marker {
        const m = this.clone();
        m.lat = lat;
        m.lng = lng;
        return m;
    }
    public moveBy(dLat: number, dLng: number): Marker {
        const m = this.clone();
        m.lat += dLat;
        m.lng += dLng;
        return m;
    }
    public rotateTo(hdg: number): Marker {
        const m = this.clone();
        m.hdg = hdg;
        return m;
    }
    public rotateBy(dHdg: number): Marker {
        const m = this.clone();
        m.hdg += dHdg;
        return m;
    }
    public liftTo(alt: number): Marker {
        const m = this.clone();
        m.alt = alt;
        return m;
    }
    public liftBy(alt: number): Marker {
        const m = this.clone();
        m.alt += alt;
        return m;
    }
    private num2Str(num: number, dp: number, digits: number = 0): string {
        const intPart = Math.floor(num);
        const fracPart = num - intPart;
        const intStr = intPart.toString().padStart(digits, '0');
        const fracStr = fracPart.toFixed(dp).slice(2);
        return `${intStr}.${fracStr}`;
    }
    public get lngStr(): string { return this.num2Str(this.lng, 4); }
    public get latStr(): string { return this.num2Str(this.lat, 4); }
    public get altStr(): string { return this.num2Str(this.alt, 1) + 'm'; }
    public get hdgStr(): string { return this.num2Str(this.hdg, 1) + '°'; }

    public toString(fields: Array<string> = [], vertical: boolean = false): string {
        const sep = vertical ? '\n' : ', ';
        const tab = vertical ? '\t' : ': ';
        let str = '';
        if (fields.length === 0) {
            str += `lat${tab}${this.latStr}${sep}lng${tab}${this.lngStr}${sep}alt${tab}${this.altStr}${sep}hdg${tab}${this.hdgStr}`;
        } else {
            fields.forEach((f) => {
                if (f === 'lat') str += `lat${tab}${this.latStr}${sep}`;
                if (f === 'lng') str += `lng${tab}${this.lngStr}${sep}`;
                if (f === 'alt') str += `alt${tab}${this.altStr}${sep}`;
                if (f === 'hdg') str += `hdg${tab}${this.hdgStr}${sep}`;
            });
            str = str.slice(0, -sep.length);
        }
        return str;
    }
}