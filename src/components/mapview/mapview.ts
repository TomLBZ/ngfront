import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MapComponent, LayerComponent, GeoJSONSourceComponent, 
    FeatureComponent, ImageComponent, PopupComponent } from "@maplibre/ngx-maplibre-gl";
import { DropSelectComponent } from '../dropselect/dropselect';
import { Map, MapLayerMouseEvent, ProjectionSpecification } from 'maplibre-gl';
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
    @Input() centerLat: number = 1.364917;
    @Input() centerLng: number = 103.822872;
    @Input() fadeDuration: number = 0;
    @Input() mapStyle: string = 'satellite';
    @Input() mapStyles: Array<string> = ['aquarelle', 'backdrop', "basic-v2", 
        "bright-v2", "dataviz", "landscape", "ocean", "openstreetmap", 
        "outdoor-v2", "satellite", "streets-v2", "toner-v2", "topo-v2", "winter-v2"
    ];
    @Input() projection: string = 'globe';
    @Output() layerModeChanged = new EventEmitter<string>();
    @Output() objectSelectionChanged = new EventEmitter<MarkerEvent>();
    @Output() objectClicked = new EventEmitter<MarkerEvent>();
    @Output() objectMouseDown = new EventEmitter<MarkerEvent>();
    @Output() objectMouseUp = new EventEmitter<MarkerEvent>();
    @Output() objectMoved = new EventEmitter<MarkerEvent>();
    @Output() mapMouseDown = new EventEmitter<MapViewEvent>();
    @Output() mapMouseUp = new EventEmitter<MapViewEvent>();
    @Output() mapMouseMove = new EventEmitter<MapViewEvent>();
    public get projSpec(): ProjectionSpecification {
        return { type: this.projection };
    }
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
    onSelectT(style: string) {
        if (this.mapStyle === style) return; // unchanged
        this.mapStyle = style;
        this.map?.setStyle(this.style, { diff: false });
        this.layerModeChanged.emit(style);
    }

    // marker
    private Event2MkrIdx(event: MapLayerMouseEvent, mgIdx: number): number {
        if (!event.features || event.features.length === 0) return -1;
        const id = event.features[0].properties['id'];
        if (id === undefined) return -1;
        return this.markerGroups[mgIdx].markers.findIndex(obj => obj.id === id);
    }
    lastBorder: Color = Color.Transparent;
    lastSelectedId: number = -1;
    lastSelectedMgId: number = -1;
    private select(mgId: number, mId: number) {
        const mgIdx = this.markerGroups.findIndex((mg) => mg.id === mgId);
        this.lastBorder = this.markerGroups[mgIdx].getColor(mId);
        this.markerGroups[mgIdx].setColor(mId, this.markerGroups[mgIdx].selectedBorder);
        this.lastSelectedId = mId;
        this.lastSelectedMgId = mgId;
    }
    private unselect(mgId: number, mId: number) {
        const mgIdx = this.markerGroups.findIndex((mg) => mg.id === mgId);
        this.markerGroups[mgIdx].setColor(mId, this.lastBorder);
        this.lastBorder = Color.Transparent;
        this.lastSelectedId = -1;
        this.lastSelectedMgId = -1;
    }
    onMarkerClick(event: MapLayerMouseEvent, mgIdx: number) {
        const mIdx = this.Event2MkrIdx(event, mgIdx);
        if (mIdx < 0) return;
        const me: MarkerEvent = new MarkerEvent(mIdx, mgIdx, event);
        me.buttons = this.clickingButtons; // set clicking buttons
        if (this.markerGroups[mgIdx].selectable) {
            this.objectSelectionChanged.emit(me);
            if (!me.cancelled) { // if the event is cancelled, do not proceed
                if (this.lastSelectedId >= 0) { // something is already selected
                    this.unselect(this.lastSelectedMgId, this.lastSelectedId);
                }
                this.select(this.markerGroups[mgIdx].id, this.markerGroups[mgIdx].markers[mIdx].id);
            }
        }
        this.objectClicked.emit(me);
        this.clickingButtons = -1; // reset clicking
    }
    // popup
    popupLonLat: [number, number] = [0, 0];
    popupVisible: boolean = false;
    popupText: string = 'Test';
    private setPopup(mgIdx: number, mIdx: number) {
        const lat = this.markerGroups[mgIdx].markers[mIdx].lat;
        const lon = this.markerGroups[mgIdx].markers[mIdx].lng;
        this.popupLonLat = [lon, lat];
        this.popupText = this.markerGroups[mgIdx].popup(mIdx);
        this.popupVisible = true;
    }
    onMarkerEnter(event: MapLayerMouseEvent, mgIdx: number) {
        if (this.opMgIdx >= 0) return;
        event.target.getCanvas().style.cursor = 'pointer';
        const mIdx = this.Event2MkrIdx(event, mgIdx);
        if (mIdx < 0) return;
        this.setPopup(mgIdx, mIdx);
    }
    onMarkerLeave(event: MapLayerMouseEvent, mgIdx: number) {
        event.target.getCanvas().style.cursor = '';
        this.popupVisible = false;
    }
    // map events
    onMapMouseDown(event: MapLayerMouseEvent) {
        const evt = new MapViewEvent(event);
        this.mapMouseDown.emit(evt);
        if (evt.cancelled) event.preventDefault();
    }
    onMapMouseUp(event: MapLayerMouseEvent) {
        if (this.opMgIdx >= 0) this.onMarkerUp(event, this.opMgIdx);
        this.mapMouseUp.emit(new MapViewEvent(event));
    }
    onMapMouseMove(event: MapLayerMouseEvent) {
        if (this.opMarkerIdx >= 0) { // marker can be updated
            this.clickingButtons = -1; // if marker is moving, clicking is not registered
            event.preventDefault(); // prevent map events
            this.popupVisible = false; // hide popup
            const m = this.markerGroups[this.opMgIdx].markers[this.opMarkerIdx];
            if (m !== undefined && m !== null) {
                const diffLng = event.lngLat.lng - m.lng;
                const diffLat = event.lngLat.lat - m.lat;
                this.objectMoved.emit(new MarkerEvent(this.opMarkerIdx, this.opMgIdx, event, diffLng, diffLat));
                this.setPopup(this.opMgIdx, this.opMarkerIdx);
            } else { // marker has been removed, reset
                this.opMgIdx = -1;
                this.opMarkerIdx = -1;
                this.clickingButtons = -1;
            }
        }
        this.mapMouseMove.emit(new MapViewEvent(event));
    }
    private opMgIdx: number = -1;
    private opMarkerIdx: number = -1;
    private clickingButtons: number = -1;
    onMarkerDown(event: MapLayerMouseEvent, mgIdx: number) {
        this.clickingButtons = event.originalEvent.buttons; // starts clicking
        const mIdx = this.Event2MkrIdx(event, mgIdx);
        if (mIdx < 0) return;
        const me = new MarkerEvent(mIdx, mgIdx, event);
        if (!me.noButton) { // some button is down on the marker
            event.preventDefault(); // prevent map default events
            this.opMgIdx = mgIdx;
            this.opMarkerIdx = mIdx;
        }
        this.objectMouseDown.emit(me);
    }
    onMarkerUp(event: MapLayerMouseEvent, mgIdx: number) {
        if (this.opMgIdx >= 0) {
            event.preventDefault(); // prevent map drag
            this.opMgIdx = -1;
            this.opMarkerIdx = -1;
            this.popupVisible = false; // hide popup
        }
        const mIdx = this.Event2MkrIdx(event, mgIdx);
        if (mIdx < 0) return;
        this.objectMouseUp.emit(new MarkerEvent(mIdx, mgIdx, event));
        if (this.clickingButtons >= 0) { // clicking is done, trigger click event
            this.onMarkerClick(event, mgIdx);
        }
    }
}