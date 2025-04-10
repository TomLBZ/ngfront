#version 300 es
precision highp float;

in vec2 v_p; // Texture coordinate from the vertex shader.
out vec4 outColor;

uniform float u_time; // Time in seconds since the program started.
uniform vec2 u_scale; // Scale of the texture coordinates.
uniform sampler2D u_prev; // Previous pass texture.

const float EPS     = 1e-3                              ;
const float PI      = 3.1415926535897932384626433832795 ;
const float u2d = 0.8; // unit length for 2d ui
const float linew = 0.01;
const vec2 o2 = vec2(0.0, 0.0);
const vec3 hudc = vec3(0.0, 1.0, 0.75);

float seg2d(vec2 p, vec2 a, vec2 b ) { // by iq
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
}
float box2d(vec2 p, vec2 b ) { // by iq
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}
float trig2d(vec2 p, vec2 q ) { // adapted from iq
    p = vec2(abs(p.x), q.y - p.y);
    vec2 a = p - q*clamp( dot(p,q)/dot(q,q), 0.0, 1.0 );
    vec2 b = p - q*vec2( clamp( p.x/q.x, 0.0, 1.0 ), 1.0 );
    float s = -sign(q.y);
    vec2 d = min( vec2( dot(a,a), s*(p.x*q.y-p.y*q.x) ),
                  vec2( dot(b,b), s*(p.y-q.y)  ));
    return -sqrt(d.x)*sign(d.y);
}
float add(float d1, float d2) {
    return min(d1, d2);
}
float border(float p) {
    return abs(p);
}
vec2 place2d(vec2 p, vec2 o, float angle) {
    float sa = sin(angle);
    float ca = cos(angle);
    vec2 rp = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca);
    vec2 ro = vec2(o.x * ca - o.y * sa, o.x * sa + o.y * ca);
    return rp - ro;
}
float scale(vec2 p, float l, vec2 a, vec2 s, float tb) {
    vec2 p1 = vec2(-l * 0.5, 0.0);
    vec2 p2 = vec2(l * 0.5, 0.0);
    float seg0 = seg2d(p, p1, p2);
    float lend = seg2d(p, vec2(p1.x, a.x), vec2(p1.x, -a.y));
    float rend = seg2d(p, vec2(p2.x, a.x), vec2(p2.x, -a.y));
    float ends = add(lend, rend);
    float ftrig = trig2d(p, vec2(tb, s.x));
    float btrig = trig2d(vec2(p.x, -p.y), vec2(tb, s.y));
    float trigs = border(add(ftrig, btrig));
    return add(seg0, add(ends, trigs));
}
float hud(vec2 p) {
    float l = u2d; // length of scale
    float h = 0.5 * l; // half length of scale
    float a = 0.1 * l; // front segment length
    float b = 0.5 * a; // back segment length
    float t = 0.2 * a; // trig base length
    vec2 ft = vec2(b, t); // front trig (base, height)
    vec2 bt = vec2(b, EPS); // back trig (base, height)
    vec2 ls = vec2(-l, 0.0); // left scale
    vec2 rs = vec2(l, 0.0); // right scale
    vec2 ts = vec2(0.0, l); // top scale
    vec2 bs = vec2(0.0, -l); // bottom scale
    float rhom = border(box2d(place2d(p, o2, PI * 0.25), vec2(t, t)));
    float lsc = scale(place2d(p, ls * 0.5, PI * 0.5), h, vec2(a, b), ft, t);
    float rsc = scale(place2d(p, rs * 0.5, PI * -0.5), h, vec2(a, b), ft, t);
    float tsc = scale(place2d(p, ts * 0.5, PI), h, vec2(a, b), ft, t);
    float bsc = scale(place2d(p, bs * 0.5, 0.0), h, vec2(a, b), ft, t);
    float llsc = scale(place2d(p, ls, PI * 0.5), l, vec2(a, 0.0), bt, t);
    float lrsc = scale(place2d(p, rs, PI * -0.5), l, vec2(a, 0.0), bt, t);
    float ltsc = scale(place2d(p, ts, 0.0), l, vec2(a, 0.0), bt, t);
    float inner = add(add(lsc, rsc), add(tsc, bsc));
    float outer = add(add(llsc, lrsc), ltsc);
    return add(rhom, add(inner, outer));
}
vec4 prev() {
    return texture(u_prev, v_p / u_scale * 0.5 + 0.5);
}

// dummy main that colors square in the center of the screen with a gradient
void main() {
    float d = hud(v_p);
    outColor = mix(vec4(hudc, 1.0), prev(), smoothstep(-linew, linew, d));
}