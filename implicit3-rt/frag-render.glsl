#version 300 es
precision highp float;

in vec2 vXy;
out vec4 fragColor;

uniform float iSeed;
uniform vec2 iResolution;
uniform float iNFrame;

uniform mat4 transformMatrix;
uniform float uScale;
uniform vec3 uClipBox;

uniform float rScale1;
uniform float rScale2;

uniform float ZERO;  // used in loops to reduce compilation time
#define PI 3.1415926

#define ZETA_FAST
#include "../shaders/complex.glsl"

#include "sky_model.glsl"

uniform int uOutput;
#define OUTPUT_RADIANCE 0
#define OUTPUT_ALBEDO 1
#define OUTPUT_WORLD_NORMAL 2
#define OUTPUT_WORLD_POSITION 3
#define OUTPUT_DENOISE_ALBEDO 4
#define OUTPUT_DENOISE_NORMAL 5

// Random number generator
float seed0, seed;
// https://www.shadertoy.com/view/4djSRW
float hash13(vec3 p3) {
	p3  = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}
float randf() {
    seed = floor(mod(75.0*seed+74.0, 65537.)+0.5);
    seed0 += 1.0;
    // return hash13(vec3(seed0));
    return hash13(vec3(seed/65537., seed0, 1));
}


#if {%LIGHT_THEME%} && {%FIELD%}==0
#define BACKGROUND_COLOR vec3(0.82,0.8,0.78)
#else
#define BACKGROUND_COLOR vec3(4e-4, 5e-4, 6e-4)
#endif

#define STEP_SIZE (({%STEP_SIZE%})*(0.5))
#define MAX_STEP int(10.0/(STEP_SIZE))
#define step_size (8.0 * STEP_SIZE * min(min(uClipBox.x, uClipBox.y), uClipBox.z))

#if {%CLOSED%}
#define CLIP_OFFSET (1.0*step_size)
#else
#define CLIP_OFFSET 0.0
#endif

#if {%CLIP%}==1
bool clipIntersection(vec3 ro, vec3 rd, out float tn, out float tf) {
    vec3 inv_rd = 1.0 / rd;
    vec3 n = inv_rd*(ro);
    vec3 k = abs(inv_rd)*uClipBox+CLIP_OFFSET;
    vec3 t1 = -n - k, t2 = -n + k;
    tn = max(max(t1.x, t1.y), t1.z);
    tf = min(min(t2.x, t2.y), t2.z);
    if (tn > tf) return false;
    return true;
}
float clipFunction(vec3 p) {
    vec3 d = abs(p) - uClipBox;
    return max(max(d.x, d.y), d.z);
}
#elif {%CLIP%}==2
bool clipIntersection(vec3 ro, vec3 rd, out float t1, out float t2) {
    vec3 clipBox = uClipBox+CLIP_OFFSET;
	float a = dot(rd/clipBox,rd/clipBox);
	float b = -dot(rd/clipBox,ro/clipBox);
	float c = dot(ro/clipBox,ro/clipBox)-1.0;
	float delta = b*b-a*c;
	if (delta < 0.0) return false;
	delta = sqrt(delta);
	t1 = (b-delta)/a, t2 = (b+delta)/a;
	if (t1>t2) { float t=t1; t1=t2; t2=t;}
	return true;
}
float clipFunction(vec3 p) {
    vec3 d = abs(p) / uClipBox;
    return length(d)-1.0;
}
#endif

vec3 screenToWorld(vec3 p) {
    vec4 q = transformMatrix * vec4(p, 1);
    return q.xyz / q.w;
}
vec3 worldToScreen(vec3 p) {
    vec4 q = inverse(transformMatrix) * vec4(p, 1);
    if (q.w < 0.0) return vec3(-1);
    return q.xyz / q.w;
}


{%FUN%}
#line 113

float getScale1() {
    return rScale1/(1.0-rScale1);
}
float getScale2() {
    return rScale2/(1.0-rScale2);
}

