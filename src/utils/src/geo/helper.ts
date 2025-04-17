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
}