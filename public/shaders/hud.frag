#version 300 es
precision highp float;

uniform float u_time; // Time in seconds since the program started.
uniform vec2 u_resolution; // Viewport resolution
uniform vec3 u_epos; // Earth position in camera space.
uniform vec3 u_ex; // Earth front vector in camera space.
uniform vec3 u_ey; // Earth right vector in camera space.
uniform vec3 u_ez; // Earth up vector in camera space.
uniform vec3 u_sundir; // Sun direction in world space.
uniform float u_rE; // Earth radius in million meters
uniform float u_dS; // Sun distance in 1e9 meters
uniform float u_rS; // Sun radius in 1e9 meters
uniform sampler2D u_dayTexture; // The texture to render.
uniform sampler2D u_nightTexture; // The texture to render.
// TODO: change from earth frame to camera frame to prevent jitter

in vec2 v_p; // Texture coordinate from the vertex shader.
out vec4 outColor;

// consts
const float PI = 3.1415926535897932384626433832795;
const float PI2 = 6.283185307179586476925286766559;
const float PI_2 = 1.5707963267948966192313216916398;
const vec2 o2 = vec2(0.0, 0.0);
const vec3 o3 = vec3(0.0, 0.0, 0.0);
const vec2 u2 = vec2(1.0, 1.0);
const vec3 u3 = vec3(1.0, 1.0, 1.0);
const vec3 red = vec3(1.0, 0.0, 0.0);
const vec3 green = vec3(0.0, 1.0, 0.0);
const vec3 blue = vec3(0.0, 0.0, 1.0);
const vec3 yellow = vec3(1.0, 1.0, 0.0);
const vec3 cyan = vec3(0.0, 1.0, 1.0);
const vec3 magenta = vec3(1.0, 0.0, 1.0);
// globals
float lw = 0.0001;
float inf = 1000000.0;
float um = 0.8; // meter unit length
float uhm = 0.4; // half meter unit length
float udm = 0.08; // decimeter unit length
float uxs = 0.016; // xtra small unit
float us = 0.04; // small unit