int callCount = 0;
float funRawR(vec3 p) {  // function
    callCount += 1;
#if {%Y_UP%}
    float x=p.x, y=p.z, z=-p.y;
#else
    float x=p.x, y=p.y, z=p.z;
#endif
    float s = getScale1();
    return funRaw(s*x, s*y, s*z);
    // return funRaw(x, y, z).w;
}
float fun(vec3 p) {
#if {%CLOSED%}
    return max(funRawR(p), clipFunction(p));
#else
    return funRawR(p);
#endif
}
float funC(vec3 p, out bool isBoundary) {
    float a = funRawR(p);
    float b = clipFunction(p);
    isBoundary = b > a;
    // return max(a, b);
    return a > b || isnan(a) ? a : b;
}

vec3 funGrad(vec3 p) {
    float h = 0.001*pow(dot(p,p), 1.0/6.0);
  #if 0
    return vec3(
        fun(p+vec3(h,0,0)) - fun(p-vec3(h,0,0)),
        fun(p+vec3(0,h,0)) - fun(p-vec3(0,h,0)),
        fun(p+vec3(0,0,h)) - fun(p-vec3(0,0,h))
    ) / (2.0*h*getScale1());
  #else
    // lower shader compilation time
    vec3 n = vec3(0.0);
    for (float i = ZERO; i < 6.; i++) {
        vec3 e = normalize((1.+2.*cos(2./3.*PI*vec3(i,i+1.,i+2.)))*cos(.6*i));
        n += e * fun(p+e*h);
    }
    return n / (2.0*h*getScale1());
  #endif
}
vec3 funGradC(vec3 p, out bool isBoundary) {
    float h = 0.001*pow(dot(p,p), 1.0/6.0);
  #if 0
    bool b0, b1, b2, b3, b4, b5;
    vec3 r = vec3(
        funC(p+vec3(h,0,0),b0) - funC(p-vec3(h,0,0),b1),
        funC(p+vec3(0,h,0),b2) - funC(p-vec3(0,h,0),b3),
        funC(p+vec3(0,0,h),b4) - funC(p-vec3(0,0,h),b5)
    ) / (2.0*h*getScale1());
    isBoundary = (int(b0)+int(b1)+int(b2)+int(b3)+int(b4)+int(b5)) > 3;
  #else
    // lower shader compilation time
    vec3 r = vec3(0.0);
    float bcount = 0.0;
    for (float i = ZERO; i < 6.; i++) {
        vec3 e = normalize((1.+2.*cos(2./3.*PI*vec3(i,i+1.,i+2.)))*cos(.6*i));
        bool b;
        r += e * funC(p+e*h, b);
        bcount += float(b);
    }
    r /= (2.0*h*getScale1());
    isBoundary = bcount > 3.0;
  #endif
    return r;
}


uniform vec3 LDIR;
#define OPACITY 0.6

