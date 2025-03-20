import { Cache } from "../cache/cache";
import { Color } from "../color/color";
import { Hash } from "../hash/hash";
import { Icon } from "../icon/icon";
import { Marker } from "./marker";

export class MarkerGroup { // a marker layer
    private static _instCount = 0;
    public id: number = MarkerGroup._instCount++;
    public iconScale: number = 1;
    public moveable: boolean = false;
    public selectable: boolean = false
    public selectedBorder: Color = Color.Red;
    public showLabel: boolean = true;
    public labelPrefix: string = "";
    public markers: Array<Marker> = [];
    public popupFields: Array<string> = [];
    public popup(mIdx: number): string {
        return this.markers[mIdx].toString(this.popupFields, true);
    }
    private _colors: Cache<Color> = new Cache<Color>();
    public setColor(mId: number, color: Color) {
        this._colors.set(mId, color);
        const mIdx = this.markers.findIndex((m) => m.id === mId);
        if (mIdx >= 0) this.updateMarker(this.markers[mIdx], true); // triggers rehash because color changed
    }
    public getColor(mId: number): Color {
        if (this._colors.has(mId)) {
            return this._colors.get(mId);
        }
        return Color.Transparent;
    }
    public colorStrByIdx(mIdx: number): string {
        const c = this.getColor(this.markers[mIdx].id);
        if (c === Color.Transparent) return "";
        return c.hex7;
    }
    constructor(public icon: Icon, moveable: boolean = false, selectable: boolean = false) {
        this.moveable = moveable;
        this.selectable = selectable;
    }
    public addMarker(lat: number, lng: number, id?: number): Marker {
        const m = new Marker(lat, lng, id);
        this.markers.push(m);
        return m;
    }
    public removeMarker(mIdx: number): void {
        if (mIdx >= 0) {
            this._colors.remove(this.markers[mIdx].id);
            this.markers.splice(mIdx, 1);
        }
    }
    public clearMarkers(): void {
        this.markers = [];
        this._colors.clear();
    }
    public updateMarker(m: Marker, rehash: boolean = false): void {
        const idx = this.markers.findIndex((marker) => marker.id === m.id);
        if (idx >= 0) {
            const newM = rehash ? m.clone(true) : m;
            this.markers[idx] = newM;
        }
        else this.markers.push(m);
    }
    public refresh(): void {
        this.markers = this.markers.map((m) => m.clone(true));
    }
    public get hash() {
        const prefixF = this.labelPrefix.split('').map((c) => c.charCodeAt(0)).reduce((a, b) => a + b, 0);
        const bColNum = this.selectedBorder.hash;
        const selNum = this.selectable ? 1 : 0;
        const movNum = this.moveable ? 1 : 0;
        const lblNum = this.showLabel ? 1 : 0;
        const propsHash = Hash.hash([prefixF, bColNum, this.id, this.iconScale, selNum, movNum, lblNum, this._colors.hash]);
        return Hash.hash([propsHash, ...this.markers.map((m) => m.hash)]);
    }
}