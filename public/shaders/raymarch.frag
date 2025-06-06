#version 300 es
precision highp float;

in vec2 v_p; // Fragment coordinate from the vertex shader. from (-1, -1) to (1, 1)
out vec4 outColor;

uniform float u_minres; // Min Viewport resolution: min side length in pixels of the view port
uniform vec2 u_fov; // Field of view in radians
uniform vec3 u_sundir; // The direction from the camera origin to the sun
uniform vec3 u_epos; // Earth position in camera space.
uniform float u_escale; // Earch scale factor and sun scale factor

const vec3 O3       = vec3(0.0)                ;
const vec3 I3       = vec3(1.0)                ;   
const vec3 SUNC     = vec3(1.0, 1.0, 0.5)  ; // sun color
const vec3 ETHC     = vec3(0.0, 0.3, 0.3)  ; // Earth color
const float E_R     = 6.371000000e+06                    ; // Earth radius in meters (average)
const float RC4     = -1.42770400e-02                   ;
const float RC3     = -1.53923793e+00                   ;
const float RC2     = -1.77213122e+02                   ;
const float RC1     = -2.12059191e+04                   ;
const float RC0     = 6.37813700e+06                    ;
const float MAX_DIST = 32.0                             ;
const float COS_SUN_APP_RADIUS = 0.999988822575         ; // cos(0.5 * sun apparent radius)
// atmosphere parameters
const float E_ATM_THK = 2.0e5                           ; // Earth atmosphere thickness in meters
const float E_ATM_R = E_R + E_ATM_THK                   ; // Earth atmosphere radius in meters
const float OPT_DEPTH_PTS = 8.0                         ; // number of points for optical depth calculation
const float IN_SCATT_PTS = 8.0                          ; // number of points for in-scattering calculation
const float SCAT_INTENSITY = 0.22                        ; // scattering intensity (atmosphere thickness)
const vec3 SCAT_COEFFS = vec3(700., 530., 440.); // scattering coefficients for red, green, blue channels
const vec3 scatteringCoeffs = pow(400./SCAT_COEFFS, vec3(4.)) * SCAT_INTENSITY;

const int MAX_ITER  = 64                                ;

