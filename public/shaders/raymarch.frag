#version 300 es
precision highp float;

in vec2 v_p; // Fragment coordinate from the vertex shader. from (-1, -1) to (1, 1)
out vec4 outColor;

uniform vec2 u_fov; // Field of view in radians
uniform vec2 u_resolution; // Viewport resolution
uniform vec3 u_sundir; // The direction from the camera origin to the sun
uniform vec3 u_epos; // Earth position in camera space.
uniform float u_escale; // Earch scale factor and sun scale factor

const float RC4     = -1.42770400e-02                   ;
const float RC3     = -1.53923793e+00                   ;
const float RC2     = -1.77213122e+02                   ;
const float RC1     = -2.12059191e+04                   ;
const float RC0     = 6.37813700e+06                    ;
const float INF     = 1.0 / 0.0                         ;
const float COS_SUN_APP_RADIUS = cos(0.5418 * 0.5);
const int MAX_ITER  = 64                                ;
const vec3 O3       = vec3(0.0)                ;
const vec3 I3       = vec3(1.0)                ;   
const vec3 SUNC     = vec3(1.0, 1.0, 0.75) ; // sun color

float earth(vec3 p) {
    vec3 pos = p - u_epos * u_escale;
    float r = length(pos);          // length of pos vector
    float s2 = (pos.z * pos.z) / (r * r); // = sin(lat)^2
    float R = RC0 + s2 * (RC1 + s2 * (RC2 + s2 * (RC3 + s2 * RC4)));
    return r - R * u_escale;
}
vec2 march(vec3 rd, float eps_c) { // returns (distance, iteration)
    float t = 0.0; // distance along ray
    for (int i = 0; i < MAX_ITER; i++) { // max iterations
        vec3 pos = rd * t; // current position along ray emitted from CAMERA (origin)
        float d = earth(pos); // distance to nearest object
        if (d < eps_c * t) { // hit earth
            return vec2(t, i); // return distance along ray
        }
        t += d; // move along ray
    }
    return vec2(INF, MAX_ITER); // didn't hit earth
}
vec4 rayNerr() {
    vec2 p = v_p * tan(u_fov * 0.5); // p is the pixel coordinate in camera space
    vec3 ray = vec3(p.x, 1.0, p.y); // ray direction
    float raylen = length(ray); // length of ray
    float halfPixCoeff = 1.0 / min(u_resolution.x, u_resolution.y); // half pixel coefficient
    vec2 nudgedpix = p + vec2(p.x > 0.0, p.y > 0.0) * halfPixCoeff; // nudged coordinates by 0.5 pixel
    float errfactor = length(p - nudgedpix) / raylen; // error factor
    return vec4(normalize(ray), errfactor); // return normalized ray direction and error factor
}
vec3 space(vec3 viewDir, vec3 lightSourceDir, float strength) {
    float cosAngle = dot(viewDir, lightSourceDir);
    if (cosAngle < 0.0) return O3; // no halo if light is behind the view direction
    if (cosAngle > COS_SUN_APP_RADIUS) return I3; // if the light is too close to the view direction, return white
    float haloStrength = pow(cosAngle, 1.0 / strength);
    return haloStrength * SUNC;
}
vec3 normAt(vec3 p, float err) {
    vec2 d = vec2(err, -err);
    return normalize(d.xyy * earth(p + d.xyy) + d.yyx * earth(p + d.yyx) + d.yxy * earth(p + d.yxy) + d.xxx * earth(p + d.xxx));
}
vec3 colorEarth(vec3 intersection, vec3 normal, int iter, float dist) { // no is the surface normal in object frame
    return mix(normal, vec3(0.0, 1.0, 0.0), 0.5) * (1.0 - float(iter) / float(MAX_ITER)); // mix normal with green color
}
vec3 c3d(vec2 m, vec3 rd, float errFactor) {
    float dist = m.x;
    int iter = int(m.y);
    if (dist < 0.0) return O3; // inside the object
    if (dist == INF) { // did not hit anything
        return space(rd, u_sundir, 2.0);
    }
    vec3 its = rd * dist; // intersection in plane frame
    float err = errFactor * dist; // error in plane frame
    vec3 nrm = normAt(its, err); // normal in plane frame
    return colorEarth(its, nrm, iter, dist);
}
// dummy main that outputs a color based on the coordinates and the time using a sine function
void main() {
    vec4 rayNerr = rayNerr();
    vec2 distIter = march(rayNerr.xyz, rayNerr.w); // march the ray
    vec3 color = c3d(distIter, rayNerr.xyz, rayNerr.w); // get the color from the march
    outColor = vec4(color, 1.0);
}