// calculate the color at one point, parameters are in screen space
float grid1(vec3 p, vec3 n, float w) {
    vec3 a = 1.0 - abs(1.0-2.0*fract(p));
    a = clamp(2.*a/w-sqrt(1.-n*n), 0., 1.);
    // return min(min(a.x,a.y),a.z);
    return ((a.x+1.)*(a.y+1.)*(a.z+1.)-1.)/7.;
}
float grid(vec3 p, vec3 n) {
    float scale = 2.5 / dot(inverse(transpose(transformMatrix))[3], vec4(p, 1));
    float ls = log(scale) / log(10.);
    float fs = pow(ls - floor(ls), 1.0);
    float es = pow(10., floor(ls));
    vec3 q0 = es*p;
    vec3 q1 = 10.*q0;
    vec3 q2 = 10.*q1;
    float w0 = .05*es/scale;
    float w1 = mix(1.,10.,fs)*w0;
    float g0 = grid1(q0, n, w0);
    float g1 = grid1(q1, n, w1);
    float g2 = grid1(q2, n, w1);
    return min(min(mix(0.65, 1.0, g0), mix(mix(0.8,0.65,fs), 1.0, g1)), mix(mix(1.0,0.8,fs), 1.0, g2));
}
vec3 calcAlbedo(vec3 p, vec3 n0, bool isBoundary) {
    vec3 n = normalize(n0);
#if {%Y_UP%}
    n0 = vec3(n0.x, n0.z, -n0.y);
#endif // {%Y_UP%}
    float g = bool({%GRID%}) ? 1.1*grid(p, n) : 1.1;
    if (isBoundary)
        return vec3(0.9*g);
#if {%COLOR%} == 0
    // return g * vec3(1, 0.5, 0.2);
    return vec3(clamp(0.8*g, 0.0, 1.0));
#else // {%COLOR%} == 0
#if {%COLOR%} == 1
    // color based on normal
    vec3 albedo = mix(vec3(1.0), normalize(n0), 0.45);
    albedo /= 1.2*pow(dot(albedo, vec3(0.299,0.587,0.114)), 0.4);
#elif {%COLOR%} == 2
    // heatmap color based on gradient magnitude
    float grad = 0.5-0.5*cos(PI*log(length(n0))/log(10.));
    vec3 albedo = vec3(.372,.888,1.182) + vec3(.707,-2.123,-.943)*grad
        + vec3(.265,1.556,.195)*cos(vec3(5.2,2.48,8.03)*grad-vec3(2.52,1.96,-2.88));
#endif // {%COLOR%} == 1
    albedo *= g;
    return pow(albedo, vec3(1.5));
#endif // {%COLOR%} == 0
}

#define FIELD_EMISSION (0.25*(bool({%CLIP%}) ? clamp(4.0/(uScale*length(uClipBox)),1.0,10.0) : 1.0))
#define ISOSURFACE_FREQUENCY 10.0
#define DISCONTINUITY_OPACITY 10.0
#define SURFACE_GRADIENT 10.0

vec3 colorField(float v) {
    float t = 0.5+0.5*sin(ISOSURFACE_FREQUENCY*PI*0.5*v);
    float r = .385+.619*t+.238*cos(4.903*t-2.61);
    float g = -5.491+.959*t+6.089*cos(.968*t-.329);
    float b = 1.107-.734*t+.172*cos(6.07*t-2.741);
    return clamp(vec3(r, g, b), 0.0, 1.0);
}

void integrateField(float v0, float v1, vec3 c0, vec3 c1, out vec3 col, out float absorb) {
    if (isnan(v0+v1) || isinf(v0+v1)) {
        col = vec3(0,1,0);
        absorb = 0.1;
        return;
    }
    absorb = FIELD_EMISSION;
    vec3 cm = colorField(0.5*(v0+v1));
    col = (c0+c1+4.0*cm)/6.0;
    col = pow(col, vec3(6));
}


