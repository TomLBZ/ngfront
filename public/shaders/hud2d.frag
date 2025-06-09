#version 300 es
precision mediump float;

in vec2 v_p; // Texture coordinate from the vertex shader.
out vec4 outColor;

uniform sampler2D u_prev; // Previous pass texture.
uniform float u_halfpixel; // half pixel size in camera space
uniform vec2 u_scale; // Scale of the texture coordinates.
uniform vec2 u_tanhalffov; // Field of view in radians
uniform vec3 u_attitude; // Attitude of the aircraft in radians (pitch, roll, yaw).
uniform vec4 u_state; // Aircraft state (throttle, elevator, aileron, rudder).
uniform vec2 u_telemetry; // Aircraft telemetry (speed, altitude).
uniform vec3 u_wps[16]; // waypoint vectors
uniform float u_nwps; // number of active waypoints (at least one waypoint must be active)

// math
const float EPS     = 1e-3                              ;
const float PI      = 3.1415926535897932384626433832795 ;
// hud scale
const float MAXNUM  = 1000.0                            ; // max number for scale
const float linew = 0.01;
const float hlinew = 0.5 * linew; // half line width
const float ulen = 0.8; // length of scale
const float hulen = 0.5 * ulen; // half length of scale
const float scfrseg = 0.1 * ulen; // front segment length for scale
const float scbkseg = 0.5 * scfrseg; // back segment length for scale
const float trh = scbkseg; // trig height
const float trbksc = 0.5; // trig back scale factor
const float trbase = 0.2 * scfrseg; // trig base length
const vec2 pls = vec2(-ulen, 0.0); // left scale pos
const vec2 prs = vec2(ulen, 0.0); // right scale pos
const vec2 pts = vec2(0.0, ulen); // top scale pos
const vec2 pbs = vec2(0.0, -ulen); // bottom scale pos
const vec2 o2 = vec2(0.0, 0.0);
const vec4 hudc = vec4(1.0, 1.0, 0.5, 1.0);
const vec4 wpc = vec4(0.5, 1.0, 0.4, 1.0); // text color
const vec4 o4 = vec4(0.0, 0.0, 0.0, 0.0); // zero vector in vec4
// letters
const float ltsize = 1.0; // letter size
const float ultw = 0.05 * ulen; // width of letter
const float ulth = 0.08 * ulen; // height of letter
const float ultoff = ultw + 0.02 * ulen; // letter offset from each other
const vec2 ltbase = vec2(ultw, ulth); // letter size base
const vec2 lthfb = 0.5 * ltsize * ltbase; // letter half length base
const vec2 lttl = vec2(-lthfb.x, lthfb.y); // letter top left corner
const vec2 lttr = vec2(lthfb.x, lthfb.y); // letter top right corner
const vec2 ltbr = vec2(lthfb.x, -lthfb.y); // letter bottom right corner
const vec2 ltbl = vec2(-lthfb.x, -lthfb.y); // letter bottom left corner
const vec2 ltlc = vec2(-lthfb.x, 0.0); // letter left center
const vec2 ltrc = vec2(lthfb.x, 0.0); // letter right center
const vec2 ltbc = vec2(0.0, -lthfb.y); // letter bottom center
const vec2 lttc = vec2(0.0, lthfb.y); // letter top center
// scale letter positions
const float scale_thr_ltx = -ulen - 0.05; // throttle letter X position
const float scale_thr_lty = 0.5 * (ulen + ulth) + 0.02; // throttle letter Y position
const vec2 scale_thr_ltrpos0 = vec2(scale_thr_ltx, scale_thr_lty); // letter T pos
const vec2 scale_thr_ltrpos1 = vec2(scale_thr_ltx + ultoff, scale_thr_lty); // letter H pos
const vec2 scale_thr_ltrpos2 = vec2(scale_thr_ltx + 2.0 * ultoff, scale_thr_lty); // letter R pos
const float scale_elv_ltx = -ulen * 0.5 - 0.025; // elevator letter X position
const float scale_elv_lty = 0.25 * ulen + 0.5 * ulth + 0.02; // elevator letter Y position
const vec2 scale_elv_ltrpos0 = vec2(scale_elv_ltx, scale_elv_lty); // letter E pos
const vec2 scale_elv_ltrpos1 = vec2(scale_elv_ltx + ultoff, scale_elv_lty); // letter L pos
const vec2 scale_elv_ltrpos2 = vec2(scale_elv_ltx + 2.0 * ultoff, scale_elv_lty); // letter V pos
const float scale_alt_ltx = ulen * 0.5 - 0.08; // altimeter letter X position
const float scale_alt_lty = 0.25 * ulen + 0.5 * ulth + 0.02; // elevator letter Y position
const vec2 scale_alt_ltrpos0 = vec2(scale_alt_ltx, scale_alt_lty); // letter A pos
const vec2 scale_alt_ltrpos1 = vec2(scale_alt_ltx + ultoff, scale_alt_lty); // letter L pos
const vec2 scale_alt_ltrpos2 = vec2(scale_alt_ltx + 2.0 * ultoff, scale_alt_lty); // letter T pos
const float scale_rud_ltx = -ultw * 1.5; // rudder letter X position
const float scale_rud_lty = -0.5 * ulen - scbkseg - ulth * 0.5; // rudder letter Y position
const vec2 scale_rud_ltrpos0 = vec2(scale_rud_ltx, scale_rud_lty); // letter R pos
const vec2 scale_rud_ltrpos1 = vec2(scale_rud_ltx + ultoff, scale_rud_lty); // letter U pos
const vec2 scale_rud_ltrpos2 = vec2(scale_rud_ltx + 2.0 * ultoff, scale_rud_lty); // letter D pos
const float scale_ail_ltx = -ultw * 1.5; // aileron letter X position
const float scale_ail_lty = 0.5 * ulen + scbkseg + ulth * 0.5; // aileron letter Y position
const vec2 scale_ail_ltrpos0 = vec2(scale_ail_ltx, scale_ail_lty); // letter A pos
const vec2 scale_ail_ltrpos1 = vec2(scale_ail_ltx + ultoff, scale_ail_lty); // letter I pos
const vec2 scale_ail_ltrpos2 = vec2(scale_ail_ltx + 2.0 * ultoff, scale_ail_lty); // letter L pos
const float scale_spd_ltx = ulen - 0.08; // speed letter X position
const float scale_spd_lty = 0.5 * (ulen + ulth) + 0.02; // speed letter Y position
const vec2 scale_spd_ltrpos0 = vec2(scale_spd_ltx, scale_spd_lty); // letter S pos
const vec2 scale_spd_ltrpos1 = vec2(scale_spd_ltx + ultoff, scale_spd_lty); // letter P pos
const vec2 scale_spd_ltrpos2 = vec2(scale_spd_ltx + 2.0 * ultoff, scale_spd_lty); // letter D pos
const float scale_com_ltx = -ultw * 1.5; // compass letter X position
const float scale_com_lty = ulen - 0.5 * ulth - scbkseg; // compass letter Y position
const vec2 scale_com_ltrpos0 = vec2(scale_com_ltx, scale_com_lty); // letter C pos
const vec2 scale_com_ltrpos1 = vec2(scale_com_ltx + ultoff, scale_com_lty); // letter O pos
const vec2 scale_com_ltrpos2 = vec2(scale_com_ltx + 2.0 * ultoff, scale_com_lty); // letter M pos
struct Segment {
    vec2 a;       // endpoint A
    vec2 ba;      // B – A
    float invBA2; // 1.0 / dot(ba, ba)
};
// number and letters
const Segment tl_tr = Segment(
    lttl, // A
    lttr - lttl, // B - A
    1.0 / dot(lttr - lttl, lttr - lttl) // 1.0 / dot(ba, ba)
);
const Segment tc_bc = Segment(
    lttc, // A
    ltbc - lttc, // B - A
    1.0 / dot(ltbc - lttc, ltbc - lttc) // 1.0 / dot(ba, ba)
);
const Segment tl_bl = Segment(
    lttl, // A
    ltbl - lttl, // B - A
    1.0 / dot(ltbl - lttl, ltbl - lttl) // 1.0 / dot(ba, ba)
);
const Segment lc_rc = Segment(
    ltlc, // A
    ltrc - ltlc, // B - A
    1.0 / dot(ltrc - ltlc, ltrc - ltlc) // 1.0 / dot(ba, ba)
);
const Segment tr_br = Segment(
    lttr, // A
    ltbr - lttr, // B - A
    1.0 / dot(ltbr - lttr, ltbr - lttr) // 1.0 / dot(ba, ba)
);
const Segment tr_o2 = Segment(
    lttr, // A
    o2 - lttr, // B - A
    1.0 / dot(o2 - lttr, o2 - lttr) // 1.0 / dot(ba, ba)
);
const Segment lc_o2 = Segment(
    ltlc, // A
    o2 - ltlc, // B - A
    1.0 / dot(o2 - ltlc, o2 - ltlc) // 1.0 / dot(ba, ba)
);
const Segment br_o2 = Segment(
    ltbr, // A
    o2 - ltbr, // B - A
    1.0 / dot(o2 - ltbr, o2 - ltbr) // 1.0 / dot(ba, ba)
);
const Segment bl_br = Segment(
    ltbl, // A
    ltbr - ltbl, // B - A
    1.0 / dot(ltbr - ltbl, ltbr - ltbl) // 1.0 / dot(ba, ba)
);
const Segment tl_bc = Segment(
    lttl, // A
    ltbc - lttl, // B - A
    1.0 / dot(ltbc - lttl, ltbc - lttl) // 1.0 / dot(ba, ba)
);
const Segment tr_bc = Segment(
    lttr, // A
    ltbc - lttr, // B - A
    1.0 / dot(ltbc - lttr, ltbc - lttr) // 1.0 / dot(ba, ba)
);
const Segment lc_tc = Segment(
    ltlc, // A
    lttc - ltlc, // B - A
    1.0 / dot(lttc - ltlc, lttc - ltlc) // 1.0 / dot(ba, ba)
);
const Segment rc_tc = Segment(
    ltrc, // A
    lttc - ltrc, // B - A
    1.0 / dot(lttc - ltrc, lttc - ltrc) // 1.0 / dot(ba, ba)
);
const Segment lc_bl = Segment(
    ltlc, // A
    ltbl - ltlc, // B - A
    1.0 / dot(ltbl - ltlc, ltbl - ltlc) // 1.0 / dot(ba, ba)
);
const Segment rc_br = Segment(
    ltrc, // A
    ltbr - ltrc, // B - A
    1.0 / dot(ltbr - ltrc, ltbr - ltrc) // 1.0 / dot(ba, ba)
);
const Segment tr_rc = Segment(
    lttr, // A
    ltrc - lttr, // B - A
    1.0 / dot(ltrc - lttr, ltrc - lttr) // 1.0 / dot(ba, ba)
);
const Segment bl_rc = Segment(
    ltbl, // A
    ltrc - ltbl, // B - A
    1.0 / dot(ltrc - ltbl, ltrc - ltbl) // 1.0 / dot(ba, ba)
);
const Segment tl_lc = Segment(
    lttl, // A
    ltlc - lttl, // B - A
    1.0 / dot(ltlc - lttl, ltlc - lttl) // 1.0 / dot(ba, ba)
);
const Segment bl_bc = Segment(
    ltbl, // A
    ltbc - ltbl, // B - A
    1.0 / dot(ltbc - ltbl, ltbc - ltbl) // 1.0 / dot(ba, ba)
);
const Segment rc_bc = Segment(
    ltrc, // A
    ltbc - ltrc, // B - A
    1.0 / dot(ltbc - ltrc, ltbc - ltrc) // 1.0 / dot(ba, ba)
);
const Segment tc_tr = Segment(
    lttc, // A
    lttr - lttc, // B - A
    1.0 / dot(lttr - lttc, lttr - lttc) // 1.0 / dot(ba, ba)
);
const Segment o2_rc = Segment(
    o2, // A
    ltrc - o2, // B - A
    1.0 / dot(ltrc - o2, ltrc - o2) // 1.0 / dot(ba, ba)
);
struct ScaleEntry {
    vec2 pos;
    float perc;
    int type; // 0 - throttle, 1 - elevator, 2 - aileron, 3 - rudder, 4 - speed, 5 - altimeter, 6 - compass
};
float seg2d(vec2 p, Segment s) {
    vec2 pa = p - s.a; // vector from A to P
    float h = clamp(dot(pa, s.ba) * s.invBA2, 0.0, 1.0); // projection of P on segment
    vec2 diff = pa - s.ba * h; // vector from P to segment
    return length(diff); // distance from P to segment
}
vec2 wps2d(int i) {
    vec3 dir = normalize(u_wps[i]); // waypoint on screen
    return dir.x > 0.0 ? vec2(-dir.y, dir.z) / u_tanhalffov / dir.x : vec2(0.0);
}
// float seg2d(vec2 p, vec2 a, vec2 b ) { // by iq
//     vec2 pa = p-a, ba = b-a;
//     float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
//     return length( pa - ba*h );
// }
float box2d_base(vec2 p) { // by iq
    vec2 d = abs(p) - vec2(trbase);
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
vec2 place2d_0(vec2 p, vec2 o) { // 1) rotation = 0
    return p - o; // cos=1, sin=0 → rp = (p.x, p.y), ro = (o.x, o.y)
}
vec2 place2d_p90(vec2 p, vec2 o) { // 2) rotation = +π/2
    return vec2(-p.y + o.y, p.x - o.x); // cos=0, sin=1 → rp = (-p.y, p.x), ro = (-o.y, o.x)
}
vec2 place2d_180(vec2 p, vec2 o) { // 3) rotation = π
    return vec2(-p.x + o.x, -p.y + o.y); // cos=-1, sin=0 → rp = (-p.x, -p.y), ro = (-o.x, -o.y)
}
vec2 place2d_m90(vec2 p, vec2 o) { // 4) rotation = -π/2
    return vec2(p.y - o.y, -p.x + o.x); // cos=0, sin=-1 → rp = (p.y, -p.x), ro = (o.y, -o.x)
}
vec2 place2d_p45(vec2 p, vec2 o) { // 5) rotation = +π/4
    float sa = 0.70710678118; // sin(π/4)
    float ca = 0.70710678118; // cos(π/4)
    vec2 rp = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca); // rotate p
    vec2 ro = vec2(o.x * ca - o.y * sa, o.x * sa + o.y * ca); // rotate o
    return rp - ro; // return rotated p - rotated o
}
float letterT(vec2 p) {
    float seg1 = seg2d(p, tl_tr); // top segment
    float seg2 = seg2d(p, tc_bc); // vertical segment
    return min(seg1, seg2);
}
float letterH(vec2 p) {
    float seg1 = seg2d(p, tl_bl); // left vertical segment
    float seg2 = seg2d(p, tr_br); // right vertical segment
    float seg3 = seg2d(p, lc_rc); // horizontal segment
    return min(min(seg1, seg2), seg3);
}
float letterR(vec2 p) {
    float seg1 = seg2d(p, tl_bl); // left vertical segment
    float seg2 = seg2d(p, tl_tr); //top segment
    float seg3 = seg2d(p, tr_o2); // top right slant segment
    float seg4 = seg2d(p, lc_o2); // middle left center segment
    float seg5 = seg2d(p, br_o2); // bottom right slant segment
    return min(min(min(seg1, seg2), seg3), min(seg4, seg5));
}
float letterE(vec2 p) {
    float seg1 = seg2d(p, tl_tr); // top segment
    float seg2 = seg2d(p, bl_br); // bottom segment
    float seg3 = seg2d(p, lc_rc); // middle segment
    float seg4 = seg2d(p, tl_bl); // left vertical segment
    return min(min(seg1, seg2), min(seg3, seg4));
}
float letterL(vec2 p) {
    float seg1 = seg2d(p, tl_bl); // left vertical segment
    float seg2 = seg2d(p, bl_br); // bottom segment
    return min(seg1, seg2);
}
float letterV(vec2 p) {
    float seg1 = seg2d(p, tl_bc); // left diagonal segment
    float seg2 = seg2d(p, tr_bc); // right diagonal segment
    return min(seg1, seg2);
}
float letterA(vec2 p) {
    float seg1 = seg2d(p, lc_tc); // top left slant segment
    float seg2 = seg2d(p, rc_tc); // top right slant segment
    float seg3 = seg2d(p, lc_bl); // left vertical segment
    float seg4 = seg2d(p, rc_br); // right vertical segment
    float seg5 = seg2d(p, lc_rc); // middle segment
    return min(min(min(seg1, seg2), min(seg3, seg4)), seg5);
}
float letterD(vec2 p) {
    float seg1 = seg2d(p, tl_tr); // top segment
    float seg2 = seg2d(p, tl_bl); // left vertical segment
    float seg3 = seg2d(p, tr_rc); // top right vertical segment
    float seg4 = seg2d(p, bl_rc); // bottom right slant segment
    return min(min(seg1, seg2), min(seg3, seg4));
}
float letterU(vec2 p) {
    float seg1 = seg2d(p, tl_bl); // left vertical segment
    float seg2 = seg2d(p, tr_br); // right vertical segment
    float seg3 = seg2d(p, bl_br); // bottom segment
    return min(min(seg1, seg2), seg3);
}
float letterI(vec2 p) {
    return seg2d(p, tc_bc);
}
float letterS(vec2 p) {
    float seg1 = seg2d(p, tl_tr); // top segment
    float seg2 = seg2d(p, tl_lc); // left vertical segment
    float seg3 = seg2d(p, lc_rc); // middle segment
    float seg4 = seg2d(p, rc_br); // right vertical segment
    float seg5 = seg2d(p, bl_br); // bottom segment
    return min(min(min(seg1, seg2), min(seg3, seg4)), seg5);
}
float letterP(vec2 p) {
    float seg1 = seg2d(p, tl_tr); // top segment
    float seg2 = seg2d(p, tl_bl); // left vertical segment
    float seg3 = seg2d(p, tr_rc); // right vertical segment
    float seg4 = seg2d(p, lc_rc); // middle segment
    return min(min(seg1, seg2), min(seg3, seg4));
}
float letterC(vec2 p) {
    float seg1 = seg2d(p, tl_tr); // top segment
    float seg2 = seg2d(p, bl_br); // bottom segment
    float seg3 = seg2d(p, tl_bl); // left vertical segment
    return min(min(seg1, seg2), seg3);
}
float letterO(vec2 p) {
    float seg1 = seg2d(p, tl_tr); // top segment
    float seg2 = seg2d(p, bl_br); // bottom segment
    float seg3 = seg2d(p, tl_bl); // left vertical segment
    float seg4 = seg2d(p, tr_br); // right vertical segment
    return min(min(seg1, seg2), min(seg3, seg4));
}
float letterM(vec2 p) {
    float seg1 = seg2d(p, tl_bl); // left vertical segment
    float seg2 = seg2d(p, tl_bc); // left slant segment
    float seg3 = seg2d(p, tr_br); // right vertical segment
    float seg4 = seg2d(p, tr_bc); // right slant segment
    return min(min(seg1, seg2), min(seg3, seg4));
}
float num0(vec2 p) {
    float seg0 = seg2d(p, lc_tc); // top center to left center
    float seg1 = seg2d(p, lc_bl); // left center to bottom left
    float seg2 = seg2d(p, bl_bc); // bottom left to bottom center
    float seg3 = seg2d(p, rc_bc); // bottom center to right center
    float seg4 = seg2d(p, tr_rc); // right center to top right
    float seg5 = seg2d(p, tc_tr); // top right to top center
    return min(min(min(seg0, seg1), min(seg2, seg3)), min(seg4, seg5));
}
float num1(vec2 p) {
    return seg2d(p, tr_bc); // top right to bottom center
}
float num2(vec2 p) {
    float seg1 = seg2d(p, tl_lc); // top left to left center
    float seg2 = seg2d(p, tl_tr); // top left to top right
    float seg3 = seg2d(p, tr_rc); // top right to right center
    float seg4 = seg2d(p, bl_rc); // right center to bottom left
    float seg5 = seg2d(p, bl_br); // bottom left to bottom right
    return min(min(min(seg1, seg2), min(seg3, seg4)), seg5);
}
float num3(vec2 p) {
    float seg1 = seg2d(p, tl_tr); // top left to top right
    float seg2 = seg2d(p, tr_br); // top right to bottom right
    float seg3 = seg2d(p, bl_br); // bottom left to bottom right
    float seg4 = seg2d(p, o2_rc); // center to right center
    return min(min(seg1, seg2), min(seg3, seg4));
}
float num4(vec2 p) {
    float seg1 = seg2d(p, lc_tc); // top center to left center
    float seg2 = seg2d(p, lc_rc); // left center to right center
    float seg3 = seg2d(p, tr_bc); // top right to bottom center
    return min(min(seg1, seg2), seg3);
}
float num5(vec2 p) {
    float seg1 = seg2d(p, lc_tc); // top center to left center
    float seg2 = seg2d(p, lc_rc); // left center to right center
    float seg3 = seg2d(p, tc_tr); // top center to top right
    float seg4 = seg2d(p, rc_br); // right center to bottom right
    float seg5 = seg2d(p, bl_br); // bottom right to bottom left
    return min(min(min(seg1, seg2), seg3), min(seg4, seg5));
}
float num6(vec2 p) {
    float seg1 = seg2d(p, tc_tr); // top center to top right
    float seg2 = seg2d(p, lc_tc); // top center to left center
    float seg3 = seg2d(p, lc_bl); // left center to bottom left
    float seg4 = seg2d(p, bl_br); // bottom left to bottom right
    float seg5 = seg2d(p, rc_br); // bottom right to right center
    float seg6 = seg2d(p, lc_rc); // right center to left center
    return min(min(min(seg1, seg2), min(seg3, seg4)), min(seg5, seg6));
}
float num7(vec2 p) {
    float seg1 = seg2d(p, tl_tr); // top left to top right
    float seg2 = seg2d(p, tr_bc); // top right to bottom center
    return min(seg1, seg2);
}
float num8(vec2 p) {
    float seg1 = seg2d(p, lc_tc); // top center to left center
    float seg2 = seg2d(p, lc_bl); // left center to bottom left
    float seg3 = seg2d(p, bl_bc); // bottom left to bottom center
    float seg4 = seg2d(p, rc_bc); // bottom center to right center
    float seg5 = seg2d(p, tr_rc); // right center to top right
    float seg6 = seg2d(p, tc_tr); // top right to top center
    float seg7 = seg2d(p, lc_rc); // left center to right center
    return min(min(min(seg1, seg2), min(seg3, seg4)), min(seg5, min(seg6, seg7)));
}
float num9(vec2 p) {
    float seg1 = seg2d(p, tl_tr); // top left to top right
    float seg2 = seg2d(p, tr_rc); // top right to right center
    float seg3 = seg2d(p, rc_bc); // right center to bottom center
    float seg4 = seg2d(p, bl_bc); // bottom center to bottom left
    float seg5 = seg2d(p, tl_lc); // top left to left center
    float seg6 = seg2d(p, lc_rc); // left center to right center
    return min(min(min(seg1, seg2), min(seg3, seg4)), min(seg5, seg6));
}
float num1digit(vec2 p, int n) {
    switch (n) {
        case 0: return num0(p);
        case 1: return num1(p);
        case 2: return num2(p);
        case 3: return num3(p);
        case 4: return num4(p);
        case 5: return num5(p);
        case 6: return num6(p);
        case 7: return num7(p);
        case 8: return num8(p);
        case 9: return num9(p);
        default: return MAXNUM;
    }
}
float num(vec2 p, int n) {
    if (n < 10) return num1digit(p, n); // single digit
    if (n > 15) return MAXNUM;
    vec2 np1 = vec2(p.x + ultw, p.y); // position of the first digit
    vec2 np2 = vec2(p.x - ultw, p.y); // position of the second digit
    float d1 = num1(np1); // first digit is always one
    float d2 = num1digit(np2, n - 10); // second digit is the last digit of the number
    return min(d1, d2); // return the sum of the two digits
}
float scale(vec2 p, float l, float bkscale, float perc) {
    vec2 p1 = vec2(-l * 0.5, 0.0);
    vec2 p2 = vec2(l * 0.5, 0.0);
    Segment p1_p2 = Segment(p1, p2 - p1, 1.0 / dot(p2 - p1, p2 - p1));
    float seg0 = seg2d(p, p1_p2);
    vec2 p1a = vec2(p1.x, scfrseg); // left segment end
    vec2 p1b = vec2(p1.x, -scbkseg); // left segment end
    Segment segl = Segment(p1a, p1b - p1a, 1.0 / dot(p1b - p1a, p1b - p1a));
    float lend = seg2d(p, segl);
    vec2 p2a = vec2(p2.x, scfrseg); // right segment end
    vec2 p2b = vec2(p2.x, -scbkseg); // right segment end
    Segment segr = Segment(p2a, p2b - p2a, 1.0 / dot(p2b - p2a, p2b - p2a));
    float rend = seg2d(p, segr);
    float ends = min(lend, rend);
    vec2 ptrig = place2d_0(p, mix(p1, p2, perc)); // position of the trig
    float ftrig = trig2d(ptrig, vec2(trbase, trh));
    float btrig = trig2d(vec2(ptrig.x, -ptrig.y), vec2(trbase, trh * bkscale));
    float trigs = abs(min(ftrig, btrig));
    return min(seg0, min(ends, trigs));
}
float throttleScale(vec2 p, float perc) { // THR scale
    vec2 plt = place2d_0(p, scale_thr_ltrpos0); // letter T pos
    vec2 plh = place2d_0(p, scale_thr_ltrpos1); // letter H pos
    vec2 plr = place2d_0(p, scale_thr_ltrpos2); // letter R pos
    float T = letterT(plt); // letter T
    float H = letterH(plh); // letter H
    float R = letterR(plr); // letter R
    float ltr = min(T, min(H, R));
    float llsc = scale(place2d_p90(p, pls), ulen, EPS, 1.0 - perc);
    return min(llsc, ltr);
}
float elevatorScale(vec2 p, float perc) { // ELV scale
    vec2 ple = place2d_0(p, scale_elv_ltrpos0); // letter E pos
    vec2 pll = place2d_0(p, scale_elv_ltrpos1); // letter L pos
    vec2 plv = place2d_0(p, scale_elv_ltrpos2); // letter V pos
    float E = letterE(ple); // letter E
    float L = letterL(pll); // letter L
    float V = letterV(plv); // letter V
    float ltr = min(E, min(L, V));
    float lsc = scale(place2d_p90(p, pls * 0.5), hulen, trbksc, 1.0 - perc);
    return min(lsc, ltr);
}
float altimeterScale(vec2 p, float perc) { // ALT scale
    vec2 pla = place2d_0(p, scale_alt_ltrpos0); // letter A pos
    vec2 pll = place2d_0(p, scale_alt_ltrpos1); // letter L pos
    vec2 plt = place2d_0(p, scale_alt_ltrpos2); // letter T pos
    float A = letterA(pla); // letter A
    float L = letterL(pll); // letter L
    float T = letterT(plt); // letter T
    float ltr = min(A, min(L, T));
    float rsc = scale(place2d_m90(p, prs * 0.5), hulen, trbksc, perc);
    return min(rsc, ltr);
}
float rudderScale(vec2 p, float perc) { // RUD scale
    vec2 plr = place2d_0(p, scale_rud_ltrpos0); // letter R pos
    vec2 puu = place2d_0(p, scale_rud_ltrpos1); // letter U pos
    vec2 pld = place2d_0(p, scale_rud_ltrpos2); // letter D pos
    float R = letterR(plr); // letter R
    float U = letterU(puu); // letter U
    float D = letterD(pld); // letter D
    float ltr = min(R, min(U, D));
    float bsc = scale(place2d_0(p, pbs * 0.5), hulen, trbksc, perc);
    return min(bsc, ltr);
}
float aileronScale(vec2 p, float perc) { // AIL scale
    vec2 pla = place2d_0(p, scale_ail_ltrpos0); // letter A pos
    vec2 pli = place2d_0(p, scale_ail_ltrpos1); // letter I pos
    vec2 pll = place2d_0(p, scale_ail_ltrpos2); // letter L pos
    float A = letterA(pla); // letter A
    float I = letterI(pli); // letter I
    float L = letterL(pll); // letter L
    float ltr = min(A, min(I, L));
    float tsc = scale(place2d_180(p, pts * 0.5), hulen, trbksc, 1.0 - perc);
    return min(tsc, ltr);
}
float speedScale(vec2 p, float perc) { // SPD scale
    vec2 pls = place2d_0(p, scale_spd_ltrpos0); // letter S pos
    vec2 plp = place2d_0(p, scale_spd_ltrpos1); // letter P pos
    vec2 pdl = place2d_0(p, scale_spd_ltrpos2); // letter D pos
    float S = letterS(pls); // letter S
    float P = letterP(plp); // letter P
    float D = letterD(pdl); // letter D
    float ltr = min(S, min(P, D));
    float lrsc = scale(place2d_m90(p, prs), ulen, EPS, perc);
    return min(lrsc, ltr);
}
float compassScale(vec2 p, float perc) { // COM scale
    vec2 plc = place2d_0(p, scale_com_ltrpos0); // letter C pos
    vec2 plo = place2d_0(p, scale_com_ltrpos1); // letter O pos
    vec2 plm = place2d_0(p, scale_com_ltrpos2); // letter M pos
    float C = letterC(plc); // letter C
    float O = letterO(plo); // letter O
    float M = letterM(plm); // letter M
    float ltr = min(C, min(O, M));
    float ltsc = scale(place2d_0(p, pts), ulen, trbksc, perc);
    return min(ltsc, ltr);
}
float wpText(vec2 p) {
    float d = MAXNUM;
    int inwps = int(u_nwps); // number of waypoints
    for (int i = 0; i < inwps; i++) {
        vec2 wp = wps2d(i); // waypoint position on screen
        if (length(wp) > EPS) {
            d = min(d, num(place2d_0(p, wp), i)); // number for waypoint
        }
    }
    return d;
}
float hud(vec2 p) {
    float rhom = abs(box2d_base(place2d_p45(p, o2)));
    float llsc = throttleScale(p, u_state.x); // throttle scale
    float lsc = elevatorScale(p, u_state.y); // elevator scale (pitch)
    float tsc = aileronScale(p, u_state.z); // aileron scale (roll)
    float bsc = rudderScale(p, u_state.w); // rudder scale (yaw)
    float lrsc = speedScale(p, u_telemetry.x); // speed scale
    float rsc = altimeterScale(p, u_telemetry.y); // altimeter scale
    float ltsc = compassScale(p, u_attitude.z); // compass scale (yaw)
    float inner = min(min(lsc, rsc), min(tsc, bsc));
    float outer = min(min(llsc, lrsc), ltsc);
    return min(rhom, min(inner, outer));
}
vec4 prev() {
    return texture(u_prev, v_p / u_scale * 0.5 + 0.5);
}

// dummy main that colors square in the center of the screen with a gradient
void main() {
    float hudd = hud(v_p);
    float hudmask = 1.0 - smoothstep(0.0, hlinew, hudd); // smooth step for hud mask
    float wpd = wpText(v_p);
    float wpmask = 1.0 - smoothstep(0.0, linew, wpd); // smooth step for waypoint text mask
    wpmask = wpmask * (1.0 - hudmask); // text mask only if hud mask is not present
    float uimask = max(hudmask, wpmask); // combined mask for hud and waypoint text
    vec4 wpColor = mix(o4, wpc, wpmask); // waypoint text color
    vec4 hudColor = mix(o4, hudc, hudmask); // hud text color
    vec4 bg = prev() * (1.0 - uimask); // background color from previous pass
    outColor = bg + hudColor + wpColor; // mix background with hud and waypoint text colors
}