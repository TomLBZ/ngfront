import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MapComponent, LayerComponent, GeoJSONSourceComponent, 
    FeatureComponent, ImageComponent, PopupComponent } from "@maplibre/ngx-maplibre-gl";
import { DropSelectComponent } from '../dropselect/dropselect';
import { Map, MapLayerMouseEvent } from 'maplibre-gl';

export interface Marker {
    id: number;
    lat: number;
    lon: number;
    hdg: number;
    popupText: string;
    iconSize: number;
    iconData: Uint8Array;
}

@Component({
    selector: 'mapview',
    standalone: true,
    imports: [
        MapComponent, 
        LayerComponent, 
        GeoJSONSourceComponent, 
        FeatureComponent, 
        ImageComponent,
        PopupComponent,
        DropSelectComponent
    ],
    templateUrl: './mapview.html',
    styleUrls: ['./mapview.less']
})
export class MapViewComponent {
    @Input() geoObjects: Array<Marker> = [];
    @Input() apiKey: string = '';
    @Input() zoom: number = 12;
    @Input() centerLat: number = 103.822872;
    @Input() centerLng: number = 1.364917;
    @Input() iconScale: number = 1.0;
    @Output() layerModeChanged = new EventEmitter<string>();
    @Output() objectClicked = new EventEmitter<Marker>();

    // mapstyle
    map!: Map;
    onMapLoad(map: Map) {
        this.map = map;
    }
    private _cachedStyles: any = {};
    private _getStyle() {
        const url = `https://api.maptiler.com/maps/${this.layerModeT}/style.json?key=${this.apiKey}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send();
        return JSON.parse(xhr.responseText);
    }
    private _initialMapStyle: any = undefined;
    get initialMapStyle() {
        if (!this._initialMapStyle) {
            this._cachedStyles[this.layerModeT] = this._getStyle();
            this._initialMapStyle = this._cachedStyles[this.layerModeT];
        }
        return this._initialMapStyle;
    }
    getMapStyle() {
        const keys = Object.keys(this._cachedStyles);
        if (keys.length == 0 || !keys.includes(this.layerModeT)) {
            this._cachedStyles[this.layerModeT] = this._getStyle();
        }
        return this._cachedStyles[this.layerModeT];
    }
    refresh(m: Marker) {
        const idx = this.geoObjects.findIndex(obj => obj.id === m.id);
        if (idx >= 0) {
            this.geoObjects[idx] = m;
        }
    }

    // dropselect
    layerModeT: string = 'bright-v2';
    layerModes: Array<string> = ['aquarelle', 'backdrop', "basic-v2", 
        "bright-v2", "dataviz", "landscape", "ocean", "openstreetmap", 
        "outdoor-v2", "satellite", "streets-v2", "toner-v2", "topo-v2", "winter-v2"
    ];
    selectedMarkerId: number = -1;
    onSelectT(obj: any) {
        if (typeof obj === 'string') {
            if (this.layerModeT === obj) return; // unchanged
            this.layerModeT = obj;
            if (this.map) {
                const style = this.getMapStyle();
                this.map.setStyle(style, { diff: false });
            }
            this.layerModeChanged.emit(obj);
        }
        else throw new Error('Invalid selection (must be string).');
    }

    // marker
    onMarkerClick(event: MapLayerMouseEvent) {
        const features = event.features;
        if (features && features.length > 0) {
            const idx = features[0].properties['id'];
            if (idx !== undefined) {
                const obj = this.geoObjects.find(obj => obj.id === idx);
                if (!obj) return;
                this.objectClicked.emit(obj);
                if (this.selectedMarkerId !== idx) this.selectedMarkerId = idx;
                else this.selectedMarkerId = -1;
            }
        }
    }
    onMarkerEnter(event: MapLayerMouseEvent) {
        event.target.getCanvas().style.cursor = 'pointer';
        const features = event.features;
        if (!features || features.length === 0) return;
        const idx = features[0].properties['id'];
        if (idx === undefined) return;
        const obj = this.geoObjects.find(obj => obj.id === idx);
        if (!obj) return;
        const lat = obj.lat;
        const lon = obj.lon;
        const desc = obj.popupText;
        this.popupLonLat = [lon, lat];
        this.popupText = desc;
        this.popupVisible = true;
    }
    onMarkerLeave(event: MapLayerMouseEvent) {
        event.target.getCanvas().style.cursor = '';
        this.popupVisible = false;
    }

    // popup
    popupLonLat: [number, number] = [0, 0];
    popupVisible: boolean = false;
    popupText: string = 'Test';
}