vec4 rayNerr() {
    vec2 p = v_p * tan(u_fov * 0.5); // p is the pixel coordinate in camera space
    vec3 ray = vec3(1.0, -p.x, p.y); // ray direction
    float raylen = length(ray); // length of ray
    float halfPixCoeff = 1.0 / u_minres; // half pixel coefficient
    vec2 nudgedpix = p + sign(p) * halfPixCoeff; // nudged coordinates by 0.5 pixel
    float errfactor = length(p - nudgedpix) / raylen; // error factor
    return vec4(normalize(ray), errfactor); // return normalized ray direction and error factor
}
float earth(vec3 p) {
    vec3 pos = p - u_epos * u_escale;
    float r = length(pos);          // length of pos vector
    float s2 = (pos.z * pos.z) / (r * r); // = sin(lat)^2
    float R = RC0 + s2 * (RC1 + s2 * (RC2 + s2 * (RC3 + s2 * RC4)));
    return r - R * u_escale;
}
vec3 normAt(vec3 p, float err) {
    vec2 d = vec2(err, -err);
    return normalize(d.xyy * earth(p + d.xyy) + d.yyx * earth(p + d.yyx) + d.yxy * earth(p + d.yxy) + d.xxx * earth(p + d.xxx));
}
vec3 march(vec3 rd, float eps_c) { // returns (distance, iteration)
    float t = 0.0; // distance along ray
    float minDist = MAX_DIST; // minimum distance to nearest object
    for (int i = 0; i < MAX_ITER; i++) { // max iterations
        vec3 pos = rd * t; // current position along ray emitted from CAMERA (origin)
        float d = earth(pos); // distance to nearest object
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
// ray-sphere intersection returns the near and far intersection points, or a high value if no hit
vec2 raySphereIntersect(vec3 ro, vec3 rd, float radius) {
    vec3 offset = ro;
    float a = 1.;
    float b = 2. * dot(offset, rd);
    float c = dot(offset, offset) - radius * radius;
    float d = b*b - 4.*a*c;
    if (d > 0.) {
        float s = sqrt(d);
        float dstNear = max(0., (-b-s)/(2.*a));
        float dstFar = (-b+s)/(2.*a);
        if (dstFar >= 0.) {
            return vec2(dstNear, dstFar - dstNear);
        }
    }
    return vec2(1e9);
}
// Atmoshperic scattering functions, centering at earth center
float densityAtAltitude(float alt) {
    float heightFrac = alt / (E_ATM_THK * u_escale);
    return exp(-heightFrac * 2.0) * (1. - heightFrac);
}
float opticalDepth(vec3 ro, vec3 rd, float rayLength) {
    float stepSize = rayLength / (OPT_DEPTH_PTS - 1.);
    float depth = 0.;
    for (float i = 0.; i < IN_SCATT_PTS; i++) {
        float density = densityAtAltitude((length(u_epos) - E_R) * u_escale);
        depth += density * stepSize;
        ro += rd * stepSize;
    }
    return depth;
}
vec3 calculateLight(vec3 ro, vec3 rd, float far, vec3 sunDir, vec3 color) {
    float stepSize = far / (IN_SCATT_PTS - 1.);
    vec3 scatterLight = vec3(0.);
    float viewRayDepth = 0.;
    for (float i = 0.; i < IN_SCATT_PTS; i++) {
        viewRayDepth = opticalDepth(ro, -rd, stepSize * float(i));
        float sunRayLength = raySphereIntersect(ro, sunDir, E_ATM_R * u_escale).y;
        float sunRayDepth = opticalDepth(ro, sunDir, sunRayLength);
        float density = densityAtAltitude((length(u_epos) - E_R) * u_escale);
        vec3 transmittance = exp(-(sunRayDepth + viewRayDepth) * scatteringCoeffs);
        scatterLight += density * transmittance * scatteringCoeffs * stepSize;
        ro += rd * stepSize;
    }
    return color * exp(-viewRayDepth) + scatterLight;
}  
vec3 c3d(vec3 m, vec3 rd, float errFactor) {
    float dist = m.x;
    if (dist < 0.0) return O3; // inside the object
    float minDist = m.z;
    vec3 color = O3; // default color is black
    float err = errFactor * dist; // error in plane frame
    vec3 sunmask = O3; // default sun mask is black
    float viewAngle = dot(rd, u_sundir); // angle between view direction and sun direction
    if (minDist != 0.0) { // if not inside an object or no intersection
        if (viewAngle > COS_SUN_APP_RADIUS) sunmask = I3; // if the sun is too close to the view direction, return white
        else if (viewAngle > 0.0) { // if the sun is not behind the view direction
            float haloStrength = 0.001; // strength of the halo effect
            sunmask = SUNC * pow(viewAngle, 1.0 / haloStrength); // halo color based on fraction when the sun is not behind the view direction
        }    
    } else { // some intersection with the scene
        vec3 its = rd * dist; // intersection point in camera space
        vec3 nrm = normAt(its, err); // normal in plane frame
        float intensity = clamp(dot(nrm, u_sundir), 0.0, 1.0); // light intensity based on normal and sun direction
        vec3 diffuseColor = (intensity * 0.5 + 0.5) * ETHC; // diffuse color based on normal and sun direction
        vec3 specColor = SUNC * pow(intensity, 16.0); // specular color based on normal and sun direction
        color = diffuseColor + specColor; // combine diffuse and specular color
        color = clamp(color, O3, I3); // clamp color to [0, 1]
    }
    // Atmosphere intersection
    vec2 hit = raySphereIntersect(O3, rd, E_ATM_R * u_escale); // ray-sphere intersection with atmosphere
    float near = hit.x;
    float far = min(hit.y, dist - near);
    if (far > 0.) { 
        // Ray hit atmosphere
        vec3 nearPoint = rd * (near + err);
        color = calculateLight(nearPoint, rd, far - err * 2., u_sundir, color);
    } 
    return color + sunmask; // return the final color
}
void main() {
    vec4 rayNerr = rayNerr(); // get the ray direction and error factor
    vec3 distIterMin = march(rayNerr.xyz, rayNerr.w); // march the ray
    vec3 color = c3d(distIterMin, rayNerr.xyz, rayNerr.w); // get the color from the march
    outColor = vec4(color, 1.0);
}