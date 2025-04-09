import { Mat3 } from "../mat/mat3";
import { Vec3 } from "../vec/vec3";
import { Earth } from "./earth_old";

// assumes the observer is at the origin.
export class ObserverOnEarth {
    private _Z: Vec3; // up axis in earth frame
    private _Y: Vec3; // front axis in earth frame
    private _X: Vec3; // right axis in earth frame
    private _oposE: Vec3; // in earth frame
    private _absH: number = 0; // absolute height from earth origin
    private _RE: number = Earth.R; // earth radius right below the observer
    public get H(): number { return this._absH; }
    public get RE(): number { return this._RE; }
    public get oposE(): Vec3 { return this._oposE; }
    public get up(): Vec3 { return this._Z; }
    public get front(): Vec3 { return this._Y; }
    public get right(): Vec3 { return this._X; }
    public get eX(): Vec3 { return new Vec3(this._X.x, this._Y.x, this._Z.x); } // earth's up in observer frame
    public get eY(): Vec3 { return new Vec3(this._X.y, this._Y.y, this._Z.y); } // earth's front in observer frame
    public get eZ(): Vec3 { return new Vec3(this._X.z, this._Y.z, this._Z.z); } // earth's right in observer
    private _R!: Mat3;
    private _RT!: Mat3;
    private update() {
        this._R = Mat3.fromArray([
            this._X.x, this._Y.x, this._Z.x,
            this._X.y, this._Y.y, this._Z.y,
            this._X.z, this._Y.z, this._Z.z
        ]);
        this._RT = this._R.T();
    }
    constructor(public lng: number, public lat: number, public alt: number) {
        this._oposE = Earth.getPosition(lng, lat, alt);
        this._absH = this._oposE.Len();
        this._RE = Earth.getRadius(lat);
        this._Z = this._oposE.Norm(); // up vector is along the position vector in earth coordinates
        this._Y = Earth.getNorthAtPos(this._Z); // forward vector is perpendicular to the surface of the earth and points north
        this._X = this._Y.Cross(this._Z).Norm(); // right vector is perpendicular to the surface of the earth and points east
        this.update();
    }
    public transform(roll: number, pitch: number, yaw: number) { // apply yaw first, then pitch, then roll
        // yaw changes front direction, thereby changing right direction
        this._Y = this._Y.rotateAxis(yaw, this._Z).Norm();
        this._X = this._Y.Cross(this._Z).Norm();
        // pitch changes front direction, thereby changing the up direction
        this._Y = this._Y.rotateAxis(pitch, this._X).Norm();
        this._Z = this._X.Cross(this._Y).Norm();
        // roll changes up direction, thereby changing the right direction
        this._Z = this._Z.rotateAxis(roll, this._Y).Norm();
        this._X = this._Y.Cross(this._Z).Norm();
        this.update();
    }
    public get estm_tanlen(): number {
        return Math.sqrt(this._absH ** 2 - this._RE ** 2);
    }
    public get estm_tanangle(): number {
        return Math.asin(this._RE / this._absH);
    }
    public get estm_raylen(): number {
        const anglookdn = Math.acos(-this._oposE.Dot(this._Y) / this._absH);
        if (anglookdn >= this.estm_tanangle) return this.estm_tanlen;
        const sld = Math.sin(anglookdn);
        const soppo = this._absH * sld / this._RE;
        const angoppo = Math.PI - Math.asin(soppo); // always obtuse
        const angr = Math.PI - angoppo - anglookdn;
        return this._absH * Math.sin(angr) / soppo;
    }
    public lookingAtLngLatAlt(aggressionFunc: Function, overwriteZwithL: boolean = false): Vec3 {
        const step = aggressionFunc(this.estm_raylen);
        const estVec = Earth.getLngLatAlt(this._oposE.Add(this._Y.mul(step)));
        if (overwriteZwithL) estVec.z = step;
        return estVec;
    }
    public offset(distance: number): Vec3 {
        const pos = this._oposE.Add(this._Y.mul(distance));
        return Earth.getLngLatAlt(pos);
    }
    public forward(distance: number) { // no need to update because forward does not change the frame
        this._oposE = this._oposE.Add(this._Y.mul(distance));
        this._absH = this._oposE.Len();
        const lla = Earth.getLngLatAlt(this._oposE);
        this._RE = Earth.getRadius(lla[1]);
    }
    public O2E_p(vo: Vec3): Vec3 { // vo is in the observer frame, should be converted to the Earth frame
        return this._R.MulV(vo).Add(this._oposE);
    }
    public E2O_p(ve: Vec3): Vec3 { // ve is in the Earth frame, should be converted to the observer frame
        return this._RT.MulV(ve.Sub(this._oposE));
    }
    public O2E_v(vo: Vec3): Vec3 { // vo is in the observer frame, should be converted to the Earth frame
        return this._R.MulV(vo);
    }
    public E2O_v(ve: Vec3): Vec3 { // ve is in the Earth frame, should be converted to the observer frame
        return this._RT.MulV(ve);
    }
}