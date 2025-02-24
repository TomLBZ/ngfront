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
    @Input() markerGroups: Array<MarkerGroup> = [];
    @Input() paths: Array<Path> = [];
    @Input() apiKey: string = '';
    @Input() zoom: number = 12;
    @Input() centerLat: number = 103.822872;
    @Input() centerLng: number = 1.364917;
    @Input() fadeDuration: number = 0;
    @Input() mapStyle: string = 'bright-v2';
    @Input() mapStyles: Array<string> = ['aquarelle', 'backdrop', "basic-v2", 
        "bright-v2", "dataviz", "landscape", "ocean", "openstreetmap", 
        "outdoor-v2", "satellite", "streets-v2", "toner-v2", "topo-v2", "winter-v2"
    ];
    @Output() layerModeChanged = new EventEmitter<string>();
    @Output() objectSelectionChanged = new EventEmitter<MarkerEvent>();
    @Output() objectClicked = new EventEmitter<MarkerEvent>();
    @Output() objectMouseDown = new EventEmitter<MarkerEvent>();
    @Output() objectMouseUp = new EventEmitter<MarkerEvent>();
    @Output() objectMoved = new EventEmitter<MarkerEvent>();
    @Output() mapMouseDown = new EventEmitter<MapViewEvent>();
    @Output() mapMouseUp = new EventEmitter<MapViewEvent>();
    @Output() mapMouseMove = new EventEmitter<MapViewEvent>();
    // mapstyle
    map!: Map;
    onMapLoad(map: Map) { this.map = map; }
    private _cachedStyles: Cache<any> = new Cache<any>();
    private _getStyle(style: string) {
        const url = `https://api.maptiler.com/maps/${style}/style.json?key=${this.apiKey}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send();
        return JSON.parse(xhr.responseText);
    }
    private get style() {
        const idx = this.mapStyles.indexOf(this.mapStyle);
        if (!this._cachedStyles.has(idx)) {
            this._cachedStyles.set(idx, this._getStyle(this.mapStyle));
        }
        return this._cachedStyles.get(idx);
        }
    private _initStyle: any = undefined;
    get initialStyle() {
        if (this._initStyle === undefined) {
            this._initStyle = this.style;
        }
        return this._initStyle;
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