float intersectObject(in vec3 ro, in vec3 rd, float t0, inout float t1, out vec3 col, out vec3 n, out float totalv) {
    rd = normalize(rd);
    float t0_, t1_;
    if (!clipIntersection(ro, rd, t0_, t1_))
        { t1 = 0.0; return -1.0; }
    t0 = max(t0, t0_), t1 = min(t1, t1_);
    if (t1 < t0)
        { t1 = 0.0; return -1.0; }
    // raymarching - https://www.desmos.com/calculator/mhxwoieyph
    totalv = 0.0;
    float t = t0, dt = step_size;
    float v = 0.0, v0 = v, v00 = v, v1;
    float dt0 = 0.0, dt00 = 0.0;
    float dvdt, old_dvdt;  // discontinuity checking
    bool isBisecting = false;
    int i = int(ZERO);
    vec3 totemi = vec3(0.0);
    float totabs = 1.0;
    float prevField = 0.0; vec3 prevFieldCol;
    float tfar = t1;
    bool isDiscontinuity = false;
    while (true) {
        if (++i >= MAX_STEP || t > tfar) {
            return -1.0;
        }
        v = fun(ro+rd*t);
        if (isBisecting) {  // bisection search
            // if (t1-t0 <= step_size/64.) break;
            if (t1-t0 <= 1e-4) {
                t = t0 - v0/(v1-v0) * (t1-t0);
                break;
            }
            if (v*v0 < 0.0) t1 = t, v1 = v;
            else t0 = t, v0 = v;
            t = 0.5*(t0+t1);
#if {%DISCONTINUITY%}
            dvdt = abs((v1-v0)/(t1-t0));
            if (abs(t1-t0) < 1e-4 && dvdt > 1.8*old_dvdt) {
                col = vec3(1,0,0);
                if (bool({%GRID%}))
                    col *= grid(ro+rd*t, vec3(sqrt(0.33)));
                isDiscontinuity = true;
                break;
            }
            old_dvdt = dvdt;
#endif
        }
        else if (v*v0 < 0.0) {  // switch from raymarching to to bisection
            isBisecting = true;
            t1 = t, v1 = v, t = 0.5*(t0+t1);
            old_dvdt = abs((v1-v0)/(t1-t0));
        }
        else {  // raymarching
            if (!isnan(v) && !isinf(v))
                totalv += sign(v);
            if (isnan(dt0) || dt0 <= 0.0) v00 = v, v0 = v, dt0 = dt00 = 0.0;
            float g = dt0 > 0.0 ? ( // estimate gradient
                dt00 > 0.0 ? // quadratic fit
                    v00*dt0/(dt00*(dt0+dt00))-v0*(dt0+dt00)/(dt0*dt00)+v*(2.*dt0+dt00)/(dt0*(dt0+dt00))
                    : (v-v0)/dt0  // finite difference
            ) : 0.;
#if {%FIELD%}
            // field
            float field = {%FIELD%}==1 ? 2.0*v*uScale : log(abs(v))/log(10.);
            vec3 fieldCol = colorField(field);
            if (i > 1) {
                vec3 col; float absorb;
                integrateField(prevField, field, prevFieldCol, fieldCol, col, absorb);
                totabs *= exp(-absorb*dt);
                totemi += col*absorb*totabs*dt;
            }
            prevField = field, prevFieldCol = fieldCol;
#endif
            // update
            dt00 = dt0, dt0 = dt, t0 = t, v00 = v0, v0 = v;
            float ddt = abs(v/g);
            dt = (ddt > step_size || isnan(ddt) || isinf(ddt)) ? step_size :
                clamp(min(ddt-step_size, tfar-t0-0.01*step_size), 0.05*step_size, step_size);
            if (i == 1) dt *= randf();
            t += dt;
        }
    }
    bool isBoundary = false;
    #if {%CLOSED%}
        vec3 grad = funGradC(ro+rd*t, isBoundary);
    #else
        vec3 grad = funGrad(ro+rd*t);
    #endif
    if (!isDiscontinuity)
        col = calcAlbedo(ro+rd*t, grad, isBoundary);
    n = normalize(grad);
    return t;
}



// define materials
const int MAT_NONE = -1;
const int MAT_BACKGROUND = 0;
const int MAT_SCATTER = 1;
const int MAT_PLANE = 2;
const int MAT_OBJECT = 3;



// Faked multi-scattering BRDF

vec3 sampleBrdf(
    vec3 wi, vec3 n,
    float alpha,  // roughness
    float f0,  // ratio of reflection along the normal
    vec3 albedo,
    inout vec3 m_col
    ) {

    vec3 u = normalize(cross(n, vec3(1.23, 2.34, -3.45)));
    vec3 v = cross(u, n);
    wi = vec3(dot(wi, u), dot(wi, v), dot(wi, n));
    vec3 wi0 = wi, wo, m;  // in, out and half vector

    // generate output ray
    for (int i = 0; i < 4; i++) {
        // generate a random GGX normal
        float su = 2.*PI*randf();
        float sv = randf();
        sv = atan(alpha*sqrt(sv/(1.-sv)));
        vec3 h = vec3(sin(sv)*vec2(cos(su),sin(su)), cos(sv));
        // reflect it about the GGX normal
        wo = -(wi-2.*dot(wi,h)*h);
        // if below surface, set it as the new in vector,
        // keep bouncing until it gives a good one
        if (wo.z < 0.) wi = -wo;
        else break;
    }
    wo.z = abs(wo.z);  // prevent below surface
    wi = wi0;
    m = normalize(wi+wo);

    // fresnel
    float F = mix(pow(1.-dot(wi, m), 5.), 1., f0);
    m_col *= F * albedo;
    return wo.x * u + wo.y * v + wo.z * n;
}

