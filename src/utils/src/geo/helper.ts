import { OpType } from "../../geo";

export class GeoHelper {
    static Op = TriTypeOp;
    static Plus = TriTypeOp(OpType.ADD);
    static Minus = TriTypeOp(OpType.SUB);
    static Times = TriTypeOp(OpType.MUL);
    static Div = TriTypeOp(OpType.DIV);
}

export function TriTypeOp<T extends [number, number, number]>(op: OpType) {
    return (a: T, b: T): T => {
        switch (op) {
            case OpType.ADD:
                return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] as T;
            case OpType.SUB:
                return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as T;
            case OpType.MUL:
                return [a[0] * b[0], a[1] * b[1], a[2] * b[2]] as T;
            case OpType.DIV:
                return [a[0] / b[0], a[1] / b[1], a[2] / b[2]] as T;
        }
    };
}