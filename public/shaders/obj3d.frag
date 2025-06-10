#version 300 es
precision highp float;

in vec2 v_p; // Texture coordinate from the vertex shader.
out vec4 outColor;

uniform float u_nwps; // number of active waypoints (at least one waypoint must be active)
uniform vec2 u_scale; // Scale of the texture coordinates.
uniform sampler2D u_prev; // Previous pass texture.
uniform float u_halfpixel; // Min Viewport resolution: min side length in pixels of the view port
uniform vec2 u_tanhalffov; // Field of view in radians
uniform vec3 u_sundir; // sun direction vector
// a uniform of 16 vec3s is used to pass in the next 16 waypoints
uniform vec3 u_wps[16]; // waypoint vectors

const float ROOT2 = 1.4142135623730951; // square root of 2
const float WPRAD = 0.01                                ; // radius of the waypoint test sphere, in km
const float MAX_DIST = 32.0                             ; // maximum distance to march the ray, in km
const int MAX_ITER  = 64                                ; // maximum number of iterations for ray marching
const vec3 SUNC     = vec3(1.0, 1.0, 0.5)  ; // sun color
const vec3 WPCOLOR = vec3(1.0, 0.0, 1.0) ; // waypoint color

vec4 rayNerr() {
    vec2 p = v_p * u_tanhalffov; // p is the pixel coordinate in camera space
    vec3 ray = vec3(1.0, -p.x, p.y); // ray direction
    float invLen = inversesqrt(dot(ray, ray)); // inverse length of ray
    float errfactor = ROOT2 * u_halfpixel * invLen; // error factor
    return vec4(ray * invLen, errfactor); // return normalized ray direction and error factor
}
float sphere(vec3 p, float r) {
    return length(p) - r; // signed distance to sphere
}
float wps(vec3 p) {
    float res = MAX_DIST; // result distance
    int inwps = int(u_nwps); // number of waypoints to check
    for (int i = 0; i < inwps; ++i) { // iterate over waypoints
        float d = sphere(p - u_wps[i], WPRAD); // distance to waypoint sphere
        res = min(res, d); // update result distance
    }
    return res;
}
vec3 march(vec3 rd, float eps_c) { // returns (distance, iteration)
    float t = 0.0; // distance along ray
    for (int i = 0; i < MAX_ITER; ++i) { // max iterations
        vec3 pos = rd * t; // current position along ray emitted from CAMERA (origin)
        float d = wps(pos); // distance to nearest object
        if (d <= 0.0) { // if inside an object, return immediate result
            return vec3(t, float(i), 0.0); // return distance along ray and iteration count
        }
        if (d < eps_c * t) { // hit waypoint sphere
            return vec3(t, float(i), 0.0); // return distance along ray
        }
        t += d; // move along ray
        if (t > MAX_DIST) break; // max distance reached
    }
    return vec3(MAX_DIST, MAX_ITER, -1.0); // didn't hit earth
}
vec3 normAt(vec3 p, float err) {
    vec2 d = vec2(err, -err);
    vec3 xyy = d.xyy;
    vec3 yyx = d.yyx;
    vec3 yxy = d.yxy;
    vec3 xxx = d.xxx;
    vec3 q1 = p + xyy; // perturbation in x direction
    vec3 q2 = p + yyx; // perturbation in y direction
    vec3 q3 = p + yxy; // perturbation in z direction
    vec3 q4 = p + xxx; // perturbation in x direction
    return normalize(xyy * wps(q1) + yyx * wps(q2) + yxy * wps(q3) + xxx * wps(q4));
}
vec4 prev() {
    return texture(u_prev, v_p / u_scale * 0.5 + 0.5);
}
vec4 c3d(vec3 m, vec3 rd, float errFactor) {
    vec4 prevc = prev(); // get previous color
    float dist = m.x;
    if (dist <= WPRAD || m.z != 0.0) return prevc; // if inside object or no intersection, return previous color
    float err = errFactor * dist; // error in plane frame
    vec3 its = rd * dist; // intersection in plane frame
    vec3 nrm = normAt(its, err); // normal in plane frame
    float intensity = clamp(dot(nrm, u_sundir), 0.0, 1.0); // light intensity based on normal and sun direction
    vec3 diffuseColor = (intensity * 0.5 + 0.5) * WPCOLOR; // diffuse color based on normal and sun direction
    vec3 specularColor = SUNC * pow(intensity, 16.0); // specular color based on normal and sun direction
    float distfrac = dist / MAX_DIST; // distance fraction
    float distcoeff = pow(distfrac, 0.2); // distance coefficient for color mixing
    vec3 color = diffuseColor + specularColor; // combine diffuse and specular color
    return mix(prevc, vec4(color, 1.0), distcoeff); // mix with previous color based on distance
}

void main() {
    vec4 rayNerr = rayNerr(); // get the ray direction and error factor
    vec3 distIterMin = march(rayNerr.xyz, rayNerr.w); // march the ray
    outColor = c3d(distIterMin, rayNerr.xyz, rayNerr.w); // get the color from the march
}