vec3 sampleGlassBsdf(vec3 rd, vec3 n, float eta) {
    float ci = -dot(n, rd);
    if (ci < 0.0) ci = -ci, n = -n;
    float ct = 1.0 - eta * eta * (1.0 - ci * ci);
    if (ct < 0.0) return rd + 2.0*ci*n;
    ct = sqrt(ct);
    float Rs = (eta * ci - ct) / (eta * ci + ct);
    float Rp = (eta * ct - ci) / (eta * ct + ci);
    float R = 0.5 * (Rs * Rs + Rp * Rp);
    return randf() > R ?
        rd * eta + n * (eta * ci - ct)  // refraction
        : rd + 2.0*ci*n;  // reflection
}

vec3 sampleRoughGlassBsdf(
    vec3 wi, vec3 n,
    float alpha,  // roughness
    float eta
    ) {

    vec3 u = normalize(cross(n, vec3(1.23, 2.34, -3.45)));
    vec3 v = cross(u, n);
    wi = vec3(dot(wi, u), dot(wi, v), dot(wi, n));

    // generate a random GGX normal
    float su = 2.*PI*randf();
    float sv = randf();
    sv = atan(alpha*sqrt(sv/(1.-sv)));
    vec3 h = vec3(sin(sv)*vec2(cos(su),sin(su)), cos(sv));
    // prevent below surface
    if (dot(wi, h) * wi.z < 0.0) h = -h;

    vec3 wo = sampleGlassBsdf(-wi, h, eta);
    return wo.x * u + wo.y * v + wo.z * n;
}

// volume

vec3 sampleUniformSphere() {
    float u = 2.0*PI*randf();
    float v = 2.0*randf()-1.0;
    return vec3(vec2(cos(u), sin(u))*sqrt(1.0-v*v), v);
}

vec3 sampleHenyeyGreenstein(vec3 wi, float g) {
    if (g == 0.0) return sampleUniformSphere();
    if (g >= 1.0) return wi;
    if (g <= -1.0) return -wi;
    float us = randf();
    float vs = 2.0*PI*randf();
    float z = (1.0+g*g-pow((1.0-g*g)/(2.0*g*(us+(1.0-g)/(2.0*g))),2.0))/(2.0*g);
    vec2 xy = vec2(cos(vs), sin(vs)) * sqrt(1.0-z*z);
    vec3 u = normalize(cross(wi, vec3(1.2345, 2.3456, -3.4561)));
    vec3 v = cross(u, wi);
    vec3 wo = normalize(xy.x*u + xy.y*v + z*wi);
    return wo;
}


uniform float rOpacity;
uniform float rIor;
uniform float rRoughness1;
uniform float rRoughness2;
uniform float rEmission1;
uniform float rEmission2;
uniform float rAbsorb1;
uniform float rAbsorb2;
uniform float rScatter1;
uniform float rScatter2;
uniform float rVDecayAbs;
uniform float rVDecaySca;
uniform float rVAbsorbHue;
uniform float rVAbsorbChr;
uniform float rVAbsorbBri;

uniform float rLightIntensity;
uniform float rLightSky;
uniform float rLightAmbient;
uniform float rLightSoftness;
uniform float rLightHardness;

vec3 getAbsorbColor() {
    float h = 2.0*PI*rVAbsorbHue;
    float c = 0.2*pow(rVAbsorbChr, 2.0);
    float l = 1.0-1.0*c;
    // h = 2.0*PI*0.55, c = 0.036, l = 0.97;
    float alpha = c*cos(h);
    float beta = c*sin(h);
    vec3 col = mat3(0.6667, -0.3333, -0.3333, 0, 0.5774, -0.5774, 1, 1, 1)
        * vec3(alpha, beta, l);
    // return vec3(0.95, 0.98, 0.99);
    col = clamp(0.99*col, 0.0, 0.995);
    return pow(col, vec3(0.5));
}

