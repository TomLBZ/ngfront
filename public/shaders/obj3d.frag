#version 300 es
precision highp float;

in vec2 v_p; // Texture coordinate from the vertex shader.
out vec4 outColor;

uniform vec2 u_scale; // Scale of the texture coordinates.
uniform sampler2D u_prev; // Previous pass texture.
uniform float u_minres; // Min Viewport resolution: min side length in pixels of the view port
uniform vec2 u_fov; // Field of view in radians
uniform vec3 u_sundir; // sun direction vector
// a uniform of 16 vec3s is used to pass in the next 16 waypoints
uniform vec3 u_wps[16]; // waypoint vectors

const float WPRAD = 0.05                                ; // radius of the waypoint test sphere
const float WPSCALE = 1e-3                              ; // scale of the waypoint test sphere
const float MAX_DIST = 32.0                             ; // maximum distance to march the ray
const int MAX_ITER  = 64                                ;
const vec3 O3       = vec3(0.0)                ; // color of zero vector
const vec3 I3       = vec3(1.0, 1.0, 1.0)  ; // color of identity vector
const vec3 SUNC     = vec3(1.0, 1.0, 0.5)  ; // sun color
const vec3 WPCOLOR = vec3(1.0, 0.0, 1.0) ; // waypoint color

vec4 rayNerr() {
    vec2 p = v_p * tan(u_fov * 0.5); // p is the pixel coordinate in camera space
    vec3 ray = vec3(1.0, -p.x, p.y); // ray direction
    float raylen = length(ray); // length of ray
    float halfPixCoeff = 1.0 / u_minres; // half pixel coefficient
    vec2 nudgedpix = p + sign(p) * halfPixCoeff; // nudged coordinates by 0.5 pixel
    float errfactor = length(p - nudgedpix) / raylen; // error factor
    return vec4(normalize(ray), errfactor); // return normalized ray direction and error factor
}
float sphere(vec3 p, float r) {
    return length(p) - r; // signed distance to sphere
}
float sdfCombine(float d1, float d2) {
    return min(d1, d2); // combine two signed distances by taking the minimum
}
float wps(vec3 p) {
    float res = MAX_DIST; // result distance
    for (int i = 0; i < 16; i++) { // iterate over waypoints
        float d = sphere(p - u_wps[i] * WPSCALE, WPRAD); // distance to waypoint sphere
        if (d > 0.0) res = sdfCombine(res, d); // combine distances
    }
    return res;
}
vec3 march(vec3 rd, float eps_c) { // returns (distance, iteration)
    float t = 0.0; // distance along ray
    float minDist = MAX_DIST; // minimum distance to nearest object
    for (int i = 0; i < MAX_ITER; i++) { // max iterations
        vec3 pos = rd * t; // current position along ray emitted from CAMERA (origin)
        float d = wps(pos); // distance to nearest object
        if (d < 0.0) { // if inside an object
            return vec3(t, i, d); // return distance along ray and iteration count
        }
        float absd = abs(d); // absolute distance
        if (absd < minDist) { // update minimum distance
            minDist = absd;
        }
        if (absd < eps_c * t) { // hit earth
            return vec3(t, i, 0.0); // return distance along ray
        }
        t += d; // move along ray
        if (t > MAX_DIST) break; // max distance reached
    }
    return vec3(MAX_DIST, MAX_ITER, minDist); // didn't hit earth
}
vec3 normAt(vec3 p, float err) {
    vec2 d = vec2(err, -err);
    return normalize(d.xyy * wps(p + d.xyy) + d.yyx * wps(p + d.yyx) + d.yxy * wps(p + d.yxy) + d.xxx * wps(p + d.xxx));
}
vec4 colorWps(vec3 intersection, vec3 normal, int iter, float dist, vec4 prevc) { // no is the surface normal in object frame
    // get specular reflection of the sun on the surface
    vec3 viewrayDir = normalize(intersection);
    vec3 sunDir = normalize(u_sundir);
    vec3 reflected = reflect(sunDir, normal); // reflection of the sun direction
    float specAngle = max(dot(viewrayDir, reflected), 0.0); // angle between view direction and reflected sun direction
    if (specAngle < 0.0) specAngle = 0.0; // clamp angle to [0, 1]
    specAngle = pow(specAngle, 16.0); // specular highlight sharpness
    vec3 specularColor = SUNC * specAngle; // specular color based on sun direction and normal
    // get surface color based on distance and iteration
    float distfrac = dist / MAX_DIST; // distance fraction
    float iterfrac = float(iter) / float(MAX_ITER); // iteration fraction
    vec3 surfaceColor = WPCOLOR * (1.0 - distfrac) + I3 * iterfrac; // surface color based on distance and iteration
    vec3 color = surfaceColor + specularColor; // combine surface color and specular color
    color = clamp(color, O3, I3); // clamp color to [0, 1]
    vec4 color4 = mix(prevc, vec4(color, 1.0), pow(distfrac, 0.2)); // mix with previous color
    return color4; // return the final color
}
vec4 prev() {
    return texture(u_prev, v_p / u_scale * 0.5 + 0.5);
}
vec4 c3d(vec3 m, vec3 rd, float errFactor) {
    vec4 prevc = prev(); // get previous color
    float dist = m.x;
    // if (dist <= WPRAD) return prevc; // if distance is less than radius of waypoint sphere, return previous color
    int iter = int(m.y);
    float minDist = m.z;
    if (dist <= 0.0) return prevc; // if distance is less than or equal to zero, return previous color
    if (minDist != 0.0) return prevc; // if inside object or no intersection, return previous color
    vec3 its = rd * dist; // intersection in plane frame
    float err = errFactor * dist; // error in plane frame
    vec3 nrm = normAt(its, err); // normal in plane frame
    return colorWps(its, nrm, iter, dist, prevc);
}

void main() {
    vec4 rayNerr = rayNerr(); // get the ray direction and error factor
    vec3 distIterMin = march(rayNerr.xyz, rayNerr.w); // march the ray
    outColor = c3d(distIterMin, rayNerr.xyz, rayNerr.w); // get the color from the march
}