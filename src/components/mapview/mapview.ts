import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MapComponent, LayerComponent, GeoJSONSourceComponent, 
    FeatureComponent, ImageComponent, PopupComponent } from "@maplibre/ngx-maplibre-gl";
import { DropSelectComponent } from '../dropselect/dropselect';
import { Map, MapLayerMouseEvent } from 'maplibre-gl';
import { MarkerEvent, MapViewEvent } from './event';
import { MarkerGroup } from '../../utils/marker/markergrp';
import { Path } from '../../utils/path/path';
import { Cache } from '../../utils/cache/cache';
import { Color } from '../../utils/color/color';

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
    templateUrl: './mapview.html'
})
export class MapViewComponent {
    @Input() geoObjects: Array<Marker> = [];
    @Input() apiKey: string = '';
    @Input() zoom: number = 12;
    @Input() centerLat: number = 103.822872;
    @Input() centerLng: number = 1.364917;
    @Input() iconScale: number = 1.0;
    @Input() fadeDuration: number = 0;
    @Input() mapStyle: string = 'bright-v2';
    @Input() mapStyles: Array<string> = ['aquarelle', 'backdrop', "basic-v2", 
        "bright-v2", "dataviz", "landscape", "ocean", "openstreetmap", 
        "outdoor-v2", "satellite", "streets-v2", "toner-v2", "topo-v2", "winter-v2"
    ];
    @Input() showLines: boolean = false;
    @Input() showSymbols: boolean = false;
    @Input() showSelected: boolean = false;
    @Input() labelFunc: Function = (obj: Marker) => "";
    @Input() connectableFilter: Function = (obj: Marker) => false;
    @Input() moveableFilter: Function = (obj: Marker) => false;
    @Output() layerModeChanged = new EventEmitter<string>();
    @Output() objectMouseDown = new EventEmitter<MarkerEvent>();
    @Output() objectMouseUp = new EventEmitter<MarkerEvent>();
    @Output() objectMoved = new EventEmitter<MarkerEvent>();
    @Output() mapMouseDown = new EventEmitter<MapViewEvent>();
    @Output() mapMouseUp = new EventEmitter<MapViewEvent>();
    @Output() mapMouseMove = new EventEmitter<MapViewEvent>();
    // mapstyle
    map!: Map;
    onMapLoad(map: Map) {
        this.map = map;
    }
    private _cachedStyles: any = {};
    private _getStyle() {
        const url = `https://api.maptiler.com/maps/${this.mapStyle}/style.json?key=${this.apiKey}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send();
        return JSON.parse(xhr.responseText);
    }
    private _initialMapStyle: any = undefined;
    get initialMapStyle() {
        if (!this._initialMapStyle) {
            this._cachedStyles[this.mapStyle] = this._getStyle();
            this._initialMapStyle = this._cachedStyles[this.mapStyle];
        }
        return this._initialMapStyle;
    }
    get linePairs() {
        const connectables = this.geoObjects.filter(obj => this.connectableFilter(obj));
        const coords = connectables.map(obj => [obj.lon, obj.lat]);
        const pairs = [];
        for (let i = 0; i < coords.length - 1; i++) {
            pairs.push([coords[i], coords[i + 1]]);
        }
        return pairs;
    }
    pairTracker(pair: Array<Array<number>>) {
        const tracker1 = pair[0][0].toString() + pair[0][1].toString();
        const tracker2 = pair[1][0].toString() + pair[1][1].toString();
        return tracker1 + tracker2;
    }
    get labelPoints() {
        return this.geoObjects.map(obj => ({
            lon: obj.lon,
            lat: obj.lat,
            text: this.labelFunc(obj)
        }));
    }
    labelTracker(labelPoint: any) {
        return labelPoint.lon.toString() + labelPoint.lat.toString() + labelPoint.text;
    }
    getMapStyle() {
        const keys = Object.keys(this._cachedStyles);
        if (keys.length == 0 || !keys.includes(this.mapStyle)) {
            this._cachedStyles[this.mapStyle] = this._getStyle();
        }
        return this._cachedStyles[this.mapStyle];
    }
    refresh(m: Marker) {
        const idx = this.geoObjects.findIndex(obj => obj.id === m.id && obj.constructor.name === m.constructor.name);
        if (idx >= 0) this.geoObjects[idx] = m;
        else this.geoObjects.push(m);
    }
    // dropselect
    onSelectT(obj: any) {
        if (typeof obj === 'string') {
            if (this.mapStyle === obj) return; // unchanged
            this.mapStyle = obj;
            if (this.map) {
                const style = this.getMapStyle();
                this.map.setStyle(style, { diff: false });
            }
            this.layerModeChanged.emit(obj);
        }
        else throw new Error('Invalid selection (must be string).');
    }

    // marker
    private findIdxFromEvent(event: MapLayerMouseEvent): number {
        if (!event.features || event.features.length === 0) return -1;
        const id = event.features[0].properties['id'];
        const cName = event.features[0].properties['cName'];
        if (id === undefined) return -1;
        return this.geoObjects.findIndex(obj => obj.id === id && obj.constructor.name === cName);
    }
    selectedMarkerId: number = -1;
    selectedMarkerCName: string = '';
    onMarkerClick(event: MapLayerMouseEvent) {
        const idx = this.findIdxFromEvent(event);
        if (idx < 0) return;
        const m = this.geoObjects[idx];
        if (this.selectedMarkerId !== m.id) {
            this.selectedMarkerId = m.id;
            this.selectedMarkerCName = m.constructor.name;
        } else {
            this.selectedMarkerId = -1;
            this.selectedMarkerCName = '';
        }
    }
    onMarkerEnter(event: MapLayerMouseEvent) {
        if (this.isMoving) return;
        event.target.getCanvas().style.cursor = 'pointer';
        const idx = this.findIdxFromEvent(event);
        if (idx < 0) return;
        const obj = this.geoObjects[idx];
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

    // map events
    onMapMouseDown(event: MapLayerMouseEvent) {
        this.mapMouseDown.emit(new MapViewEvent(event));
    }
    onMapMouseUp(event: MapLayerMouseEvent) {
        this.mapMouseUp.emit(new MapViewEvent(event));
        if (this.isMoving) this.onMarkerUp(event);
    }
    onMapMouseMove(event: MapLayerMouseEvent) {
        this.mapMouseMove.emit(new MapViewEvent(event));
        if (this.movingIdx >= 0) this.objectMoved.emit(new MarkerEvent(this.movingIdx, event));
    }
    private isMoving: boolean = false;
    private movingIdx: number = -1;
    onMarkerDown(event: MapLayerMouseEvent) {
        const idx = this.findIdxFromEvent(event);
        if (idx < 0) return;
        if (this.moveableFilter(this.geoObjects[idx])) { // object is movable
            event.preventDefault(); // prevent map drag and map pan
            if (event.originalEvent.button === 0) { // left down
                this.isMoving = true;
                this.movingIdx = idx;
            }
        }
        this.objectMouseDown.emit(new MarkerEvent(idx, event));
    }
    onMarkerUp(event: MapLayerMouseEvent) {
        if (this.isMoving) {
            event.preventDefault(); // prevent map drag
            this.isMoving = false;
            this.movingIdx = -1;
        }
        this.popupVisible = false;
        const idx = this.findIdxFromEvent(event);
        if (idx < 0) return;
        this.objectMouseUp.emit(new MarkerEvent(idx, event));
    }
}