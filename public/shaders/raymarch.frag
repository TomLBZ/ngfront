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
const float E_A = 6378137.0                             ;       // equatorial a
const float E_B = 6356752.3                             ;       // polar      b
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
const float  PI          = 3.14159265358979323846;
const float  HR          = 8.0e3;                 // Rayleigh scale height  (m)
const float  HM          = 1.2e3;                 // Mie      scale height  (m)
const vec3   BETA_R      = vec3(5.8e-6, 13.5e-6, 33.1e-6); // Rayleigh σs(λ)
const vec3   BETA_M      = vec3(21.0e-6);         // Mie σs   (assume grey)
const float  MIE_G       = 0.76;                  // Henyey-Greenstein g
const int    BASE_STEPS   = 8;                    // view-ray samples
const int    SUN_STEPS   =  4;                    // light-ray samples
const float EXPOSURE = 20.0;             // ← try 10-50 for different times of day
const float NIGHT_FLOOR = 0.15; // night floor for the Earth color, ≈ starlight + moon-light + city-glow
const float MISS = 1e9;
vec4 rayNerr() {
    vec2 p = v_p * u_tanhalffov; // p is the pixel coordinate in camera space
    vec3 ray = vec3(1.0, -p.x, p.y); // ray direction
    float invLen = inversesqrt(dot(ray, ray)); // inverse length of ray
    float errfactor = ROOT2 * u_halfpixel * invLen; // error factor
    return vec4(ray * invLen, errfactor); // return normalized ray direction and error factor
}
float ellipsoidSurfaceRadius(vec3 pos) { // pos in earth frame in WU, return value in WU
    float r = length(pos);          // length of pos vector
    float s2 = (pos.z * pos.z) / (r * r); // = sin(lat)^2
    float R = RC0 + s2 * (RC1 + s2 * (RC2 + s2 * (RC3 + s2 * RC4)));
    return R * u_escale; // return value is in WU
}
float earth(vec3 p) { // the signed distance function for the Earth located at u_epos in camera space
    vec3 pos = p - u_epos * u_escale;
    float R = ellipsoidSurfaceRadius(pos); // radius of the ellipsoid at point p
    // return length(pos) - R; // return value is in WU
    return length(pos) - E_R * u_escale; // debug: sphere
}
vec3 normAt(vec3 p, float err) {
    vec2 d = vec2(err, -err);
    return normalize(d.xyy * earth(p + d.xyy) + d.yyx * earth(p + d.yyx) + d.yxy * earth(p + d.yxy) + d.xxx * earth(p + d.xxx));
}
vec2 rayEllipsoidIntersect(vec3 ro, vec3 rd, float a, float b) {
    vec3 roS = ro / vec3(a, a, b);          // scale → unit sphere
    vec3 rdS = rd / vec3(a, a, b);
    float A = dot(rdS, rdS);
    float B = 2.0 * dot(roS, rdS);
    float C = dot(roS, roS) - 1.0;
    float D = B*B - 4.0*A*C;
    if (D < 0.0) return vec2(MISS);         // no hit
    float s = sqrt(D);
    return vec2((-B - s) / (2.0*A),         // entry
                (-B + s) / (2.0*A));        // exit
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
    // float tEll = hitEarthEllipsoid(rd);
    vec3 EARTH_C = u_epos * u_escale; // Earth center in camera space (WU)
    float aE = E_A * u_escale;
    float bE = E_B * u_escale;
    float tEll = rayEllipsoidIntersect(-EARTH_C, rd, aE, bE).x;
    if (tEll < MAX_DIST && tEll > 0.0) return vec3(tEll, float(MAX_ITER), 0.0);
    return vec3(MAX_DIST, MAX_ITER, minDist); // didn't hit earth
}
vec3 tonemapReinhard(vec3 c) {
    c *= EXPOSURE;           // photographic exposure
    return c / (1.0 + c);    // simple Reinhard curve
}
vec3 gamma22(vec3 c) { // gamma correction
    return pow(clamp(c, 0.0, 1.0), vec3(1.0/2.2));
}
float sunVisibility(vec3 pCam) { /* ray from sample-point toward the Sun, expressed in camera space */
    vec3 EARTH_C = u_epos * u_escale; // Earth center in camera space (WU)
    float aE =  E_A * u_escale;
    float bE =  E_B * u_escale;
    vec3  ro = pCam - EARTH_C;                 // origin in Earth-centred frame (WU)
    vec2  hit = rayEllipsoidIntersect(ro, u_sundir, aE, bE);
    return (hit.x > 0.0 && hit.x < MISS) ? 0.0 : 1.0;
}
vec4 integrateAtmosphere(vec3 rd, float maxDistWU)
{
    float  SU          = u_escale;        // “scale unit”: 1 m = SU WU
    float  HR_WU       = HR * SU;
    float  HM_WU       = HM * SU;
    vec3   BETA_R_WU   = BETA_R / SU;     //  σ · length(WU)  ⇒  dimensionless
    vec3   BETA_M_WU   = BETA_M / SU;
    float  E_ATM_R_WU  = (E_R + E_ATM_THK) * SU;
    vec3 EARTH_C = u_epos * u_escale; // Earth center in camera space (WU)
    // vec2 hit = raySphereIntersect(-EARTH_C, rd, E_ATM_R_WU);
    float aO = (E_A + E_ATM_THK) * u_escale;   // outer semi-axes (WU)
    float bO = (E_B + E_ATM_THK) * u_escale;
    vec2 hit  = rayEllipsoidIntersect(-EARTH_C, rd, aO, bO);
    if (hit.x == MISS)          return vec4(O3, 1.0);      // camera outside air
    if (hit.y < 0.0) return vec4(O3, 1.0);           // camera outside air
    float t0 = max(hit.x, 0.0);
    float t1 = min(hit.y, maxDistWU);
    if (t1 <= t0) return vec4(O3, 1.0);
    float stepWU  = (t1 - t0) / float(BASE_STEPS);
    vec3  radiance= O3;
    float odR     = 0.0;
    float odM     = 0.0;
    for (int i = 0; i < BASE_STEPS; ++i) {
        float t   = t0 + (float(i)+0.5)*stepWU;
        vec3 pos = rd * t;
        float alt = earth(pos); // altitude in WU
        float rhoR = exp(-alt / HR_WU);
        float rhoM = exp(-alt / HM_WU);
        odR += rhoR * stepWU;
        odM += rhoM * stepWU;
        float vis = sunVisibility(pos);
        float odR_sun = 0.0, odM_sun = 0.0;
        if (vis > 0.0) {
            vec2 sunHit = rayEllipsoidIntersect(pos - EARTH_C, u_sundir, aO, bO);
            float segWU  = max(sunHit.y, 0.0);
            float sStep  = segWU / float(SUN_STEPS);
            vec3  sunP   = pos;
            for (int j = 0; j < SUN_STEPS; ++j) {
                sunP += u_sundir * sStep;
                float altS = earth(sunP); // altitude in WU
                odR_sun += exp(-altS / HR_WU) * sStep;
                odM_sun += exp(-altS / HM_WU) * sStep;
            }
        }
        float mu     = dot(rd, u_sundir);
        float mu2    = mu * mu;
        float phaseR = (3.0/(16.0*PI))*(1.0+mu2);
        float g2     = MIE_G*MIE_G;
        float phaseM = (3.0/(8.0*PI))*(1.0-g2)*(1.0+mu2) /
                    pow(1.0+g2-2.0*MIE_G*mu, 1.5);
        vec3 T_light = exp(-(BETA_R_WU*odR_sun + BETA_M_WU*odM_sun));
        vec3 scatter = vis * (phaseR*BETA_R_WU*rhoR +
                            phaseM*BETA_M_WU*rhoM) * T_light;
        vec3 T_view  = exp(-(BETA_R_WU*odR + BETA_M_WU*odM));
        radiance    += scatter * T_view * stepWU;
    }
    vec3  T_final = exp(-(BETA_R_WU*odR + BETA_M_WU*odM));
    return vec4(radiance, T_final.r);   // any channel is fine for T
}
vec3 c3d(vec3 m, vec3 rd, float errFactor) {
    float dist = m.x;
    if (dist < 0.0) return O3; // inside the object
    float minDist = m.z;
    vec3 surface = O3; // default color is black
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
        float aWU = E_A * u_escale;
        float bWU = E_B * u_escale;
        vec3 nrm = (minDist == 0.0)
           ? normAt(its, err)                               // usual case, sdf normal
           : normalize(vec3(its.x/(aWU*aWU),
                            its.y/(aWU*aWU),
                            its.z/(bWU*bWU)));              // fallback, analytic normal
        float intensity = clamp(dot(nrm, u_sundir), 0.0, 1.0); // light intensity based on normal and sun direction
        vec3 diffuseColor = (intensity * 0.3 + 0.7) * ETHC; // diffuse color based on normal and sun direction
        vec3 specColor = SUNC * pow(intensity, 16.0); // specular color based on normal and sun direction
        surface = diffuseColor + specColor; // combine diffuse and specular color
        surface = clamp(surface, O3, I3); // clamp color to [0, 1]
        surface = ETHC;
    }
    vec4 atm = integrateAtmosphere(rd, dist); // integrate atmosphere along the ray
    float trans = max(atm.a, NIGHT_FLOOR); // atmosphere transmittance, clamped to night floor
    vec3 color = surface * trans + tonemapReinhard(atm.rgb); // attenuate base color and add scattered light
    return gamma22(color + sunmask); // return the final color
}
void main() {
    vec4 rayNerr = rayNerr(); // get the ray direction and error factor
    vec3 distIterMin = march(rayNerr.xyz, rayNerr.w); // march the ray
    vec3 color = c3d(distIterMin, rayNerr.xyz, rayNerr.w); // get the color from the march
    outColor = vec4(color, 1.0);
}