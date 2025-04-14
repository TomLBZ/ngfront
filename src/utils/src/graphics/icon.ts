import { Bitmap } from "./bmp";
import { SDF } from "./sdf";
import { Color } from "./color";
import { Vec2, Hash } from "../../math";

export class Icon {
    private static epsilon = 0.01;
    private static get r() { return 1 - Icon.epsilon }
    static polyPlaneVecs = [
        new Vec2(-1, -1),
        new Vec2(0, 1),
        new Vec2(1, -1),
        new Vec2(0, -0.5)
    ];
    static Circle(iconSize: number, fillColor: Color, lineColor?: Color, epsilon: number = Icon.epsilon) {
        const bmp = new Bitmap(iconSize, iconSize);
        const sdf = (p: Vec2) => {
            return SDF.circle(p, Icon.r);
        };
        const lc = lineColor === undefined ? fillColor : lineColor;
        bmp.drawSDF(sdf, lc, fillColor, epsilon);
        return new Icon(iconSize, bmp.data);
    }
    static Poly(iconSize: number, vecs: Array<Vec2>, fillColor: Color, lineColor?: Color, epsilon: number = Icon.epsilon) {
        const bmp = new Bitmap(iconSize, iconSize);
        const sdf = (p: Vec2) => {
            return SDF.poly(p, vecs.map(v => v.mul(Icon.r)));
        };
        const lc = lineColor === undefined ? fillColor : lineColor;
        bmp.drawSDF(sdf, lc, fillColor, epsilon);
        return new Icon(iconSize, bmp.data);
    }

    constructor(public size: number, public data: Uint8Array) {}
    public get hash() {
        const dataSum = this.data.reduce((acc, val) => acc + val, 0);
        const dataLen = this.data.length;
        // sample 10 bytes evenly from the data array, if length is less than 10, sample all
        const sample = dataLen < 10 ? this.data : this.data.filter((_, i) => i % (dataLen / 10) === 0);
        return Hash.hash([this.size, dataSum, ...sample]);
    }
}