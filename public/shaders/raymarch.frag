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
const int SCAT_SAMPLES = 4                              ; // number of samples for scattering calculation
const int BIDIR_PTS = 8                                 ; // number of samples along the bidirectional ray
const int VIEW_SAMPLES = 6                              ; // number of samples along the view ray, must be >= 2
const int SUN_SAMPLES = 4                               ; // number of samples along the sun ray, must be even
const float MID = 0.5                                   ; // midpoint
const float RAYLEIGH_H = 8.0e3                          ;       // Rayleigh scale height  (metres)
const float MIE_H      = 1.2e3                          ;       // Mie      scale height
const vec3  RAYLEIGH_BETA =             // λ⁻⁴ scaled to RGB  (m⁻¹)
          pow(400.0 / vec3(700.0, 530.0, 440.0), vec3(4.0)) * 5.802e-6;
const vec3  MIE_BETA   = vec3(2.0e-5)            ; // grey-ish mie coeff  (m⁻¹)
const float MIN_SUN_FADE = 0.05                         ; // 5% residual light from the sun
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
vec2 raySphereIntersect(vec3 ro, vec3 rd, vec3 center, float radius) { // in camera space, world units
    vec3  oc = ro - center;               // shift to sphere coords
    float b  = dot(oc, rd);               // = ½ of the usual quadratic 'b'
    float c  = dot(oc, oc) - radius*radius;
    float h  = b*b - c;                   // discriminant /4  (since a=1)
    if (h <= 0.0) return vec2(1e9);       // miss
    float s  = sqrt(h);
    float tNear = -b - s;
    float tFar  = -b + s;
    if (tFar < 0.0) return vec2(1e9);     // sphere behind ray
    if (tNear < 0.0) tNear = 0.0;
    return vec2(tNear, tFar - tNear);     // (entry, thickness)
}
float densityAtPoint(vec3 p) {
    float alt = earth(p); // altitude above the Earth surface
    float heightFrac = alt / (E_ATM_THK * u_escale);
    if (heightFrac >= 1.0) return 0.0; // outside the atmosphere
    return exp(-heightFrac * 2.0) * (1. - heightFrac);
}
float fastExpNeg(float x)          { return 1.0/(1.0 + x*(1.0 + 0.5*x)); }
vec3  fastExpNeg(vec3 v)           { return 1.0/(1.0 + v*(1.0 + 0.5*v)); }
vec3 safeExpNeg(vec3 x) { // Padé for x<=8, real exp for bigger values (rare, but at horizon)
    return mix( fastExpNeg(x), exp(-x),      // second arg is native exp
                step(vec3(8.0), x) );        // component-wise compare
}
float safeExpNeg(float x) { // Padé for x<=8, real exp for bigger values (rare, but at horizon)
    return mix( fastExpNeg(x), exp(-x),      // second arg is native exp
                step(8.0, x) );              // component-wise compare
}
float altitude(vec3 p)             { return earth(p); }   // from sdf code
float densRayleigh(float h)        { 
    float rayleighH_WU = RAYLEIGH_H * u_escale; // Rayleigh scale height in world units
    return exp(-h / rayleighH_WU); 
}
float densMie(float h)             { 
    float mieH_WU = MIE_H * u_escale; // Mie scale height in world units
    return exp(-h / mieH_WU); 
}
vec3 betaR() { return RAYLEIGH_BETA / u_escale; } // Rayleigh scattering coefficients in world units
vec3 betaM() { return MIE_BETA / u_escale; } // Mie scattering coefficients in world units
vec3 calculateLightFast(vec3 ro, vec3 rd, float far, vec3 color) {
    float invSteps = 1.0 / float(BIDIR_PTS - 1);
    float stepSize = far * invSteps;
    vec3 scatterLight = O3;
    float viewRayDepth = 0.;
    float t = 0.0; // current distance along the ray
    for (int i = 0; i < SCAT_SAMPLES; i++) {
        vec3 p = ro + rd * t; // current point along the ray
        float viewStep = stepSize * float(i) * invSteps;
        vec3 viewp = p;
        float sunRayLength = raySphereIntersect(p, u_sundir, E_ATM_R * u_escale).y;
        float sunRayDepth = 0.0;
        float sunStep = sunRayLength * invSteps; // step size for sun ray
        vec3 sunp = p; // current point along the sun ray
        for (int j = 0; j < BIDIR_PTS; j++) {
            float viewDensity = densityAtPoint(viewp);
            float sunDensity = densityAtPoint(sunp);
            viewRayDepth += viewDensity * viewStep; // accumulate optical depth
            sunRayDepth += sunDensity * sunStep; // accumulate optical depth
            viewp -= rd * viewStep; // move back along the ray
            sunp += u_sundir * sunStep; // move along the sun ray
        }
        float density = densityAtPoint(p);
        vec3 tau = (viewRayDepth + sunRayDepth) * scatteringCoeffs; // optical depth
        vec3 transmittance = fastExpNeg(tau); // fast approximation of exp(-τ)
        scatterLight += density * transmittance * scatteringCoeffs * stepSize;
        t += stepSize;
    }
    return color * fastExpNeg(viewRayDepth) + scatterLight;
}  
vec3 fastScatter(vec3 ro, vec3 rd, float far, vec3 sunDir, vec3 baseColor) {
    float viewStep = far / float(VIEW_SAMPLES);
    vec3  L        = vec3(0.0);
    float tauR = 0.0, tauM = 0.0;                   // along view ray
    float t = viewStep * MID;                       // first midpoint
    vec3 uBetaR = betaR(); // Rayleigh scattering coefficients in world units
    vec3 uBetaM = betaM(); // Mie scattering coefficients in world units
    vec3 center = u_epos * u_escale; // Earth center in world units
    for (int i = 0; i < VIEW_SAMPLES; ++i)
    {
        vec3  p   = ro + rd * t;
        float hWU = altitude(p);                    // earth(p) in WU
        float dR  = densRayleigh(hWU);
        float dM  = densMie(hWU);
        float atmLenWU   = raySphereIntersect(p, sunDir, center, 
                                   E_ATM_R * u_escale).y;
        float planetLenWU= raySphereIntersect(p, sunDir, center, 
                                   E_R * u_escale).y;
        float sunFade = smoothstep(-2000.0 * u_escale,
                                    2000.0 * u_escale,
                                    atmLenWU - planetLenWU);
        // sunFade = max(sunFade, MIN_SUN_FADE); // ensure sun fade is not too low
        float sunTauR = 0.0, sunTauM = 0.0;
        if (sunFade > 0.001)
        {
            float sunStep = atmLenWU / float(SUN_SAMPLES);
            for (int j = 0; j <= SUN_SAMPLES; ++j)
            {
                float w = (j==0||j==SUN_SAMPLES) ? 1.0
                        : ((j & 1)==1 ? 4.0 : 2.0);
                vec3 sp = p + sunDir * (sunStep*(float(j)+MID));
                float shWU = altitude(sp);
                sunTauR += w * densRayleigh(shWU);
                sunTauM += w * densMie(shWU);
            }
            float norm = sunStep / 3.0 * sunFade;
            sunTauR *= norm;
            sunTauM *= norm;
        }
        tauR += dR * viewStep;
        tauM += dM * viewStep;
        vec3 tau = (tauR + sunTauR) * uBetaR +
                    (tauM + sunTauM) * uBetaM;
        vec3 trans = fastExpNeg(tau);               // ≈exp(-τ)
        L += (dR * uBetaR + dM * uBetaM) *
             trans * viewStep;
        t += viewStep;
    }
    vec3 T_eye = fastExpNeg(tauR*uBetaR + tauM*uBetaM);
    const vec3 SECONDARY = vec3(0.7,0.8,1.0);
    // return baseColor * T_eye + L * 1.1 + SECONDARY * (1.0 - T_eye)*0.03;
    return baseColor * T_eye + L;
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
    vec3 center = u_epos * u_escale; // Earth center in camera space
    vec2 hit = raySphereIntersect(O3, rd, center, E_ATM_R * u_escale); // ray-sphere intersection with atmosphere
    float near = hit.x;
    float throughLen = min(hit.y, dist - near);
    if (throughLen > 0.0) { 
        // Ray hit atmosphere
        vec3 nearPoint = rd * (near + errFactor * near); // near intersection point in camera space
        // color = calculateLightFast(nearPoint, rd, throughLen - errFactor * throughLen, color);
        color = fastScatter(nearPoint, rd, throughLen - errFactor * throughLen, u_sundir, color); // calculate light scattering along the ray
    }
    return color + sunmask; // return the final color
}
void main() {
    vec4 rayNerr = rayNerr(); // get the ray direction and error factor
    vec3 distIterMin = march(rayNerr.xyz, rayNerr.w); // march the ray
    vec3 color = c3d(distIterMin, rayNerr.xyz, rayNerr.w); // get the color from the march
    outColor = vec4(color, 1.0);
}