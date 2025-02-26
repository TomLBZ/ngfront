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
float sdSegment( in vec2 p, in vec2 a, in vec2 b )
{
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
}
float ndot(vec2 a, vec2 b ) { return a.x*b.x - a.y*b.y; }
float sdRhombus( in vec2 p, in vec2 b ) 
{
    p = abs(p);
    float h = clamp( ndot(b-2.0*p,b)/dot(b,b), -1.0, 1.0 );
    float d = length( p-0.5*b*vec2(1.0-h,1.0+h) );
    return d * sign( p.x*b.y + p.y*b.x - b.x*b.y );
}
float sdTriangleIsosceles( in vec2 p, in vec2 q )
{
    p.x = abs(p.x);
    vec2 a = p - q*clamp( dot(p,q)/dot(q,q), 0.0, 1.0 );
    vec2 b = p - q*vec2( clamp( p.x/q.x, 0.0, 1.0 ), 1.0 );
    float s = -sign( q.y );
    vec2 d = min( vec2( dot(a,a), s*(p.x*q.y-p.y*q.x) ),
                  vec2( dot(b,b), s*(p.y-q.y)  ));
    return -sqrt(d.x)*sign(d.y);
}
float opUnion(in float d1, in float d2) {
    return min(d1, d2);
}
float opInter(in float d1, in float d2) {
    return max(d1, d2);
}
float opSubtr(in float d1, in float d2) {
    return max(d1, -d2);
}
float opOutline(in float p)
{
    return abs(p);
}
float opRound(in float p, in float r)
{
    return p - r;
}
float sdf(in vec2 p) {
    float line = sdSegment(p, vec2(0.0), vec2(0.0, 0.5));
    float rhom = sdRhombus(p, vec2(0.5, 0.5));
    float trig = sdTriangleIsosceles(p, vec2(0.5, 0.5));
    float olrhom = opOutline(rhom);
    float oltrig = opOutline(trig);
    return opUnion(line, opUnion(olrhom, oltrig));
}
vec3 sdf2color(in float d, in vec3 linecolor, in vec3 bgcolor)
{
    return mix(linecolor, bgcolor, smoothstep(0.0, 0.01, d));
}

void main() {
    vec3 bgcolor = vec3(0.0, 0.0, 0.0);
    vec3 linecolor = vec3(1.0, 1.0, 1.0);
    outColor = vec4(sdf2color(sdf(v_texcoord), linecolor, bgcolor), 1.0);
    return;    
}