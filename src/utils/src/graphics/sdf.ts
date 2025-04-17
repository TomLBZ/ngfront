import { Vec2 } from '../../math';

export class SDF {

    static clamp(x: number, a: number, b: number) {
        return Math.min(Math.max(x, a), b);
    }

    static union(a: number, b: number) {
        return Math.min(a, b);
    }

    static intersection(a: number, b: number) {
        return Math.max(a, b);
    }

    static difference(a: number, b: number) {
        return Math.max(a, -b);
    }

    static segment(p: Vec2, a: Vec2, b: Vec2) {
        const pa = p.Sub(a);
        const ba = b.Sub(a);
        const h = SDF.clamp(pa.Dot(ba) / ba.Dot(ba), 0, 1);
        return pa.Sub(ba.mul(h)).Len();
    }

    static circle(p: Vec2, r: number) {
        return p.Len() - r;
    }

    static isoTriangle(p: Vec2, q: Vec2) {
        const pp = Vec2.New(Math.abs(p.x), p.y - q.y);
        const qq = Vec2.New(q.x, -q.y);
        const a = pp.Sub(qq.mul(SDF.clamp(pp.Dot(qq) / qq.Dot(qq), 0, 1)));
        const b = pp.Sub(qq.Mul(Vec2.New(SDF.clamp(pp.x / qq.x, 0, 1), 1)));
        const k = Math.sign(qq.y);
        const d = Math.min(a.Dot(a), b.Dot(b));
        const s = Math.max(k * (pp.x * qq.y - pp.y * qq.x), k * (pp.y - qq.y));
        return Math.sqrt(d) * Math.sign(s);
    }

    static poly(p: Vec2, v: Array<Vec2>) {
        const num = v.length;
        const psubv0 = p.Sub(v[0]);
        let d = psubv0.Dot(psubv0);
        let s = 1.0;
        for (let i = 0, j = num-1; i < num; j = i++) {
            // distance
            const e = v[j].Sub(v[i]);
            const w = p.Sub(v[i]);
            const b = w.Sub(e.mul(SDF.clamp(w.Dot(e) / e.Dot(e), 0, 1)));
            d = SDF.union(d, b.Dot(b));
            // winding number
            const c1 = p.y >= v[i].y;
            const c2 = p.y < v[j].y;
            const c3 = e.x * w.y > w.x * e.y;
            if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
        }
        return s * Math.sqrt(d);
    }
}