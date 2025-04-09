import { Vec3 } from '../vec/vec3';
import { Mat3 } from '../mat/mat3';
import { Earth } from './earth_old';
import { Vec2 } from '../vec/vec2';
import { Plane3D } from '../geom/plane';
import { Line3D } from '../geom/line';
import { Circle2D } from '../geom/circle';
import { Rectangle2D } from '../geom/rect';

export class Camera {
    private _lng: number = 0;
    private _lat: number = 0;
    private _alt: number = 0;
    private _pitch: number = 0;
    private _roll: number = 0;
    private _yaw: number = 0;
    private _rE: number = Earth.R;
    private _pos: Vec3 = new Vec3(0, 0, 0);
    private _Z: Vec3 = new Vec3(0, 0, 1);
    private _Y: Vec3 = new Vec3(0, 1, 0);
    private _X: Vec3 = new Vec3(1, 0, 0);
    private _R: Mat3 = new Mat3();
    private _RT: Mat3 = new Mat3();
    private _fov: Vec3 = new Vec3();
    private _frustumTL!: Line3D;
    private _frustumTR!: Line3D;
    private _frustumBL!: Line3D;
    private _frustumBR!: Line3D;
    private _frustumPlaneBack!: Plane3D;
    public get fov(): Vec3 { return this._fov; }
    public get lng(): number { return this._lng; }
    public get lat(): number { return this._lat; }
    public get alt(): number { return this._alt; }
    public get pitch(): number { return this._pitch; }
    public get roll(): number { return this._roll; }
    public get yaw(): number { return this._yaw; }
    public get rE(): number { return this._rE; }
    public get pos(): Vec3 { return this._pos; }
    public get up(): Vec3 { return this._Z; }
    public get front(): Vec3 { return this._Y; }
    public get right(): Vec3 { return this._X; }
    public get cf_epos(): Vec3 { return this._RT.MulV(this._pos.Neg()); } // earth position in camera frame
    public get cf_eX(): Vec3 { return new Vec3(this._X.x, this._Y.x, this._Z.x); } // earth's up in camera frame
    public get cf_eY(): Vec3 { return new Vec3(this._X.y, this._Y.y, this._Z.y); } // earth's front in camera frame
    public get cf_eZ(): Vec3 { return new Vec3(this._X.z, this._Y.z, this._Z.z); } // earth's right in camera frame
    private initAxis() {
        this._Z = this._pos.Norm();
        this._Y = Earth.getNorthAtPos(this._Z);
        this._X = this._Y.Cross(this._Z).Norm();
    }
    private updateAxis(rollpitchyaw: Vec3) {
        this._roll = rollpitchyaw.x;
        this._pitch = rollpitchyaw.y;
        this._yaw = rollpitchyaw.z;
        this._Y = this._Y.rotateAxis(rollpitchyaw.z, this._Z).Norm();
        this._X = this._Y.Cross(this._Z).Norm();
        this._Y = this._Y.rotateAxis(rollpitchyaw.y, this._X).Norm();
        this._Z = this._X.Cross(this._Y).Norm();
        this._Z = this._Z.rotateAxis(rollpitchyaw.x, this._Y).Norm();
        this._X = this._Y.Cross(this._Z).Norm();
    }
    private updateMat() {
        this._R = Mat3.fromArray([
            this._X.x, this._Y.x, this._Z.x,
            this._X.y, this._Y.y, this._Z.y,
            this._X.z, this._Y.z, this._Z.z
        ]);
        this._RT = this._R.T();
    }
    private updateFrustumCorners(): void {
        const fovRad = this._fov.mul(Math.PI / 180);
        const hh = Math.tan(fovRad.x / 2); // half horizontal field of view
        const hv = Math.tan(fovRad.y / 2); // half vertical field of view
        const nTL = this.front.Add(this.up.mul(hv) ).Add(this.right.mul(-hh)).Norm(); // top left
        const nTR = this.front.Add(this.up.mul(hv) ).Add(this.right.mul(hh) ).Norm(); // top right
        const nBL = this.front.Add(this.up.mul(-hv)).Add(this.right.mul(-hh)).Norm(); // bottom left
        const nBR = this.front.Add(this.up.mul(-hv)).Add(this.right.mul(hh) ).Norm(); // bottom right
        this._frustumTL = new Line3D(this._pos, nTL);
        this._frustumTR = new Line3D(this._pos, nTR);
        this._frustumBL = new Line3D(this._pos, nBL);
        this._frustumBR = new Line3D(this._pos, nBR);
    }
    private updateFrustumPlanes(): void { // all normals point inwards the frustum
        this._frustumPlaneBack = Plane3D.fromNormalAndPoint(this.front.Neg(), new Vec3()); // back plane passes through origin and is perpendicular to the front direction
    }
    private update(rollpitchyaw: Vec3) {
        this.updateAxis(rollpitchyaw);
        this.updateMat();
        this.updateFrustumCorners();
        this.updateFrustumPlanes();
    }
    constructor(p: Vec3, rollpitchyaw: Vec3, fov: Vec2, pIsXYZ: boolean = false) {
        const halfFovRads = fov.mul(0.5 * Math.PI / 180);
        const xtan = Math.tan(halfFovRads.x);
        const ytan = Math.tan(halfFovRads.y);
        const rtan = Math.sqrt(xtan * xtan + ytan * ytan);
        const rfov = Math.atan(rtan) * 2 * 180 / Math.PI;
        this._fov = new Vec3(fov.x, fov.y, rfov);
        const lnglatalt = pIsXYZ ? Earth.getLngLatAlt(p) : p;
        this._lng = lnglatalt.x;
        this._lat = lnglatalt.y;
        this._alt = lnglatalt.z;
        this._pos = pIsXYZ ? p : Earth.getPosition(this._lng, this._lat, this._alt);
        this._rE = Earth.getRadius(this._lat);
        this.initAxis();
        this.update(rollpitchyaw);
    }
    public ve2c(ve: Vec3): Vec3 { // convert vector from earth frame to camera frame
        return this._RT.MulV(ve);
    }
    public getFootprint(): Vec2[] {
        const d = this._pos.Dot(this._frustumPlaneBack.n);
        if (d <= 0) return []; // earth is behind the camera
        const tl_back_intersec = this._frustumTL.intersectPlane(this._frustumPlaneBack);
        const tr_back_intersec = this._frustumTR.intersectPlane(this._frustumPlaneBack);
        const bl_back_intersec = this._frustumBL.intersectPlane(this._frustumPlaneBack);
        const br_back_intersec = this._frustumBR.intersectPlane(this._frustumPlaneBack);
        const backplane_x = tr_back_intersec.Sub(tl_back_intersec).Norm();
        const backplane_y = bl_back_intersec.Sub(tl_back_intersec).Norm();
        const earth = new Circle2D(new Vec2(), Earth.R); // backplane always passes through the origin, so earth is a circle on the backplane
        const tl_on_plane = new Vec2(tl_back_intersec.Dot(backplane_x), tl_back_intersec.Dot(backplane_y));
        const br_on_plane = new Vec2(br_back_intersec.Dot(backplane_x), br_back_intersec.Dot(backplane_y));
        const bounding_rect = Rectangle2D.fromPoints(tl_on_plane, br_on_plane);
        // clip the earth circle using the 4 corners of the frustum (in the backplane)
        // TODO: find a better way to calculate the camera footprint.
        return [];
    }
}