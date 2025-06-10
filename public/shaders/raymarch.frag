#version 300 es
precision highp float;

in vec2 v_p; // Fragment coordinate from the vertex shader. from (-1, -1) to (1, 1)
out vec4 outColor;

uniform float u_halfpixel; // Min Viewport resolution: min side length in pixels of the view port
uniform vec2 u_tanhalffov; // Tangent of half field of view in radians
uniform vec3 u_sundir; // The direction from the camera origin to the sun
uniform vec3 u_epos; // Earth position in camera space (WU). 1 meter = u_escale WU.
uniform float u_escale; // Earch scale factor and sun scale factor, is 1e-6 by default.

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
// atmosphere parameters (add if needed)
const float E_ATM_THK = 2.0e5                           ; // Earth atmosphere thickness in meters
const float  PI          = 3.14159265358979323846;
const float  HR          = 8.0e3;                 // Rayleigh scale height  (m)
const float  HM          = 1.2e3;                 // Mie      scale height  (m)
const vec3   BETA_R      = vec3(5.8e-6, 13.5e-6, 33.1e-6); // Rayleigh σs(λ)
const vec3   BETA_M      = vec3(21.0e-6);         // Mie σs   (assume grey)
const float  MIE_G       = 0.76;                  // Henyey-Greenstein g
const int    ATM_STEPS   = 8;                    // view-ray samples
const int    SUN_STEPS   =  4;                    // light-ray samples
const float  ATM_EXPOSE  = 0.5;                   // tonemap helper
const float EXPOSURE = 20.0;             // ← try 10-50 for different times of day
vec4 rayNerr() {
    vec2 p = v_p * u_tanhalffov; // p is the pixel coordinate in camera space
    vec3 ray = vec3(1.0, -p.x, p.y); // ray direction
    float invLen = inversesqrt(dot(ray, ray)); // inverse length of ray
    float errfactor = ROOT2 * u_halfpixel * invLen; // error factor
    return vec4(ray * invLen, errfactor); // return normalized ray direction and error factor
}
float earth(vec3 p) { // the signed distance function for the Earth located at u_epos in camera space
    vec3 pos = p - u_epos * u_escale;
    float r = length(pos);          // length of pos vector
    float s2 = (pos.z * pos.z) / (r * r); // = sin(lat)^2
    float R = RC0 + s2 * (RC1 + s2 * (RC2 + s2 * (RC3 + s2 * RC4)));
    return r - R * u_escale; // return value is in WU
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
        if (d < 0.0) return vec3(t, float(i), 0.0); // inside an object, return distance along ray
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
vec3 tonemapReinhard(vec3 c) {
    c *= EXPOSURE;           // photographic exposure
    return c / (1.0 + c);    // simple Reinhard curve
}
vec3 gamma22(vec3 c) { // gamma correction
    return pow(clamp(c, 0.0, 1.0), vec3(1.0/2.2));
}
vec3 tonemapACES(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    x *= EXPOSURE;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}
vec2 raySphereIntersect(vec3 ro, vec3 rd, float R) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - R*R;
    float h = b*b - c;
    if (h < 0.0) return vec2(-1.0);          // miss
    h = sqrt(h);
    return vec2(-b - h, -b + h);             // entry, exit
}
vec3 atmosphere(vec3 rd, float maxDistWU) {
    float  SU          = u_escale;        // “scale unit”: 1 m = SU WU
    float  HR_WU       = HR * SU;
    float  HM_WU       = HM * SU;
    vec3   BETA_R_WU   = BETA_R / SU;     //  σ · length(WU)  ⇒  dimensionless
    vec3   BETA_M_WU   = BETA_M / SU;
    float  E_R_WU      = E_R * SU;
    float  E_ATM_R_WU  = (E_R + E_ATM_THK) * SU;
    vec3 EARTH_C = u_epos * u_escale; // Earth center in camera space (WU)
    vec2 hit = raySphereIntersect(-EARTH_C, rd, E_ATM_R_WU);
    if (hit.y < 0.0) return O3; // no intersection with the atmosphere
    float t0 = max(hit.x, 0.0);
    float t1 = min(hit.y, maxDistWU);
    if (t1 <= t0) return O3; // no intersection with the atmosphere
    vec3  radiance   = O3;
    float odR_view   = 0.0;
    float odM_view   = 0.0;
    float stepWU     = (t1 - t0) / float(ATM_STEPS);
    for (int i = 0; i < ATM_STEPS; ++i)
    {
        float t    = t0 + (float(i) + 0.5) * stepWU;
        vec3  pos  = rd * t;
        float alt  = length(pos - EARTH_C) - E_R_WU;     // altitude in WU
        float rhoR = exp(-alt / HR_WU);
        float rhoM = exp(-alt / HM_WU);
        odR_view  += rhoR * stepWU;
        odM_view  += rhoM * stepWU;
        vec2 sunHit  = raySphereIntersect(pos - EARTH_C, u_sundir, E_ATM_R_WU); // sun path in WU
        float sunSegWU  = max(sunHit.y, 0.0);
        float sunStepWU = sunSegWU / float(SUN_STEPS);
        float odR_sun = 0.0;
        float odM_sun = 0.0;
        vec3  sunP    = pos;
        for (int j = 0; j < SUN_STEPS; ++j)
        {
            sunP += u_sundir * sunStepWU;
            float altS = length(sunP - EARTH_C) - E_R_WU;
            odR_sun   += exp(-altS / HR_WU) * sunStepWU;
            odM_sun   += exp(-altS / HM_WU) * sunStepWU;
        }
        float mu    = dot(rd, u_sundir);
        float mu2   = mu * mu;
        float phaseR= (3.0/(16.0*PI))*(1.0+mu2);
        float g2    = MIE_G*MIE_G;
        float phaseM= (3.0/(8.0*PI))*(1.0-g2)*(1.0+mu2) /
                      pow(1.0+g2-2.0*MIE_G*mu, 1.5);
        vec3  T_view = exp(-(BETA_R_WU*odR_view + BETA_M_WU*odM_view));
        vec3  T_sun  = exp(-(BETA_R_WU*odR_sun  + BETA_M_WU*odM_sun));
        vec3  scatter = (phaseR * BETA_R_WU * rhoR +
                         phaseM * BETA_M_WU * rhoM) * T_sun;
        radiance += scatter * T_view * stepWU;
    }
    return clamp(radiance * ATM_EXPOSE, O3, I3);
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
    // Atmosphere calculation (TO BE ADDED)
    vec3 atmColor = atmosphere(rd, dist); // calculate atmosphere color
    color += tonemapReinhard(atmColor);
    color += sunmask; // add atmosphere color to the final color
    return gamma22(color); // return the final color
}
void main() {
    vec4 rayNerr = rayNerr(); // get the ray direction and error factor
    vec3 distIterMin = march(rayNerr.xyz, rayNerr.w); // march the ray
    vec3 color = c3d(distIterMin, rayNerr.xyz, rayNerr.w); // get the color from the march
    outColor = vec4(color, 1.0);
}