vec3 mainRender(vec3 ro, vec3 rd) {
    vec3 m_col = vec3(1.0), t_col = vec3(0.0), col, tmpcol;
    vec3 prev_col = vec3(1.0);
    rd = normalize(rd);

    bool is_inside = false;

    for (float iter = ZERO; iter < 32.; iter++) {
        if (iter != 0.) ro += 1e-4*length(ro) * rd;
        vec3 n, min_n = vec3(0);
        float t, min_t = 1e6;
        vec3 min_rd = rd, min_ro = ro+1e6*rd;
        int material = MAT_BACKGROUND;

        // plane
        t = -(ro.z+uClipBox.z) / rd.z;
        if (t > 0.0) {
            min_t = t, min_n = vec3(0,0,1);
            min_ro = ro+rd*t, min_rd = rd;
            float s = getScale2();
            col = sin(s*PI*min_ro.x)*sin(s*PI*min_ro.y) < 0. ?
                vec3(0.9) : vec3(0.7);
            col = pow(col, vec3(2.2));
            material = MAT_PLANE;
        }

        // object
        float totalv;
        float clip_t1 = min_t;
        t = intersectObject(ro, rd, 0.0, clip_t1, tmpcol, n, totalv);
        if (t > 0.0 && t < min_t) {
            min_t = t, min_n = n;
            min_ro = ro+rd*t, min_rd = rd;
            col = tmpcol;
            material = MAT_OBJECT;
        }
        if (bool({%CLOSED%}))
            is_inside = (totalv < 0.0);

        // absorption and scattering
        if (is_inside) {
            float A_abs = rAbsorb1/(1.0-rAbsorb1);
            float A_sca = pow(rScatter1, 0.5); A_sca = 0.5*A_sca/(1.0-A_sca);
            // scattering
            float r = randf();
            float tsc = -log(r) / A_sca;
            vec3 colmid = 0.5*(prev_col+col);
            if (tsc < min_t && uOutput == OUTPUT_RADIANCE) {
                min_t = tsc, min_n = vec3(0);
                min_ro = ro+rd*tsc, min_rd = rd;
                colmid = mix(prev_col, col, tsc/min_t);
                col = prev_col;
                material = MAT_SCATTER;
            }
            // absorption
            float absorb = A_abs*min(min_t,clip_t1);
            m_col *= pow(clamp(colmid, 0.0, 1.0), vec3(absorb));
        }
        else {
            // density A0 exp(-k0 z)
            //      = A0 exp(-k0 (ro.z + rd.z t))
            //      = (A0 exp(-k0 ro.z)) exp(-k0 rd.z t)
            //      = A exp(-k t)
            // total absorption density A/k (1-exp(-kt))
            // scattering p(t) = exp( -A/k (1-exp(-kt)) ),
            //      from 1 to exp(-A/k)
            float k0_abs = pow(rVDecayAbs, 0.8); k0_abs = 0.2 / (k0_abs/(1.0-k0_abs));
            float k0_sca = pow(rVDecaySca, 1.0); k0_sca = 1.0 / (k0_sca/(1.0-k0_sca));
            float A0_abs = rAbsorb2/(1.0-rAbsorb2);
            float A0_sca = 1.0-pow(1.0-rScatter2,2.0); A0_sca = 0.01*A0_sca/(1.0-A0_sca) / (0.1*k0_sca);
            float z0 = -uClipBox.z;
            float A_abs = A0_abs * exp(-k0_abs*(ro.z-z0));
            float A_sca = A0_sca * exp(-k0_sca*(ro.z-z0));
            float k_abs = k0_abs * rd.z;
            float k_sca = k0_sca * rd.z;
            // scattering
            // floating point bad here - large scattering with small decay
            // https://www.desmos.com/calculator/wo63zpczge
            // if this is fixed we can increase k0_sca for "thin snow" effect
            float r = randf();
            if ((r > exp(-A_sca/k_sca) || k_sca < 0.0)
                && uOutput == OUTPUT_RADIANCE) {
                float tsc = -log(1.0+k_sca/A_sca*log(r))/k_sca;
                if (tsc < min_t) {
                    min_t = tsc, min_n = vec3(0);
                    min_ro = ro+rd*tsc, min_rd = rd;
                    col = prev_col;
                    material = MAT_SCATTER;
                }
            }
            // absorption
            float absorb = A_abs / k_abs * (1.0-exp(-k_abs*min_t));
            m_col *= pow(getAbsorbColor(), vec3(absorb));
        }

        // buffer
        if (uOutput == OUTPUT_WORLD_NORMAL ||
            uOutput == OUTPUT_DENOISE_NORMAL)
            return isnan(dot(min_n,vec3(1))) ? vec3(0) : min_n;
        if (uOutput == OUTPUT_WORLD_POSITION)
            return min_ro;
        if (uOutput == OUTPUT_ALBEDO ||
            uOutput == OUTPUT_DENOISE_ALBEDO)
            return material == MAT_BACKGROUND ?
                vec3(0) : m_col * col;

        // update ray
        if (material == MAT_BACKGROUND) {
            float intensity = pow(2.0*rLightIntensity,2.0);
            float soft = pow(rLightSoftness, 4.0);
            // https://www.desmos.com/3d/750cc71ae5
            float k1 = 1.0 / soft;
            float k2 = 1.52004*sqrt(soft) - 0.379175*(soft);
            col = mix(vec3(1)*mix(
                0.5*(k1+1.0)*pow(0.5+0.5*dot(rd,LDIR),k1),
                dot(rd,LDIR)>cos(k2) ? 1.0/(1.0-cos(k2)) : 0.0,
                rLightHardness), vec3(0.5), rLightAmbient);
            vec3 sky = skyColor(vec3(rd.x,rd.z,-rd.y), vec3(LDIR.x,LDIR.z,-LDIR.y));
            col = intensity * mix(col, sky, rLightSky);
            return m_col * col + t_col;
        }
        if (isnan(dot(min_n, col))) {
            return m_col * vec3(0,1,0) + t_col;  // this glows, should fix it
        }
        ro = min_ro, rd = min_rd;
        min_n = dot(rd,min_n) < 0. ? min_n : -min_n;
        if (material == MAT_SCATTER) {
            // isotropic scattering
            rd = sampleUniformSphere();
        }
        else if (material == MAT_PLANE) {
            // rd -= 2.0*dot(rd, min_n) * min_n, m_col *= col;
            t_col += rEmission2 * m_col * col;
            rd = sampleBrdf(-rd, min_n, pow(rRoughness2,2.0), 1.0, col, m_col);
        }
        else if (material == MAT_OBJECT) {
            col = pow(clamp(col,0.0,1.0), vec3(rAbsorb1/(1.0-rAbsorb1)));
            t_col += rEmission1 * m_col * col;
            float alpha = pow(rRoughness1,2.0);
            // rd -= 2.0*dot(rd, min_n) * min_n, m_col *= col;
            if (randf() > rOpacity) {
                float eta = is_inside?rIor:1.0/rIor;
                // rd = sampleGlassBsdf(rd, min_n, eta);
                rd = sampleRoughGlassBsdf(-rd, min_n, alpha, eta);
                if (is_inside) {
                    vec3 col = clamp(0.5*(prev_col+col), vec3(0), vec3(1));
                    // m_col *= pow(col, vec3(1.0*min_t));
                }
            } else {
                rd = sampleBrdf(-rd, min_n, alpha, 1.0, col, m_col);
            }
        }
        prev_col = col;
        if (dot(rd, min_n) < 0.0)
            is_inside = !is_inside;
    }
    // return m_col + t_col;
    return t_col;
}


