#version 300 es
precision highp float;

uniform float u_time; // Time in seconds since the program started.
uniform vec3 u_campos; // Camera position in world space.
uniform vec3 u_camdir; // Camera direction in world space.
uniform vec3 u_camright; // Camera right vector in world space.
uniform vec3 u_camup; // Camera up vector in world space.
uniform vec3 u_sundir; // Sun direction in world space.
uniform float u_RE; // Earth radius in meters.
uniform float u_RAU; // Distance to the sun in AU.

in vec2 v_texcoord; // Texture coordinate from the vertex shader.
out vec4 outColor;

float au = 149597870700.0; // Astronomical unit in meters
float PI = 3.14159265359;
float eps = 0.0001;
float inf = 1000000.0;
float um = 0.8; // meter unit length
float uhm = 0.4; // half meter unit length
float udm = 0.08; // decimeter unit length
float uxs = 0.016; // xtra small unit
float us = 0.04; // small unit
vec2 o2 = vec2(0.0, 0.0);
vec3 o3 = vec3(0.0, 0.0, 0.0);
vec3 noc = vec3(0.0, 0.0, 0.0);
vec3 whc = vec3(1.0, 1.0, 1.0);

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
float box3d( vec3 p, vec3 b ) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
// ops
float add(in float d1, in float d2) {
    return min(d1, d2);
}
float border(in float p) {
    return abs(p);
}
vec2 place2d(in vec2 p, in vec2 o, in float angle) {
    vec2 rp = vec2(p.x * cos(angle) - p.y * sin(angle), p.x * sin(angle) + p.y * cos(angle));
    vec2 ro = vec2(o.x * cos(angle) - o.y * sin(angle), o.x * sin(angle) + o.y * cos(angle));
    return rp - ro;
}
vec3 rotAng(in vec3 p, in vec3 a) { // a.x = roll, a.y = pitch, a.z = yaw
    float cr = cos(a.x);
    float sr = sin(a.x);
    float cp = cos(a.y);
    float sp = sin(a.y);
    float cy = cos(a.z);
    float sy = sin(a.z);
    mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cr, -sr, 0.0, sr, cr);
    mat3 ry = mat3(cp, 0.0, sp, 0.0, 1.0, 0.0, -sp, 0.0, cp);
    mat3 rz = mat3(cy, -sy, 0.0, sy, cy, 0.0, 0.0, 0.0, 1.0);
    return rx * ry * rz * p;
}
vec3 place3d(in vec3 p, in vec3 o, in vec3 angle) {
    return rotAng(p, angle) - rotAng(o, angle);
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
    float rhom = border(box2d(place2d(p, o2, PI * 0.25), vec2(uxs, uxs)));
    float lsc = scale(place2d(p, l * 0.5, PI * 0.5), 0.5, vec2(udm, us), ts);
    float rsc = scale(place2d(p, r * 0.5, PI * -0.5), 0.5, vec2(udm, us), ts);
    float tsc = scale(place2d(p, t * 0.5, PI), 0.5, vec2(udm, us), ts);
    float bsc = scale(place2d(p, b * 0.5, 0.0), 0.5, vec2(udm, us), ts);
    float llsc = scale(place2d(p, l, PI * 0.5), 1.0, vec2(udm, 0.0), fs);
    float lrsc = scale(place2d(p, r, PI * -0.5), 1.0, vec2(udm, 0.0), fs);
    float ltsc = scale(place2d(p, t, 0.0), 1.0, vec2(udm, 0.0), fs);
    float inner = add(add(lsc, rsc), add(tsc, bsc));
    float outer = add(add(llsc, lrsc), ltsc);
    return  add(rhom, add(inner, outer));
}
vec3 pix(in vec2 p) { // screen 1m from camera / origin, scale 1m per unit
    float ang = atan(p.y, p.x);
    float len = length(p);
    vec3 v = vec3(cos(ang) * len, sin(ang) * len, 1.0);
    vec3 v_world = u_campos + u_camright * v.x + u_camup * v.y + u_camdir * v.z;
    return v_world;
}
float world(in vec3 p) {
    // vec3 globep = place3d(p, o3, vec3(0.0, 0.0, 0.0));
    // float globe = sph3d(globep, u_RE);
    // vec3 boxp = place3d(p, u_campos + u_camdir * 10.0, vec3(0.0, 0.0, 0.0));
    // float box = box3d(boxp, vec3(0.5, 0.5, 0.5));
    // return add(globe, box);
    vec3 balltarget = u_campos + u_camdir * u_time; // go forward in time 1m per second
    vec3 ballp = place3d(p, balltarget, vec3(0.0, 0.0, 0.0));
    float globe = sph3d(ballp, 1.0); // 1m radius ball
    return globe;
}
vec4 march(in vec2 p, out vec3 rd) {
    vec3 ro = u_campos; // ray origin is camera position
    vec3 px = pix(p); // target pixel in world space
    rd = normalize(px - ro); // ray direction is from camera to target pixel
    float t = 0.0; // distance along ray
    for (int i = 0; i < 100; i++) { // max iterations
        vec3 pos = px + rd * t; // current position along ray emitted from pixel
        float d = world(pos); // distance to nearest object
        if (d < eps) { // hit earth
            return vec4(t, i, 0.0, 0.0); // return distance along ray
        }
        t += d; // move along ray
    }
    return vec4(inf, 100, 0.0, 0.0); // didn't hit earth
}
vec3 c2d(in float d, in vec3 linecolor) {
    return mix(linecolor, noc, smoothstep(0.0, 0.004, d));
}
vec3 c3d(in vec4 m, in vec3 rd) {
    float dist = m.x;
    float iter = m.y;
    if (dist >= inf) {
        return noc;
    }
    if (iter > 90.0) {
        return whc;
    }
    vec3 pos = u_campos + rd * dist;
    vec3 norm = normalize(pos);
    vec3 sun = normalize(u_sundir);
    float sunl = dot(norm, sun);
    float sunp = smoothstep(0.0, 0.1, sunl);
    float amb = 0.1;
    float dif = clamp(sunl, amb, 1.0);
    vec3 col = vec3(0.0, 0.0, 1.0);
    vec3 iterColOverlay = smoothstep(0.0, 90.0, iter) * vec3(0.0, 1.0, 0.0);
    return col * (amb + sunp * dif) + iterColOverlay;
}
vec3 fixedui(in vec2 p) {
    float d = hud(p);
    return c2d(d, vec3(0.0, 1.0, 0.75));
}
vec3 varui(in vec2 p) {
    return noc; // TODO: implement
}
vec3 bg3d(in vec2 p) {
    vec3 rd;
    vec4 m = march(p, rd);
    return c3d(m, rd);
}
void main() {
    vec3 c = bg3d(v_texcoord) + fixedui(v_texcoord) + varui(v_texcoord);
    outColor = vec4(c, 1.0);
    return;    
}