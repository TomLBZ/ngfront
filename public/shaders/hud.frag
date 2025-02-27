#version 300 es
precision highp float;

uniform float u_time; // Time in seconds since the program started.
uniform vec3 u_campos; // Camera position in world space.
uniform vec3 u_camdir; // Camera direction in world space.
uniform vec3 u_camright; // Camera right vector in world space.
uniform vec3 u_sundir; // Sun direction in world space.

in vec2 v_texcoord; // Texture coordinate from the vertex shader.
out vec4 outColor;

float PI = 3.14159265359;
float eps = 0.0001;
float um = 0.8; // meter unit length
float uhm = 0.4; // half meter unit length
float udm = 0.08; // decimeter unit length
float uxs = 0.016; // xtra small unit
float us = 0.04; // small unit
vec2 o = vec2(0.0, 0.0);
vec3 noc = vec3(0.0, 0.0, 0.0);

// 2d sdf
float seg2d( in vec2 p, in vec2 a, in vec2 b ) { // by iq
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
}
float box2d( in vec2 p, in vec2 b ) { // by iq
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}
float trig2d( in vec2 p, in vec2 q ) { // adapted from iq
    p = vec2(abs(p.x), q.y - p.y);
    vec2 a = p - q*clamp( dot(p,q)/dot(q,q), 0.0, 1.0 );
    vec2 b = p - q*vec2( clamp( p.x/q.x, 0.0, 1.0 ), 1.0 );
    float s = -sign( q.y );
    vec2 d = min( vec2( dot(a,a), s*(p.x*q.y-p.y*q.x) ),
                  vec2( dot(b,b), s*(p.y-q.y)  ));
    return -sqrt(d.x)*sign(d.y);
}
// 3d sdf
float sph3d( vec3 p, float s ) {
    return length(p)-s;
}
// ops
float add(in float d1, in float d2) {
    return min(d1, d2);
}
float border(in float p) {
    return abs(p);
}
vec2 place(in vec2 p, in vec2 o, in float angle) {
    vec2 rp = vec2(p.x * cos(angle) - p.y * sin(angle), p.x * sin(angle) + p.y * cos(angle));
    vec2 ro = vec2(o.x * cos(angle) - o.y * sin(angle), o.x * sin(angle) + o.y * cos(angle));
    return rp - ro;
}
// components
float scale(in vec2 p, in float l, in vec2 a, in vec2 s) {
    vec2 p1 = vec2(-l * uhm, 0.0);
    vec2 p2 = vec2(l * uhm, 0.0);
    float seg0 = seg2d(p, p1, p2);
    float lend = seg2d(p, vec2(p1.x, a.x), vec2(p1.x, -a.y));
    float rend = seg2d(p, vec2(p2.x, a.x), vec2(p2.x, -a.y));
    float ends = add(lend, rend);
    float ftrig = trig2d(p, vec2(uxs, s.x));
    float btrig = trig2d(vec2(p.x, -p.y), vec2(uxs, s.y));
    float trigs = border(add(ftrig, btrig));
    return add(seg0, add(ends, trigs));
}
float hud(in vec2 p) {
    vec2 l = vec2(-um, 0.0);
    vec2 r = vec2(um, 0.0);
    vec2 t = vec2(0.0, um);
    vec2 b = vec2(0.0, -um);
    vec2 ts = vec2(us, uxs);
    vec2 fs = vec2(us, eps);
    float rhom = border(box2d(place(p, o, PI * 0.25), vec2(uxs, uxs)));
    float lsc = scale(place(p, l * 0.5, PI * 0.5), 0.5, vec2(udm, us), ts);
    float rsc = scale(place(p, r * 0.5, PI * -0.5), 0.5, vec2(udm, us), ts);
    float tsc = scale(place(p, t * 0.5, PI), 0.5, vec2(udm, us), ts);
    float bsc = scale(place(p, b * 0.5, 0.0), 0.5, vec2(udm, us), ts);
    float llsc = scale(place(p, l, PI * 0.5), 1.0, vec2(udm, 0.0), fs);
    float lrsc = scale(place(p, r, PI * -0.5), 1.0, vec2(udm, 0.0), fs);
    float ltsc = scale(place(p, t, 0.0), 1.0, vec2(udm, 0.0), fs);
    float inner = add(add(lsc, rsc), add(tsc, bsc));
    float outer = add(add(llsc, lrsc), ltsc);
    return  add(rhom, add(inner, outer));
}
float sdf(in vec2 coords) {
    vec2 p = coords;
    // float ax = axis(p, vec2(1.0));
    float cent = hud(p);
    // float components = opUnion(ax, cent);
    return cent;
}
vec3 c2d(in float d, in vec3 linecolor) {
    return mix(linecolor, noc, smoothstep(0.0, 0.004, d));
}
vec3 fixedui(in vec2 p) {
    float d = hud(p);
    return c2d(d, vec3(0.0, 1.0, 0.75));
}
vec3 varui(in vec2 p) {
    return noc; // TODO: implement
}
vec3 bg3d(in vec2 p) {
    return noc; // TODO: implement
}
void main() {
    vec3 c = bg3d(v_texcoord) + fixedui(v_texcoord) + varui(v_texcoord);
    outColor = vec4(c, 1.0);
    return;    
}