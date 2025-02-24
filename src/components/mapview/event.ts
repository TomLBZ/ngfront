import { MapLayerMouseEvent } from "maplibre-gl";

export class MapViewEvent {
    lng: number = -1;
    lat: number = -1;
    cancelled: boolean = false;
    public buttons: number = -1;
    public get noButton(): boolean {
        return this.buttons <= 0; // 0: no button
    }
    public get primaryButton(): boolean {
        return (this.buttons & 1) > 0; // 1: primary button (usually left)
    }
    public set primaryButton(value: boolean) {
        if (value) this.buttons |= 1;
        else this.buttons &= ~1;
    }
    public get secondaryButton(): boolean {
        return (this.buttons & 2) > 0; // 2: secondary button (usually right)
    }
    public set secondaryButton(value: boolean) {
        if (value) this.buttons |= 2;
        else this.buttons &= ~2;
    }
    public get middleButton(): boolean {
        return (this.buttons & 4) > 0; // 4: auxiliary button (usually middle or mouse wheel button)
    }
    public set middleButton(value: boolean) {
        if (value) this.buttons |= 4;
        else this.buttons &= ~4;
    }
    public get fourthButton(): boolean {
        return (this.buttons & 8) > 0; // 8: 4th button (typically the "Browser Back" button)
    }
    public set fourthButton(value: boolean) {
        if (value) this.buttons |= 8;
        else this.buttons &= ~8;
    }
    public get fifthButton(): boolean {
        return (this.buttons & 16) > 0; // 16: 5th button (typically the "Browser Forward" button)
    }
    public set fifthButton(value: boolean) {
        if (value) this.buttons |= 16;
        else this.buttons &= ~16;
    }
    constructor(event?: MapLayerMouseEvent) {
        if (event === undefined) return;
        this.lng = event.lngLat.lng;
        this.lat = event.lngLat.lat;
        const button = event.originalEvent.button === 2 ? 2 :
            event.originalEvent.button === 1 ? 4 :
            event.originalEvent.button === 3 ? 8 :
            event.originalEvent.button === 4 ? 16 : 0;
        this.buttons = event.originalEvent.buttons | button;
    }
}

export class MarkerEvent extends MapViewEvent {
    constructor(public mIdx: number, public mgIdx: number = 0, event?: MapLayerMouseEvent, public dLng: number = 0, public dLat: number = 0) {
        super(event);
    }
}