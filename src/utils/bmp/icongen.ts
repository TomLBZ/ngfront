import { Bitmap, Color, SDF, Vec2 } from "./bmp";

export class IconGen {
    static red = new Color(255, 0, 0, 255);
    static green = new Color(0, 255, 0, 255);
    static blue = new Color(0, 0, 255, 255);
    static yellow = new Color(255, 255, 0, 255);
    static cyan = new Color(0, 255, 255, 255);
    static magenta = new Color(255, 0, 255, 255);
    static white = new Color(255, 255, 255, 255);
    static black = new Color(0, 0, 0, 255);
    static gray = new Color (127, 127, 127, 255);
    static transparent = new Color(0, 0, 0, 0);
    static epsilon = 0.01;
    static bloat = 0.9;
    static get r() { return (1 - IconGen.epsilon) * IconGen.bloat; }
    static polyPlaneVecs = [
        new Vec2(-1, -1),
        new Vec2(0, 1),
        new Vec2(1, -1),
        new Vec2(0, -0.5)
    ];
    static Circle(iconSize: number, lineColor: Color, fillColor: Color) {
        const bmp = new Bitmap(iconSize, iconSize);
        const sdf = (p: Vec2) => {
            return SDF.circle(p, IconGen.r);
        };
        bmp.drawSDF(sdf, lineColor, fillColor);
        return bmp;
    }
    static Poly(iconSize: number, vecs: Array<Vec2>, lineColor: Color, fillColor: Color) {
        const bmp = new Bitmap(iconSize, iconSize);
        const sdf = (p: Vec2) => {
            return SDF.poly(p, vecs.map(v => v.Mul(IconGen.r)));
        };
        bmp.drawSDF(sdf, lineColor, fillColor);
        return bmp;
    }
}