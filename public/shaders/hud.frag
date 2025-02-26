#version 300 es
precision highp float;

uniform float u_pitch;
uniform float u_roll;
uniform float u_time;
uniform vec2 u_resolution;

in vec2 v_texcoord; // Texture coordinate from the vertex shader.
out vec4 outColor; // Output color.

vec4 colorBasedOnCoord(vec2 coord) {
    vec2 v = abs(mod(coord, 1.0) - 0.5);
    if (v.x > 0.45 && v.y > 0.45) { // draw white square in the center
        return vec4(1.0, 1.0, 1.0, 1.0);
    }
    return vec4(coord, 0.0, 1.0);
}
// by iq
float sdSegment( in vec2 p, in vec2 a, in vec2 b )
{
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
}
float ndot(vec2 a, vec2 b ) { return a.x*b.x - a.y*b.y; }
float sdRhombus( in vec2 p, in vec2 b ) // b is {halfwidth, halfheight}
{
    p = abs(p);
    float h = clamp( ndot(b-2.0*p,b)/dot(b,b), -1.0, 1.0 );
    float d = length( p-0.5*b*vec2(1.0-h,1.0+h) );
    return d * sign( p.x*b.y + p.y*b.x - b.x*b.y );
}
float sdTriangleIsosceles( in vec2 p, in vec2 q ) // q is {halfwidth, halfheight}
{
    p.x = abs(p.x);
    vec2 a = p - q*clamp( dot(p,q)/dot(q,q), 0.0, 1.0 );
    vec2 b = p - q*vec2( clamp( p.x/q.x, 0.0, 1.0 ), 1.0 );
    float s = -sign( q.y );
    vec2 d = min( vec2( dot(a,a), s*(p.x*q.y-p.y*q.x) ),
                  vec2( dot(b,b), s*(p.y-q.y)  ));
    return -sqrt(d.x)*sign(d.y);
}
// adapted for hud
float seg(in vec2 p, in vec2 a, in vec2 b) {
    return sdSegment(p, a, b);
}
float rhom(in vec2 p, in vec2 b, in vec2 o) { // o is the center of the rhombus
    return sdRhombus(p - o, b);
}
float trigBase(in vec2 p, in vec2 q) {
    return sdTriangleIsosceles(vec2(p.x, q.y - p.y), q);
}
float upTrig(in vec2 p, in vec2 q, in vec2 o) { // o is the base of the triangle
    return trigBase(p - o, q);
}
float downTrig(in vec2 p, in vec2 q, in vec2 o) { // o is the base of the triangle
    return trigBase(vec2(p.x - o.x, o.y - p.y), q);
}
float leftTrig(in vec2 p, in vec2 q, in vec2 o) { // o is the base of the triangle
    return trigBase(vec2(p.y - o.y, o.x - p.x), q);
}
float rightTrig(in vec2 p, in vec2 q, in vec2 o) { // o is the base of the triangle
    return trigBase(vec2(p.y - o.y, p.x - o.x), q);
}
float rotatedTrig(in vec2 p, in vec2 q, in vec2 o, in float angle) { // o is the base of the triangle
    vec2 p1 = vec2(p.x * cos(angle) - p.y * sin(angle), p.x * sin(angle) + p.y * cos(angle));
    vec2 o1 = vec2(o.x * cos(angle) - o.y * sin(angle), o.x * sin(angle) + o.y * cos(angle));
    return trigBase(p1 - o1, q);
}
float opUnion(in float d1, in float d2) {
    return min(d1, d2);
}
float opOutline(in float p)
{
    return abs(p);
}
float axis(in vec2 p, in vec2 a) {
    float x = sdSegment(p, vec2(-a.x, 0.0), vec2(a.x, 0.0));
    float y = sdSegment(p, vec2(0.0, -a.y), vec2(0.0, a.y));
    return opUnion(x, y);
}
// TODO: rotated scale, with length, widthfront, widthback and angle
float scale(in vec2 p, in vec2 a, in vec2 b, in vec2 c) { // scale component consists of segments
    float seg = sdSegment(p, a, b);
    vec2 dir = normalize(b - a);
    vec2 n = vec2(-dir.y, dir.x);
    vec2 p1 = a + n * c.x;
    vec2 p2 = b + n * c.x;
    vec2 p3 = a - n * c.y;
    vec2 p4 = b - n * c.y;
    float seg1 = sdSegment(p, p1, p3);
    float seg2 = sdSegment(p, p2, p4);
    return opUnion(seg, opUnion(seg1, seg2));
}
float ptScale(in vec2 p, in vec2 a, in vec2 b, in vec2 c, in float ptw) { // scale component consists of segments and a triangle pointer
    float scale = scale(p, a, b, c);
    vec2 dir = normalize(b - a);
    vec2 n = vec2(-dir.y, dir.x);
    vec2 mid = (a + b) / 2.0;
    float ang = -atan(dir.y, dir.x);
    float oppositeAng = ang + 3.14159;
    float frontTrig = rotatedTrig(p, vec2(ptw, c.x), mid, ang);
    float backTrig = rotatedTrig(p, vec2(ptw, c.y), mid, oppositeAng);
    float trig = opUnion(backTrig, frontTrig);
    return opUnion(scale, opOutline(trig));
}
float centralFixedSDF(in vec2 p) {
    float rhom = rhom(p, vec2(0.1, 0.1), vec2(0.0, 0.0));
    float upsc = ptScale(p, vec2(-0.25, 0.5), vec2(0.25, 0.5), vec2(0.05, 0.1), 0.02);
    float downsc = ptScale(p, vec2(-0.25, -0.5), vec2(0.25, -0.5), vec2(0.05, 0.1), 0.02);
    float leftsc = ptScale(p, vec2(-0.5, -0.25), vec2(-0.5, 0.25), vec2(0.05, 0.1), 0.02);
    float rightsc = ptScale(p, vec2(0.5, -0.25), vec2(0.5, 0.25), vec2(0.05, 0.1), 0.02);
    float vsc = opUnion(upsc, downsc);
    float hsc = opUnion(leftsc, rightsc);
    return opUnion(opOutline(rhom), opUnion(vsc, hsc));
}
float sdf(in vec2 coords) {
    vec2 p = coords;
    float ax = axis(p, vec2(1.0));
    float cent = centralFixedSDF(p);
    float components = opUnion(ax, cent);
    return components;
}
vec3 sdf2color(in float d, in vec3 linecolor, in vec3 bgcolor)
{
    return mix(linecolor, bgcolor, smoothstep(0.0, 0.005, d));
}

void main() {
    vec3 bgcolor = vec3(0.0, 0.0, 0.0);
    vec3 linecolor = vec3(1.0, 1.0, 1.0);
    outColor = vec4(sdf2color(sdf(v_texcoord), linecolor, bgcolor), 1.0);
    return;    
}