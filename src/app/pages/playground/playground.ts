// library imports
import { Component, OnInit, ViewChild } from "@angular/core";
// custom components
import { ObjEditorComponent } from "../../../components/obj_editor/obj_editor";
import { DropSelectComponent } from "../../../components/dropselect/dropselect";
import { MapViewComponent } from "../../../components/mapview/mapview";
import { Marker } from "../../../utils/marker/marker";
import { MarkerGroup } from "../../../utils/marker/markergrp";
import { OutboxComponent } from "../../../components/outbox/outbox";
// other custom imports
import { env } from "../../app.config";
import { Icon } from "../../../utils/icon/icon";
import { Color } from "../../../utils/color/color";
import { MarkerEvent } from "../../../components/mapview/event";

@Component({
    selector: "app-playground",
    standalone: true,
    imports: [
        ObjEditorComponent, 
        DropSelectComponent,
        MapViewComponent,
        OutboxComponent
    ],
    templateUrl: "./playground.html"
})
export class PlaygroundPage implements OnInit {
    apiKey = env.mapKey;
    mgroup: MarkerGroup = new MarkerGroup(Icon.Circle(16, Color.Green, Color.Blue), true, true);
    markers: Array<Marker> = [
        new Marker(1.36, 103.82),
        new Marker(1.37, 103.83),
        new Marker(1.36, 103.83),
        new Marker(1.37, 103.82)
    ];
    includeFilter = (key: string) => {
        const excludedFields = ["hdg", "alt"];
        if (excludedFields.includes(key)) return false;
        return !key.includes("_");
    }
    repr: Function = (m: Marker) => this.getRepr(this.getIdx(m));
    getRepr(mIdx: number) {
        return this.mgroup.labelPrefix + (mIdx + 1);
    }
    getIdx(m: Marker) {
        return this.mgroup.markers.indexOf(m);
    }

    ngOnInit() {
        this.mgroup.markers = this.markers;
        this.mgroup.popupFields = ["lat", "lng"];
        this.mgroup.labelPrefix = "M";
    }

    mIdx: number = -1;
    @ViewChild(DropSelectComponent) ds!: DropSelectComponent;
    @ViewChild(OutboxComponent) ob!: OutboxComponent;
    onObjectSelectionChanged(me: MarkerEvent) {
        this.mIdx = me.mIdx;
        this.ds.reset([this.mIdx]);
        this.ob.append("Marker " + this.getRepr(this.mIdx) + " selected", true);
    }

    onObjectMoved(me: MarkerEvent) {
        const m = this.markers[me.mIdx].moveTo(me.lat, me.lng);
        this.mgroup.updateMarker(m, true);
    }

    onApply(m: Marker) {
        this.mgroup.updateMarker(m, true);
    }

    onSelectMarker(n: number) {
        this.mIdx = n;
    }

}