// 2d sdf
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
    float s = -sign( q.y );
    vec2 d = min( vec2( dot(a,a), s*(p.x*q.y-p.y*q.x) ),
                  vec2( dot(b,b), s*(p.y-q.y)  ));
    return -sqrt(d.x)*sign(d.y);
}
// 3d sdf
float sph3d(vec3 p, float s) {
    return length(p)-s;
}
float box3d(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
float seg3d(vec3 p, vec3 a, vec3 b, float r)
{
  vec3 pa = p - a, ba = b - a;
  float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
  return length( pa - ba*h ) - r;
}
// ops
float add(float d1, float d2) {
    return min(d1, d2);
}
float border(float p) {
    return abs(p);
}
vec2 place2d(vec2 p, vec2 o, float angle) {
    vec2 rp = vec2(p.x * cos(angle) - p.y * sin(angle), p.x * sin(angle) + p.y * cos(angle));
    vec2 ro = vec2(o.x * cos(angle) - o.y * sin(angle), o.x * sin(angle) + o.y * cos(angle));
    return rp - ro;
}
vec3 rotAng(vec3 p, vec3 a) { // a.x = roll, a.y = pitch, a.z = yaw
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
vec3 place3d(vec3 p, vec3 o, vec3 angle) {
    return rotAng(p, angle) - rotAng(o, angle);
}
// components
float scale(vec2 p, float l, vec2 a, vec2 s) {
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
float hud(vec2 p) {
    vec2 l = vec2(-um, 0.0);
    vec2 r = vec2(um, 0.0);
    vec2 t = vec2(0.0, um);
    vec2 b = vec2(0.0, -um);
    vec2 ts = vec2(us, uxs);
    vec2 fs = vec2(us, lw);
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
vec4 p2rdc(vec2 p) { // screen 1m from camera / origin, scale 1m per unit
    float ang = atan(p.y, p.x);
    float len = length(p);
    vec3 pix = vec3(cos(ang) * len, 1.0, sin(ang) * len);
    float c = 0.5 / min(u_resolution.x, u_resolution.y) / length(pix);
    return vec4(normalize(pix), c);
}
float earth(vec3 p) {
    vec3 earthp = place3d(p, u_epos, o3);
    return sph3d(earthp, u_rE);
}
float sun(vec3 p) {
    vec3 sunp = place3d(p, u_epos + u_sundir * u_dS, o3);
    return sph3d(sunp, u_rS);
}
float axis(vec3 p) {
    float x = seg3d(p, u_epos, u_epos + u_ex * u_rE * 1.5, 0.1);
    float y = seg3d(p, u_epos, u_epos + u_ey * u_rE * 1.5, 0.1);
    float z = seg3d(p, u_epos, u_epos + u_ez * u_rE * 1.5, 0.1);
    return min(min(x, y), z);
}
vec2 world(vec3 p) {
    float e = earth(p);
    float a = axis(p);
    float s = sun(p);
    float min = min(min(e, a), s);
    return vec2(min, min == e ? 0.0 : min == a ? 1.0 : 2.0);
}
vec3 march(vec3 rd, float eps_c) {
    float t = 0.0; // distance along ray
    for (int i = 0; i < 200; i++) { // max iterations
        vec3 pos = rd * t; // current position along ray emitted from CAMERA (origin)
        vec2 di = world(pos); // distance to nearest object
        if (di.x < eps_c * t) { // hit earth
            return vec3(t, i, di.y); // return distance along ray
        }
        t += di.x; // move along ray
    }
    return vec3(inf, 100, -1.0); // didn't hit earth
}
vec3 c2d(float d, vec3 linecolor) {
    return mix(linecolor, o3, smoothstep(0.0, 0.004, d));
}
vec3 tmap(vec3 pe, float sunl) {
    float lon = atan(pe.y, pe.x); // range is -pi to pi
    float lat = atan(pe.z, length(pe.xy)); // range is -pi/2 to pi/2
    float u = (lon < 0.0 ? lon + PI2: lon) / PI2; // range is 0 to 1
    float v = (lat + PI_2) / PI; // range is 0 to 1
    vec2 tcoords = vec2(u, 1.0 - v);
    if (sunl > 0.2) return texture(u_dayTexture, tcoords).rgb;
    if (sunl < -0.2) return texture(u_nightTexture, tcoords).rgb;
    vec3 daysample = texture(u_dayTexture, tcoords).rgb;
    vec3 nightsample = texture(u_nightTexture, tcoords).rgb;
    float ratio = (sunl + 0.2) / 0.4;
    return mix(nightsample, daysample, ratio);
}
vec3 colorEarth(vec3 po, vec3 pe, int i) {
    float sunl = dot(normalize(po - u_epos), u_sundir); // -1 to 1
    vec3 tmap = tmap(pe, sunl);
    return tmap;
    // vec3 objc = tmap; // object color
    // float iterp = 1.0 - exp(-float(i) * 0.01);
    // vec3 iterc = iterp * u3; // iteration color
    // float objclen = length(objc);
    // float ratio = objclen / (iterc.g + objclen);
    // return mix(iterc, objc, ratio);
}
vec3 colorAxis(vec3 pe) {
    if (pe.x > 1.0) return red;
    if (pe.y > 1.0) return green;
    if (pe.z > 1.0) return blue;
    return o3;
}
vec3 o2e(vec3 p) {
    mat3x3 r = mat3x3(u_ex, u_ey, u_ez);
    return transpose(r) * (p - u_epos);
}
vec3 c3d(vec3 m, vec3 rd) {
    float dist = m.x;
    int iter = int(m.y);
    int id = int(m.z);
    if (dist >= inf || dist < 0.0) {
        return o3;
    }
    vec3 po = rd * dist; // intersection in plane frame
    vec3 pe = o2e(po); // intersection in earth frame
    switch (id) {
        case 0:
            return colorEarth(po, pe, iter);
        case 1:
            return colorAxis(pe);
        case 2:
            return yellow;
        default:
            return o3;
    }
}
vec3 fixedui(vec2 p) {
    float d = hud(p);
    return c2d(d, vec3(0.0, 1.0, 0.75));
}
vec3 varui(vec2 p) {
    return o3; // TODO: implement
}
vec3 bg3d(vec2 p) {
    vec4 rdc = p2rdc(p);
    vec3 rd = rdc.xyz;
    vec3 m = march(rd, rdc.w);
    return c3d(m, rd);
}
void main() {
    vec3 c = bg3d(v_p) + fixedui(v_p) + varui(v_p);
    outColor = vec4(c, 1.0);
    return;    
}