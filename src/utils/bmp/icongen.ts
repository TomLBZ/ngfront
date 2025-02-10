import { Bitmap, Color, SDF, Vec2 } from "./bmp";

export class IconGen {
    static epsilon = 0.006;
    static bloat = 0.94;
    static get r() { return (1 - IconGen.epsilon) * IconGen.bloat; }
    static polyPlaneVecs = [
        new Vec2(-1, -1),
        new Vec2(0, 1),
        new Vec2(1, -1),
        new Vec2(0, -0.5)
    ];
    static Circle(iconSize: number, lineColor: Color, fillColor: Color, epsilon: number = IconGen.epsilon) {
        const bmp = new Bitmap(iconSize, iconSize);
        const sdf = (p: Vec2) => {
            return SDF.circle(p, IconGen.r);
        };
        bmp.drawSDF(sdf, lineColor, fillColor, epsilon);
        return bmp;
    }
    static Poly(iconSize: number, vecs: Array<Vec2>, lineColor: Color, fillColor: Color, epsilon: number = IconGen.epsilon) {
        const bmp = new Bitmap(iconSize, iconSize);
        const sdf = (p: Vec2) => {
            return SDF.poly(p, vecs.map(v => v.Mul(IconGen.r)));
        };
        bmp.drawSDF(sdf, lineColor, fillColor, epsilon);
        return bmp;
    }
}