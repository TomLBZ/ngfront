import { Hash } from "../math/hash";

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

    static fromHex9(hex: string) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) : 255;
        return new Color(r, g, b, a);
    }

    static fromHex7(hex: string) {
        return Color.fromHex9(hex + "ff");
    }

    static Transparent = new Color(0, 0, 0, 0);
    static Black = new Color(0, 0, 0, 255);
    static White = new Color(255, 255, 255, 255);
    static Red = new Color(255, 0, 0, 255);
    static Green = new Color(0, 255, 0, 255);
    static Blue = new Color(0, 0, 255, 255);
    static Yellow = new Color(255, 255, 0, 255);
    static Cyan = new Color(0, 255, 255, 255);
    static Magenta = new Color(255, 0, 255, 255);
    static Gray = new Color(127, 127, 127, 255);
    static Orange = new Color(255, 127, 0, 255);
    static Purple = new Color(127, 0, 127, 255);
    static Teal = new Color(0, 127, 127, 255);
    static Brown = new Color(127, 63, 0, 255);

    static Random() {
        return new Color(
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256)
        );
    }

    static RandomBright() {
        return new Color(
            Math.floor(Math.random() * 128 + 128),
            Math.floor(Math.random() * 128 + 128),
            Math.floor(Math.random() * 128 + 128)
        );
    }

    static RandomDark() {
        return new Color(
            Math.floor(Math.random() * 128),
            Math.floor(Math.random() * 128),
            Math.floor(Math.random() * 128)
        );
    }

    static RandomBetween(c1: Color, c2: Color) {
        return new Color(
            Math.floor(Math.random() * (c2.r - c1.r) + c1.r),
            Math.floor(Math.random() * (c2.g - c1.g) + c1.g),
            Math.floor(Math.random() * (c2.b - c1.b) + c1.b)
        );
    }

    public get hash(): number {
        return Hash.hash([this.r, this.g, this.b, this.a]);
    }

    public get hex9() {
        return `#${this.r.toString(16).padStart(2, "0")}${this.g.toString(16).padStart(2, "0")}${this.b.toString(16).padStart(2, "0")}${this.a.toString(16).padStart(2, "0")}`;
    }

    public get hex7() {
        return `#${this.r.toString(16).padStart(2, "0")}${this.g.toString(16).padStart(2, "0")}${this.b.toString(16).padStart(2, "0")}`;
    }

    public get RGBAStr() {
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a / 255})`;
    }

    lighten(weight: number = 0.8) {
        return Color.blend(this, Color.White, weight);
    }

    darken(weight: number = 0.8) {
        return Color.blend(this, Color.Black, weight);
    }

    solidify(weight: number = 0.8) {
        return new Color(this.r, this.g, this.b, Math.round(this.a * weight));
    }

    transparentize(weight: number = 0.8) {
        return new Color(this.r, this.g, this.b, Math.round(this.a * (1 - weight)));
    }

    opposite() {
        return new Color(255 - this.r, 255 - this.g, 255 - this.b, this.a);
    }
}