uniform float ry;
uniform float rExposure;
uniform float rCameraDistortion;
uniform float rFocalLength;
uniform float rApertureSize;
uniform float rApertureShape;
uniform float rApertureRotate;

// https://www.shadertoy.com/view/7lGXWK
vec2 randPointInsideCircle(float r1, float r2) {
    float u = 2.0*PI*r1;  // θ
    float v = sqrt(r2);  // r
    return v*vec2(cos(u), sin(u));
}
vec2 randPointInsideHeart(float r1, float r2) {
    float u = 2.0*PI*r1;  // θ
    float v = sqrt(r2);  // r
    vec2 c = v*vec2(cos(u), sin(u));  // unit circle
    c = mat2(1.0,1.0,-0.577,0.577)*c;  // ellipse
    if (c.x<0.0) c.y=-c.y;  // mirror
    return 0.939695*(c-vec2(0,0.245035));
}
vec2 randomPointInsideRegularPolygon(float n, float r1, float r2) {
    float u = n*r1;
    float v = r2;
    float ui = floor(u);  // index of triangle
    float uf = fract(u);  // interpolating in triangle
    vec2 v0 = vec2(cos(2.*PI*ui/n), sin(2.*PI*ui/n));  // triangle edge #1
    vec2 v1 = vec2(cos(2.*PI*(ui+1.)/n), sin(2.*PI*(ui+1.)/n));  // triangle edge #2
    float a = 0.5*n*sin(2.0*PI/n);
    return sqrt(v*PI/a) * mix(v0, v1, uf);  // sample inside triangle
}
vec2 randomPointInsideAperture() {
    float r1 = randf(), r2 = randf();
    float size = 1.0 / (50.0 * (1.0-rApertureSize) / rApertureSize);
    float rotate = rApertureRotate+ry;
    mat2 m = mat2(cos(rotate), sin(rotate),
                 -sin(rotate), cos(rotate));
    float shape = 1.0 + 7.99 * rApertureShape;
    vec2 p = shape < 2.0 ? randPointInsideCircle(r1, r2) :
        shape < 3.0 ? randPointInsideHeart(r1, r2) :
        randomPointInsideRegularPolygon(floor(shape), r1, r2);
    return size * m * p;
}

