import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgxMapLibreGLModule } from "@maplibre/ngx-maplibre-gl";
import { MapComponent, ImageComponent, LayerComponent } from "@maplibre/ngx-maplibre-gl";
import { DropSelectComponent } from '../dropselect/dropselect';
import { MapLayerMouseEvent } from 'maplibre-gl';

export interface GeoObject {
    lat: number;
    lng: number;
    heading: number;
    description: string;
    icon: string;
    iconSize: number;
    iconData: Uint8Array;
}

@Component({
    selector: 'mapview',
    standalone: true,
    imports: [
        NgxMapLibreGLModule,
        MapComponent, ImageComponent, LayerComponent,
        DropSelectComponent
    ],
    templateUrl: './mapview.html',
    styleUrls: ['./mapview.less']
})
export class MapViewComponent {
    @Input() geoObjects: Array<GeoObject> = [];
    @Input() apiKey: string = '';
    @Input() zoom: number = 12;
    @Input() centerLat: number = 103.822872;
    @Input() centerLng: number = 1.364917;
    @Input() iconScale: number = 1.0;
    @Output() layerModeChanged = new EventEmitter<string>();
    @Output() objectClicked = new EventEmitter<GeoObject>();

    // dropselect
    layerModeT: string = 'bright-v2';
    layerModes: Array<string> = ['aquarelle', 'backdrop', "basic-v2", 
        "bright-v2", "dataviz", "landscape", "ocean", "openstreetmap", 
        "outdoor-v2", "satellite", "streets-v2", "toner-v2", "topo-v2", "winter-v2"
    ];
    // popup
    popupLngLat: [number, number] = [0, 0];
    popupVisible: boolean = false;
    popupText: string = 'Test';
    // mapstyle
    mapLoaded: boolean = false;
    private _cachedStyles: any = {};
    get mapStyle() {
        const keys = Object.keys(this._cachedStyles);
        if (keys.length == 0 || !keys.includes(this.layerModeT)) {
            this._cachedStyles[this.layerModeT] = this.getStyle();
        }
        return this._cachedStyles[this.layerModeT];
    }
    // marker
    selectedMarkerIndex: number = -1;

    private getStyle() {
        const url = `https://api.maptiler.com/maps/${this.layerModeT}/style.json?key=${this.apiKey}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send();
        return JSON.parse(xhr.responseText);
    }

    onSelectT(obj: any) {
        if (typeof obj === 'string') {
            this.mapLoaded = false;
            this.layerModeT = obj;
            this.layerModeChanged.emit(obj);
        }
        else throw new Error('Invalid selection');
    }

    onMarkerClick(event: MapLayerMouseEvent) {
        const features = event.features;
        if (features && features.length > 0) {
            const idx = features[0].properties['index'];
            if (idx !== undefined) {
                this.objectClicked.emit(this.geoObjects[idx]);
                if (this.selectedMarkerIndex !== idx) this.selectedMarkerIndex = idx;
                else this.selectedMarkerIndex = -1;
            }
        }
    }

    onMarkerEnter(event: MapLayerMouseEvent) {
        event.target.getCanvas().style.cursor = 'pointer';
        const features = event.features;
        if (!features || features.length === 0) return;
        const idx = features[0].properties['index'];
        if (idx === undefined) return;
        const lat = this.geoObjects[idx].lat;
        const lng = this.geoObjects[idx].lng;
        const desc = this.geoObjects[idx].description;
        this.popupLngLat = [lng, lat];
        this.popupText = desc;
        this.popupVisible = true;
    }

    onMarkerLeave(event: MapLayerMouseEvent) {
        event.target.getCanvas().style.cursor = '';
        this.popupVisible = false;
    }

}