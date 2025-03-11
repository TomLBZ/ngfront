#version 300 es
precision highp float;
// consts
#define BD_MAXLEN   18
const float EPS     = 1e-3                              ;
const float PI      = 3.1415926535897932384626433832795 ;
const float PI2     = 6.283185307179586476925286766559  ;
const float PI_2    = 1.5707963267948966192313216916398 ;
const float RC4     = -1.42770400e-02                   ;
const float RC3     = -1.53923793e+00                   ;
const float RC2     = -1.77213122e+02                   ;
const float RC1     = -2.12059191e+04                   ;
const float RC0     = 6.37813700e+06                    ;
// uniforms
uniform float u_time; // Time in seconds since the program started.
uniform vec2 u_resolution; // Viewport resolution
uniform vec2 u_ses; // Earch scale factor and sun scale factor
uniform vec2 u_srd; // Sun radius and distance in meters
uniform vec3 u_epos; // Earth position in camera space.
uniform vec3 u_sundir; // Sun direction in world space.
uniform vec3 u_ex; // Earth front vector in camera space.
uniform vec3 u_ey; // Earth right vector in camera space.
uniform vec3 u_ez; // Earth up vector in camera space.
uniform highp sampler2DArray u_tx; // The texture array
uniform vec3 u_txyz[BD_MAXLEN]; // the bounding boxes of the texture
uniform float u_ntx; // the number of tiles
uniform float u_gridl; // the grid level

in vec2 v_p; // Texture coordinate from the vertex shader.
out vec4 outColor;

// calculated vars
vec3 EPOS() { return u_epos * u_ses.x; }
float RS() { return u_srd.x * u_ses.y; }
float DS() { return u_srd.y * u_ses.y; }

