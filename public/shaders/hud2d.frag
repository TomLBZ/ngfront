#version 300 es
precision highp float;

in vec2 v_p; // Texture coordinate from the vertex shader.
out vec4 outColor;

uniform vec2 u_scale; // Scale of the texture coordinates.
uniform sampler2D u_prev; // Previous pass texture.
uniform vec3 u_attitude; // Attitude of the aircraft in radians (pitch, roll, yaw).
uniform vec4 u_state; // Aircraft state (throttle, elevator, aileron, rudder).
uniform vec2 u_telemetry; // Aircraft telemetry (speed, altitude).

// math
const float EPS     = 1e-3                              ;
const float PI      = 3.1415926535897932384626433832795 ;
// hud scale
const float linew = 0.01;
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
const vec3 hudc = vec3(0.0, 1.0, 0.75);
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
float letterT(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, lttr); // top segment
    float seg2 = seg2d(p, lttc, ltbc); // vertical segment
    return add(seg1, seg2);
}
float letterH(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, ltbl); // left vertical segment
    float seg2 = seg2d(p, lttr, ltbr); // right vertical segment
    float seg3 = seg2d(p, ltlc, ltrc); // horizontal segment
    return add(add(seg1, seg2), seg3);
}
float letterR(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, ltbl); // left vertical segment
    float seg2 = seg2d(p, lttl, lttr); //top segment
    float seg3 = seg2d(p, lttr, o2); // top right slant segment
    float seg4 = seg2d(p, ltlc, o2); // middle left center segment
    float seg5 = seg2d(p, ltbr, o2); // bottom right slant segment
    return add(add(add(seg1, seg2), seg3), add(seg4, seg5));
}
float letterE(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, lttr); // top segment
    float seg2 = seg2d(p, ltbl, ltbr); // bottom segment
    float seg3 = seg2d(p, ltlc, ltrc); // middle segment
    float seg4 = seg2d(p, lttl, ltbl); // left vertical segment
    return add(add(seg1, seg2), add(seg3, seg4));
}
float letterL(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, ltbl); // left vertical segment
    float seg2 = seg2d(p, ltbl, ltbr); // bottom segment
    return add(seg1, seg2);
}
float letterV(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, ltbc); // left diagonal segment
    float seg2 = seg2d(p, lttr, ltbc); // right diagonal segment
    return add(seg1, seg2);
}
float letterA(vec2 p, float s) {
    float seg1 = seg2d(p, ltlc, lttc); // top left slant segment
    float seg2 = seg2d(p, ltrc, lttc); // top right slant segment
    float seg3 = seg2d(p, ltlc, ltbl); // left vertical segment
    float seg4 = seg2d(p, ltrc, ltbr); // right vertical segment
    float seg5 = seg2d(p, ltlc, ltrc); // middle segment
    return add(add(add(seg1, seg2), add(seg3, seg4)), seg5);
}
float letterD(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, lttr); // top segment
    float seg2 = seg2d(p, lttl, ltbl); // left vertical segment
    float seg3 = seg2d(p, lttr, ltrc); // top right vertical segment
    float seg4 = seg2d(p, ltbl, ltrc); // bottom right slant segment
    return add(add(seg1, seg2), add(seg3, seg4));
}
float letterU(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, ltbl); // left vertical segment
    float seg2 = seg2d(p, lttr, ltbr); // right vertical segment
    float seg3 = seg2d(p, ltbl, ltbr); // bottom segment
    return add(add(seg1, seg2), seg3);
}
float letterI(vec2 p, float s) {
    return seg2d(p, lttc, ltbc); // top segment
}
float letterS(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, lttr); // top segment
    float seg2 = seg2d(p, lttl, ltlc); // left vertical segment
    float seg3 = seg2d(p, ltlc, ltrc); // middle segment
    float seg4 = seg2d(p, ltrc, ltbr); // right vertical segment
    float seg5 = seg2d(p, ltbr, ltbl); // bottom segment
    return add(add(add(seg1, seg2), add(seg3, seg4)), seg5);
}
float letterP(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, lttr); // top segment
    float seg2 = seg2d(p, lttl, ltbl); // left vertical segment
    float seg3 = seg2d(p, lttr, ltrc); // right vertical segment
    float seg4 = seg2d(p, ltlc, ltrc); // middle segment
    return add(add(seg1, seg2), add(seg3, seg4));
}
float letterC(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, lttr); // top segment
    float seg2 = seg2d(p, ltbl, ltbr); // bottom segment
    float seg3 = seg2d(p, lttl, ltbl); // left vertical segment
    return add(add(seg1, seg2), seg3);
}
float letterO(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, lttr); // top segment
    float seg2 = seg2d(p, ltbl, ltbr); // bottom segment
    float seg3 = seg2d(p, lttl, ltbl); // left vertical segment
    float seg4 = seg2d(p, lttr, ltbr); // right vertical segment
    return add(add(seg1, seg2), add(seg3, seg4));
}
float letterM(vec2 p, float s) {
    float seg1 = seg2d(p, lttl, ltbl); // left vertical segment
    float seg2 = seg2d(p, lttl, ltbc); // left slant segment
    float seg3 = seg2d(p, lttr, ltbr); // right vertical segment
    float seg4 = seg2d(p, lttr, ltbc); // right slant segment
    return add(add(seg1, seg2), add(seg3, seg4));
}
float scale(vec2 p, float l, float bkscale, float perc) {
    vec2 p1 = vec2(-l * 0.5, 0.0);
    vec2 p2 = vec2(l * 0.5, 0.0);
    float seg0 = seg2d(p, p1, p2);
    float lend = seg2d(p, vec2(p1.x, scfrseg), vec2(p1.x, -scbkseg));
    float rend = seg2d(p, vec2(p2.x, scfrseg), vec2(p2.x, -scbkseg));
    float ends = add(lend, rend);
    vec2 ptrig = place2d(p, mix(p1, p2, perc), 0.0); // position of the trig
    float ftrig = trig2d(ptrig, vec2(trbase, trh));
    float btrig = trig2d(vec2(ptrig.x, -ptrig.y), vec2(trbase, trh * bkscale));
    float trigs = border(add(ftrig, btrig));
    return add(seg0, add(ends, trigs));
}
float throttleScale(vec2 p, float perc) { // THR scale
    float ltx = -ulen - 0.05; // throttle letter X position
    float lty = 0.5 * (ulen + ulth) + 0.02; // throttle letter Y position
    vec2 plt = place2d(p, vec2(ltx, lty), 0.0); // letter T pos
    vec2 plh = place2d(p, vec2(ltx + ultoff, lty), 0.0); // letter H pos
    vec2 plr = place2d(p, vec2(ltx + 2.0 * ultoff, lty), 0.0); // letter R pos
    float T = letterT(plt, 1.0); // letter T
    float H = letterH(plh, 1.0); // letter H
    float R = letterR(plr, 1.0); // letter R
    float ltr = add(T, add(H, R));
    float llsc = scale(place2d(p, pls, PI * 0.5), ulen, EPS, 1.0 - perc);
    return add(llsc, ltr);
}
float elevatorScale(vec2 p, float perc) { // ELV scale
    float ltx = -ulen * 0.5 - 0.025; // elevator letter X position
    float lty = 0.25 * ulen + 0.5 * ulth + 0.02; // elevator letter Y position
    vec2 ple = place2d(p, vec2(ltx, lty), 0.0); // letter E pos
    vec2 pll = place2d(p, vec2(ltx + ultoff, lty), 0.0); // letter L pos
    vec2 plv = place2d(p, vec2(ltx + 2.0 * ultoff, lty), 0.0); // letter V pos
    float E = letterE(ple, 1.0); // letter E
    float L = letterL(pll, 1.0); // letter L
    float V = letterV(plv, 1.0); // letter V
    float ltr = add(E, add(L, V));
    float lsc = scale(place2d(p, pls * 0.5, PI * 0.5), hulen, trbksc, 1.0 - perc);
    return add(lsc, ltr);
}
float altimeterScale(vec2 p, float perc) { // ALT scale
    float ltx = ulen * 0.5 - 0.08; // altimeter letter X position
    float lty = 0.25 * ulen + 0.5 * ulth + 0.02; // elevator letter Y position
    vec2 pla = place2d(p, vec2(ltx, lty), 0.0); // letter A pos
    vec2 pll = place2d(p, vec2(ltx + ultoff, lty), 0.0); // letter L pos
    vec2 plt = place2d(p, vec2(ltx + 2.0 * ultoff, lty), 0.0); // letter T pos
    float A = letterA(pla, 1.0); // letter A
    float L = letterL(pll, 1.0); // letter L
    float T = letterT(plt, 1.0); // letter T
    float ltr = add(A, add(L, T));
    float rsc = scale(place2d(p, prs * 0.5, PI * -0.5), hulen, trbksc, perc);
    return add(rsc, ltr);
}
float rudderScale(vec2 p, float perc) { // RUD scale
    float ltx = -ultw * 1.5; // rudder letter X position
    float lty = -0.5 * ulen - scbkseg - ulth * 0.5; // rudder letter Y position
    vec2 plr = place2d(p, vec2(ltx, lty), 0.0); // letter R pos
    vec2 puu = place2d(p, vec2(ltx + ultoff, lty), 0.0); // letter U pos
    vec2 pld = place2d(p, vec2(ltx + 2.0 * ultoff, lty), 0.0); // letter D pos
    float R = letterR(plr, 1.0); // letter R
    float U = letterU(puu, 1.0); // letter U
    float D = letterD(pld, 1.0); // letter D
    float ltr = add(R, add(U, D));
    float bsc = scale(place2d(p, pbs * 0.5, 0.0), hulen, trbksc, perc);
    return add(bsc, ltr);
}
float aileronScale(vec2 p, float perc) { // AIL scale
    float ltx = -ultw * 1.5; // aileron letter X position
    float lty = 0.5 * ulen + scbkseg + ulth * 0.5; // aileron letter Y position
    vec2 pla = place2d(p, vec2(ltx, lty), 0.0); // letter A pos
    vec2 pli = place2d(p, vec2(ltx + ultoff, lty), 0.0); // letter I pos
    vec2 pll = place2d(p, vec2(ltx + 2.0 * ultoff, lty), 0.0); // letter L pos
    float A = letterA(pla, 1.0); // letter A
    float I = letterI(pli, 1.0); // letter I
    float L = letterL(pll, 1.0); // letter L
    float ltr = add(A, add(I, L));
    float tsc = scale(place2d(p, pts * 0.5, PI), hulen, trbksc, 1.0 - perc);
    return add(tsc, ltr);
}
float speedScale(vec2 p, float perc) { // SPD scale
    float ltx = ulen - 0.08; // throttle letter X position
    float lty = 0.5 * (ulen + ulth) + 0.02; // throttle letter Y position
    vec2 pls = place2d(p, vec2(ltx, lty), 0.0); // letter S pos
    vec2 plp = place2d(p, vec2(ltx + ultoff, lty), 0.0); // letter P pos
    vec2 pdl = place2d(p, vec2(ltx + 2.0 * ultoff, lty), 0.0); // letter D pos
    float S = letterS(pls, 1.0); // letter S
    float P = letterP(plp, 1.0); // letter P
    float D = letterD(pdl, 1.0); // letter D
    float ltr = add(S, add(P, D));
    float lrsc = scale(place2d(p, prs, PI * -0.5), ulen, EPS, perc);
    return add(lrsc, ltr);
}
float compassScale(vec2 p, float perc) { // COM scale
    float ltx = -ultw * 1.5; // aileron letter X position
    float lty = ulen - 0.5 * ulth - scbkseg; // compass letter Y position
    vec2 plc = place2d(p, vec2(ltx, lty), 0.0); // letter C pos
    vec2 plo = place2d(p, vec2(ltx + ultoff, lty), 0.0); // letter O pos
    vec2 plm = place2d(p, vec2(ltx + 2.0 * ultoff, lty), 0.0); // letter M pos
    float C = letterC(plc, 1.0); // letter C
    float O = letterO(plo, 1.0); // letter O
    float M = letterM(plm, 1.0); // letter M
    float ltr = add(C, add(O, M));
    float ltsc = scale(place2d(p, pts, 0.0), ulen, trbksc, perc);
    return add(ltsc, ltr);
}
float hud(vec2 p) {
    float rhom = border(box2d(place2d(p, o2, PI * 0.25), vec2(trbase, trbase)));
    float llsc = throttleScale(p, u_state.x); // throttle scale
    float lsc = elevatorScale(p, u_state.y); // elevator scale (pitch)
    float tsc = aileronScale(p, u_state.z); // aileron scale (roll)
    float bsc = rudderScale(p, u_state.w); // rudder scale (yaw)
    float lrsc = speedScale(p, u_telemetry.x); // speed scale
    float rsc = altimeterScale(p, u_telemetry.y); // altimeter scale
    float ltsc = compassScale(p, u_attitude.z); // compass scale (yaw)
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