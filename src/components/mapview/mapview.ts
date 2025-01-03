import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgxMapLibreGLModule } from "@maplibre/ngx-maplibre-gl";
import { MapComponent, ImageComponent, LayerComponent } from "@maplibre/ngx-maplibre-gl";
import { DropSelectComponent } from '../dropselect/dropselect';
import { MapLayerMouseEvent } from 'maplibre-gl';

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
    @Input() markerCoords: Array<Array<number>> = [];
    @Input() imgSize: number = 16;
    @Input() apiKey: string = '';
    @Input() zoom: number = 12;
    @Input() centerLat: number = 103.822872;
    @Input() centerLng: number = 1.364917;
    @Input() imgData: Uint8Array = new Uint8Array();
    @Output() layerModeChanged = new EventEmitter<string>();

    // dropselect
    layerModeT: string = 'streets';
    layerModes: Array<string> = ['streets', 'satellite'];

    get mapStyle() {
        return `https://api.maptiler.com/maps/${this.layerModeT}/style.json?key=${this.apiKey}`;
    }

    onSelectT(obj: any) {
        if (typeof obj === 'string') {
            this.layerModeT = obj;
            this.layerModeChanged.emit(obj);
        }
        else if (Array.isArray(obj)) {
            if (obj.length > 0) {
                this.layerModeT = obj[0];
                // TODO: BLEND LAYERS
                this.layerModeChanged.emit(obj[0]);
            }
        }
    }

    onMarkerClick(event: MapLayerMouseEvent) {
        const features = event.features;
        if (features && features.length > 0) {
            console.log(features[0].properties);
        }
    }
}