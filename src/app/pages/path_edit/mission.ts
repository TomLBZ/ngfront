import { Cache } from "../../../utils/cache/cache";
import { Color } from "../../../utils/color/color";
import { Path } from "../../../utils/path/path";
import { IPoint } from "../../../utils/point/point";

export class Mission {
    public id: number;
    public name: string;
    public description: string = "";
    public lead_id: number = -1;
    public follower_ids: Array<number> = [];
    public get lead_path(): Array<IPoint> {
        return this._traces.get(this.lead_id).points;
    }
    private _traces: Cache<Path> = new Cache<Path>();
    private _path: Path = new Path(-1);
    public get paths(): Array<Path> {
        const followerPaths = this.follower_ids.map((id) => this._traces.get(id)).filter((p) => p !== undefined && p.length > 0);
        return [...followerPaths, this._path];
    }
    constructor(id: number, name: string) {
        this.id = id;
        this.name = name;
        console.log(this);
    }
    public setPath(points: Array<IPoint>, color?: Color) {
        this._path.setPoints(points);
        if (color !== undefined) {
            this._path.color = color;
        }
    }
    public setTrace(id: number, points: Array<IPoint>, color?: Color) {
        if (!this._traces.has(id)) {
            this._traces.set(id, new Path(id));
            if (color !== undefined) {
                this._traces.get(id).color = color;
            }
        } else {
            this._traces.get(id).setPoints(points);
        }
    }
}