const vec2 o2 = vec2(0.0, 0.0);
const vec3 o3 = vec3(0.0, 0.0, 0.0);
const vec2 u2 = vec2(1.0, 1.0);
const vec3 u3 = vec3(1.0, 1.0, 1.0);
const vec3 hudc = vec3(0.0, 1.0, 0.75);
const vec3 sunc = vec3(1.0, 1.0, 0.75);
const vec3 dpc = vec3(0.5, 0.4, 0.3); // day plain color
const vec3 npc = vec3(0.0, 0.2, 0.4); // night plain color
// globals
float u2d = 0.8; // unit length for 2d ui
float inf = 1000000.0; // value above which is considered infinity

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
    float s = -sign(q.y);
    vec2 d = min( vec2( dot(a,a), s*(p.x*q.y-p.y*q.x) ),
                  vec2( dot(b,b), s*(p.y-q.y)  ));
    return -sqrt(d.x)*sign(d.y);
}
// 3d sdf
float sph3d(vec3 p, float r) {
    return length(p) - r;
}
// ops
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
// components
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
    vec3 pos = p - EPOS();
    float r = length(pos);          // length of pos vector
    float s2 = (pos.z * pos.z) / (r * r); // = sin(lat)^2
    float R = RC0 + s2 * (RC1 + s2 * (RC2 + s2 * (RC3 + s2 * RC4)));
    return r - R * u_ses.x;
}
float sun(vec3 p) {
    vec3 spos = EPOS() + u_sundir * DS();
    return sph3d(p - spos, RS());
}
vec2 world(vec3 p) {
    float e = earth(p);
    float s = sun(p);
    float min = min(e, s);
    float id = min == e ? 0.0 : 1.0;
    return vec2(min, id);
}
vec3 n(vec3 p) {
    vec2 d = vec2(EPS, -EPS);
    return normalize(d.xyy * world(p + d.xyy).x + d.yyx * world(p + d.yyx).x + d.yxy * world(p + d.yxy).x + d.xxx * world(p + d.xxx).x);
}
vec3 march(vec3 rd, float eps_c) {
    float t = 0.0; // distance along ray
    for (int i = 0; i < 100; i++) { // max iterations
        vec3 pos = rd * t; // current position along ray emitted from CAMERA (origin)
        vec2 di = world(pos); // distance to nearest object
        if (di.x < eps_c * t) { // hit earth
            return vec3(t, i, di.y); // return distance along ray
        }
        t += di.x; // move along ray
    }
    return vec3(inf, 100, -1.0); // didn't hit earth
}
vec3 mixc(vec3 d, vec3 n, float r, float dl) {
    float ratio = clamp((dl + r) / (2.0 * r), 0.0, 1.0);
    return mix(n, d, ratio);
}
vec2 ll2xyi(int z, vec2 p, out vec2 fracs) { // lng and lat are in radians
    float zfactor = float(1 << z);
    float x = (p.x + PI) / PI2 * zfactor;
    float y = (1.0 - log(tan(p.y) + 1.0 / cos(p.y)) / PI) * 0.5 * zfactor;
    fracs = vec2(fract(x), fract(y));
    return vec2(floor(x), floor(y));
}
vec3 p2xyz(vec2 p) { // returns the sample vector for 3d texture, otherwise v3 of -1
    for (int i = 0; i < int(u_ntx); i++) {
        vec2 fracs;
        vec2 pxy = ll2xyi(int(u_txyz[i].z), p, fracs);
        if (pxy == u_txyz[i].xy) return vec3(fracs, i);
    }
    return vec3(-1);
}
vec3 tmap(vec3 pe, float dl, float dist) {
    float lon = atan(pe.y, pe.x); // range is -pi to pi
    float lat = atan(pe.z, length(pe.xy)); // range is -pi/2 to pi/2
    for (int i = int(u_gridl); i > 0; i--) {
        float scale = float(1 << i) * 3.0 / PI;
        float gdifflng = lon * scale;
        float gdifflat = lat * scale;
        bool onLngDiv = abs(gdifflng - round(gdifflng)) < EPS * dist;
        bool onLatDiv = abs(gdifflat - round(gdifflat)) < EPS * dist;
        if (onLngDiv || onLatDiv) return u3;
    }
    float blurr = 0.2;
    vec3 dnc = mixc(dpc, npc, blurr, dl);
    vec3 xyz = p2xyz(vec2(lon, lat));
    if (xyz.z < 0.0) return dnc;
    vec3 txt = texture(u_tx, xyz).rgb;
    return mix(txt, dnc, 0.25);
}
vec3 o2e(vec3 p) {
    mat3x3 r = mat3x3(u_ex, u_ey, u_ez);
    return transpose(r) * (p - EPOS());
}
float speci(vec3 no, vec3 rd, float tightness) { // normal, ray direction
    return pow(max(dot(no, rd), 0.0), tightness);
}
vec3 colorEarth(vec3 po, vec3 no, int i, float dist) { // no is the surface normal in object frame
    vec3 pe = o2e(po); // intersection in earth frame
    float dl = dot(normalize(po - EPOS()), u_sundir); // daylight value: -1 to 1
    vec3 tmap = tmap(pe, dl, dist);
    float spi = speci(no, u_sundir, 16.0); // specular intensity
    vec3 objc = tmap * (spi + 0.9); // object color
    float iterp = 1.0 - exp(-float(i) * 0.01);
    vec3 iterc = iterp * u3; // iteration color
    float objclen = length(objc);
    float ratio = objclen / (iterc.g + objclen);
    return mix(iterc, objc, ratio);
}
vec3 c3d(vec3 m, vec3 rd) {
    float dist = m.x;
    int iter = int(m.y);
    int id = int(m.z);
    if (dist < 0.0)  return o3;
    if (dist >= inf) {
        return sunc * speci(rd, u_sundir, 256.0);
    }
    vec3 po = rd * dist; // intersection in plane frame
    vec3 no = n(po); // normal in plane frame
    switch (id) {
        case 0:
            return colorEarth(po, no, iter, dist);
        default:
            return u3;
    }
}
vec3 fixedui(vec2 p) {
    float d = hud(p);
    float s = smoothstep(0.0, 0.01 * u2d, d);
    return mix(hudc, o3, s);
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