void main(void) {
    float focal = length(screenToWorld(vec3(0)));
    focal *= 1.0 + 0.5 * (rFocalLength-0.5) / (rFocalLength*(1.0-rFocalLength));

    vec4 totcol = vec4(0);
    for (float fi=ZERO; fi<iNFrame; fi++) {
        // random number seed
        seed0 = hash13(vec3(gl_FragCoord.xy/iResolution.xy, sin(iSeed+fi/iNFrame)));
        seed = round(65537.*seed0);

        vec2 ro_s = vXy;
        ro_s += (-1.0+2.0*vec2(randf(), randf())) / iResolution.xy;
        vec2 ro_sc = worldToScreen(vec3(0)).xy;
        // float distort = 1.0/(1.0-rCameraDistortion) - 2.0;
        float distort = -2.0*rCameraDistortion+1.0;
        ro_s = ro_sc + (ro_s-ro_sc)/(1.0+distort*0.5*dot(ro_s,ro_s));
        vec3 ro = screenToWorld(vec3(ro_s,0));
        vec3 rd = normalize(screenToWorld(vec3(ro_s,0)+vec3(0,0,1))-ro);
        vec3 ru = normalize(screenToWorld(vec3(ro_s,0)+vec3(1,0,0))-ro);
        vec3 rv = normalize(screenToWorld(vec3(ro_s,0)+vec3(0,1,0))-ro);
        vec2 offset = randomPointInsideAperture();
        vec3 dp = offset.x * ru + offset.y * rv;
        rd = normalize(rd - dp);
        ro = ro + focal*dp;

        vec3 col = mainRender(ro, rd);
        col *= pow(rExposure/(1.0-rExposure), 2.2);
        if (!isnan(dot(col, vec3(1)))) {
            if (uOutput == OUTPUT_DENOISE_ALBEDO)
                totcol = vec4(col, length(col));
            else if (uOutput == OUTPUT_DENOISE_NORMAL) {
                float u = dot(col, ru), v = dot(col, rv), w = dot(col, rd);
                totcol = vec4(u, v, w, u*u+v*v);
            }
            else totcol += vec4(col, 1) / iNFrame;
        }
    }
    fragColor = totcol;
}
