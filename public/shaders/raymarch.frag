#version 300 es
precision highp float;

in vec2 v_p; // Fragment coordinate from the vertex shader. from (-1, -1) to (1, 1)
out vec4 outColor;

uniform float u_halfpixel; // Min Viewport resolution: min side length in pixels of the view port
uniform vec2 u_tanhalffov; // Tangent of half field of view in radians
uniform vec3 u_sundir; // The direction from the camera origin to the sun
uniform vec3 u_epos; // Earth position in camera space.
uniform float u_escale; // Earch scale factor and sun scale factor

const vec3 O3       = vec3(0.0)                ;
const vec3 I3       = vec3(1.0)                ;   
const vec3 SUNC     = vec3(1.0, 1.0, 0.5)  ; // sun color
const vec3 ETHC     = vec3(0.0, 0.25, 0.25) ; // Earth color
const float HALO_STRENGTH = 0.001                       ; // strength of the halo effect
const float ROOT2 = 1.4142135623730951                  ; // square root of 2
const float E_R     = 6.371000000e+06                   ; // Earth radius in meters (average)
const float RC4     = -1.42770400e-02                   ;
const float RC3     = -1.53923793e+00                   ;
const float RC2     = -1.77213122e+02                   ;
const float RC1     = -2.12059191e+04                   ;
const float RC0     = 6.37813700e+06                    ;
const float MAX_DIST = 32.0                             ;
const float COS_SUN_APP_RADIUS = 0.999988822575         ; // cos(0.5 * sun apparent radius)
const int MAX_ITER  = 64                                ; // maximum number of iterations for ray marching
// atmosphere parameters
const float E_ATM_THK = 2.0e5                           ; // Earth atmosphere thickness in meters
const float E_ATM_R = E_R + E_ATM_THK                   ; // Earth atmosphere radius in meters
const float SCAT_INTENSITY = 2.0                        ; // scattering intensity (atmosphere thickness)
const vec3 SCAT_COEFFS = vec3(700., 530., 440.); // scattering coefficients for red, green, blue channels
const vec3 scatteringCoeffs = pow(400./SCAT_COEFFS, vec3(4.)) * SCAT_INTENSITY;
const int SCAT_SAMPLES = 8                              ; // number of samples for scattering calculation

vec4 rayNerr() {
    vec2 p = v_p * u_tanhalffov; // p is the pixel coordinate in camera space
    vec3 ray = vec3(1.0, -p.x, p.y); // ray direction
    float invLen = inversesqrt(dot(ray, ray)); // inverse length of ray
    float errfactor = ROOT2 * u_halfpixel * invLen; // error factor
    return vec4(ray * invLen, errfactor); // return normalized ray direction and error factor
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
    vec3 pos = O3; // current position along ray
    for (int i = 0; i < MAX_ITER; i++) { // max iterations
        float d = earth(pos); // distance to nearest object
        float absd = abs(d); // absolute distance
        if (absd < minDist) { // update minimum distance
            minDist = absd;
        }
        if (absd < eps_c * t) { // hit earth
            return vec3(t, float(i), 0.0); // return distance along ray
        }
        t += d; // move along ray
        if (t > MAX_DIST) break; // max distance reached
        pos = rd * t; // update camera position along ray
    }
    return vec3(MAX_DIST, MAX_ITER, minDist); // didn't hit earth
}
// ray-sphere intersection returns the near and far intersection points, or a high value if no hit
vec2 raySphereIntersect(vec3 ro, vec3 rd, float radius) {
    float b = 2. * dot(ro, rd);
    float c = dot(ro, ro) - radius * radius;
    float d = b*b - 4.*c; // a is 1
    if (d <= 0.) return vec2(1e9); // no intersection
    float s = sqrt(d);
    float dstNear = max(0., (-b-s)*0.5);
    float dstFar = (-b+s)*0.5;
    if (dstFar < .0) return vec2(1e9); // no intersection in front of the camera
    if (dstNear < 0.) dstNear = 0.; // if the near intersection is behind the camera, set it to 0
    return vec2(dstNear, dstFar - dstNear);
}
// Atmoshperic scattering functions, centering at earth center
float densityAtPoint(vec3 p) {
    float alt = earth(p); // altitude above the Earth surface
    float heightFrac = alt / (E_ATM_THK * u_escale);
    if (heightFrac < 0.0 || heightFrac >= 1.0) return 0.0; // outside the atmosphere
    return exp(-heightFrac * 2.0) * (1. - heightFrac);
}
float opticalDepth(vec3 ro, vec3 rd, float rayLength) {
    float stepSize = rayLength / float(SCAT_SAMPLES - 1);
    float depth = 0.;
    for (int i = 0; i < SCAT_SAMPLES; i++) {
        float density = densityAtPoint(ro);
        depth += density * stepSize;
        ro += rd * stepSize; // move along the ray
    }
    return depth;
}
vec3 calculateLight(vec3 ro, vec3 rd, float far, vec3 sunDir, vec3 color) {
    float stepSize = far / float(SCAT_SAMPLES - 1);
    vec3 scatterLight = O3;
    float viewRayDepth = 0.;
    for (int i = 0; i < SCAT_SAMPLES; i++) {
        viewRayDepth = opticalDepth(ro, -rd, stepSize * float(i));
        float sunRayLength = raySphereIntersect(ro, sunDir, E_ATM_R * u_escale).y;
        float sunRayDepth = opticalDepth(ro, sunDir, sunRayLength);
        float density = densityAtPoint(ro);
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
            sunmask = SUNC * pow(viewAngle, 1.0 / HALO_STRENGTH); // halo color based on fraction when the sun is not behind the view direction
        }    
    } else { // some intersection with the scene
        vec3 its = rd * dist; // intersection point in camera space
        vec3 nrm = normAt(its, err); // normal in plane frame
        float intensity = clamp(dot(nrm, u_sundir), 0.0, 1.0); // light intensity based on normal and sun direction
        vec3 diffuseColor = (intensity * 0.3 + 0.7) * ETHC; // diffuse color based on normal and sun direction
        vec3 specColor = SUNC * pow(intensity, 16.0); // specular color based on normal and sun direction
        color = diffuseColor + specColor; // combine diffuse and specular color
        color = clamp(color, O3, I3); // clamp color to [0, 1]
    }
    // Atmosphere intersection
    vec2 hit = raySphereIntersect(O3, rd, E_ATM_R * u_escale); // ray-sphere intersection with atmosphere
    float near = hit.x;
    float throughLen = min(hit.y, dist - near);
    if (throughLen > 0.) { 
        // Ray hit atmosphere
        vec3 nearPoint = rd * (near + errFactor * near); // near intersection point in camera space
        color = calculateLight(nearPoint, rd, throughLen - errFactor * throughLen, u_sundir, color);
    }
    return color + sunmask; // return the final color
}
void main() {
    vec4 rayNerr = rayNerr(); // get the ray direction and error factor
    vec3 distIterMin = march(rayNerr.xyz, rayNerr.w); // march the ray
    vec3 color = c3d(distIterMin, rayNerr.xyz, rayNerr.w); // get the color from the march
    outColor = vec4(color, 1.0);
}