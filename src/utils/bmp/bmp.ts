import { Vec2 } from "../vec/vec2";
import { SDF } from "./sdf";

export { Vec2, SDF };

export class Color {
    constructor(
        public r: number,
        public g: number,
        public b: number,
        public a: number = 255
    ) { }

    static blend(c1: Color, c2: Color, weight: number) {
        return new Color(
            Math.round(c1.r * weight + c2.r * (1 - weight)),
            Math.round(c1.g * weight + c2.g * (1 - weight)),
            Math.round(c1.b * weight + c2.b * (1 - weight)),
            Math.round(c1.a * weight + c2.a * (1 - weight))
        );
    }
}

export class Bitmap {
    _data: Uint8Array;
    constructor(
        public width: number,
        public height: number,
        public bbp: number = 4
    ) {
        this._data = new Uint8Array(width * height * bbp);
        for (let i = 0; i < width * height * bbp; i++) {
            this._data[i] = 0;
        }
    }

    setPixel(x: number, y: number, color: Color) {
        const i = (y * this.width + x) * this.bbp;
        this._data[i] = color.r;
        this._data[i + 1] = color.g;
        this._data[i + 2] = color.b;
        this._data[i + 3] = color.a;
    }

    drawLine(x1: number, y1: number, x2: number, y2: number, color: Color) {
        const x1p = Math.round(x1 * this.width);
        const y1p = Math.round(y1 * this.height);
        const x2p = Math.round(x2 * this.width);
        const y2p = Math.round(y2 * this.height);
        const dx = Math.abs(x2p - x1p);
        const dy = Math.abs(y2p - y1p);
        const sx = x1p < x2p ? 1 : -1;
        const sy = y1p < y2p ? 1 : -1;
        let err = dx - dy;
        let x = x1p;
        let y = y1p;
        while (true) {
            this.setPixel(x, y, color);
            if (x == x2p && y == y2p) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    }

    drawPolygon(points: Array<Vec2>, color: Color, loop: boolean = true) {
        for (let i = 0; i < points.length - 1; i++) {
            this.drawLine(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, color);
        }
        if (loop) {
            this.drawLine(points[points.length - 1].x, points[points.length - 1].y, points[0].x, points[0].y, color);
        }
    }

    drawSDF(sdf: (p: Vec2) => number, lineColor: Color, fillColor: Color, epsilon = 0.02, flipy = true) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const xx = 2 * x / this.width - 1; // normalize x to [-1, 1]
                const yy = 2 * (flipy ? this.height - y : y) / this.height - 1; // normalize y to [-1, 1]
                const p = new Vec2(xx, yy);
                const d = sdf(p);
                // make the weight of the lineColor exponentially close to 1 as d approaches 0
                const lineColorWeight = Math.exp(-d * d / epsilon);
                // blend between lineColor and fillColor
                const color = Color.blend(lineColor, fillColor, lineColorWeight);
                if (d <= epsilon) { // inside or on the boundary
                    this.setPixel(x, y, color);
                }
            }
        }
    }
}