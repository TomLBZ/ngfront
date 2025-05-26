export class GeoHelper {
    public static Plus<T extends [number, number, number]>(a: T, b: T): T {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] as T;
    }
    public static Minus<T extends [number, number, number]>(a: T, b: T): T {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as T;
    }
    public static Times<T extends [number, number, number]>(a: T, b: T): T {
        return [a[0] * b[0], a[1] * b[1], a[2] * b[2]] as T;
    }
    public static Div<T extends [number, number, number]>(a: T, b: T): T {
        return [a[0] / b[0], a[1] / b[1], a[2] / b[2]] as T;
    }
    public static Normalize<T extends [number, number, number]>(v: T): T {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        if (len === 0) return [0, 0, 0] as T; // avoid division by zero
        return [v[0] / len, v[1] / len, v[2] / len] as T;
    }
}