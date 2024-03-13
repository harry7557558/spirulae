#version 300 es
precision highp float;

in vec2 vXy;
uniform sampler2D accumBuffer;
out vec4 fragColor;

uniform float iSeed;
uniform vec2 iResolution;
uniform float iSpp;
uniform float sSamples;

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


#ifdef CUSTOM_COLOR

vec3 aces(vec3 x) {
    x = max(x, 0.0);
    x = x*(2.51*x+0.03)/(x*(2.43*x+0.59)+0.14);
    return clamp(x, 0.0, 1.0);
}
vec3 rgb2rgb(vec3 rgb) {
    // return max(rgb, 0.0);
    return aces(rgb);
    return clamp(rgb, 0.0, 1.0);
}
vec3 hsv2rgb(vec3 hsv) {
    hsv.yz = clamp(hsv.yz, 0.0, 0.9999);
    float c = hsv.y * hsv.z;
    float h = mod(hsv.x/(2.0*PI)*6.0, 6.0);
    float x = c * (1.0 - abs(mod(h, 2.0) - 1.0));
    float m = hsv.z - c;
    vec3 rgb;
    if (h < 1.0) rgb = vec3(c, x, 0.0);
    else if (h < 2.0) rgb = vec3(x, c, 0.0);
    else if (h < 3.0) rgb = vec3(0.0, c, x);
    else if (h < 4.0) rgb = vec3(0.0, x, c);
    else if (h < 5.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
}
vec3 hsl2rgb(vec3 hsl) {
    hsl.yz = clamp(hsl.yz, 0.0, 0.9999);
    float c = (1.0 - abs(2.0 * hsl.z - 1.0)) * hsl.y;
    float h = mod(hsl.x/(2.0*PI)*6.0, 6.0);
    float x = c * (1.0 - abs(mod(h, 2.0) - 1.0));
    float m = hsl.z - 0.5 * c;
    vec3 rgb;
    if (h < 1.0) rgb = vec3(c, x, 0.0);
    else if (h < 2.0) rgb = vec3(x, c, 0.0);
    else if (h < 3.0) rgb = vec3(0.0, c, x);
    else if (h < 4.0) rgb = vec3(0.0, x, c);
    else if (h < 5.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + vec3(m, m, m);
}

vec3 funColor(vec3 p) {
#if {%Y_UP%}
    float x=p.x, y=p.z, z=-p.y;
#else
    float x=p.x, y=p.y, z=p.z;
#endif
    float s = getScale1();
    vec3 c = funRawColor(s*x, s*y, s*z);
    return CUSTOM_COLOR(c);
}

#else  // CUSTOM_COLOR

vec3 funColor(vec3 p) {
    return vec3(0);
}

#endif  // CUSTOM_COLOR


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
#ifdef CUSTOM_COLOR
    return funColor(p) * pow(g, 1.5);
#endif
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
const int MAT_BSDF = 2;
const int MAT_PLANE = 3;
const int MAT_OBJECT = 4;



// Faked multi-scattering BRDF

float chi(float x) {
    return (x > 0.) ? 1. : 0.;
}


// GGX and Fresnel
float ggxDistribution(float alpha, vec3 m) {
    if (m.z<0.0) return 0.0;
    float denom = (alpha*alpha-1.)*m.z*m.z+1.;
    return alpha*alpha / (PI * denom*denom);
}
float ggxLambda(float alpha, vec3 w) {
    float tan2_theta = (1.0-w.z*w.z)/(w.z*w.z);
    return 0.5*(sqrt(1.0+alpha*alpha*tan2_theta)-1.0);
}
float ggxG1dist(float alpha, vec3 w) {
    return 1.0/(1.0+ggxLambda(alpha,w));
}
float ggxGeometry(float alpha, vec3 wi, vec3 wo, vec3 m) {
    if (wi.z*dot(wi,m) < 0.0) return 0.0;
    if (wo.z*dot(wo,m) < 0.0) return 0.0;
    //return 1.0/(1.0+ggxLambda(alpha,wi)) * 1.0/(1.0+ggxLambda(alpha,wo));
    return 1.0 / (1.0+ggxLambda(alpha,wi)+ggxLambda(alpha,wo));
}
float ggxFresnel(float eta, float k, float c) {
    c = clamp(c, -1.0, 1.0);
#if 1
    return (pow(eta-1.0,2.0)+4.0*eta*pow(1.0-abs(c),5.0)+k*k) / (pow(eta+1.0,2.0)+k*k);
#else
    // https://seblagarde.wordpress.com/2013/04/29/memo-on-fresnel-equations/#more-1921
    float c2 = c*c, s2 = 1.0-c2;
    float eta2 = eta*eta, k2 = k*k;
    float t0 = eta2-k2-s2;
    float a2b2 = sqrt(t0*t0+4.0*eta2*k2);
    float t1 = a2b2+c2;
    float a = sqrt(0.5*(a2b2+t0));
    float t2 = 2.0*a*c;
    float Rs = (t1-t2)/(t1+t2);
    float t3 = c2*a2b2+s2*s2;
    float t4 = t2*s2;
    float Rp = Rs*(t3-t4)/(t3+t4);
    return 0.5*(Rp+Rs);
#endif
}


struct Material {
    int bsdf;  // MAT_SCATTER or MAT_BSDF
    vec3 albedo;  // albedo color
    vec3 emission;  // emission color and strength
    float roughness;  // roughness, 0-1
    float metallic;  // metal factor, 0-1
    float diffuse;  // diffuse factor, 0-1
    float tint;  // opaque specular reflection tint
    float opacity;  // linear blending between opaque and refractive, 0-1
    float eta;  // index of reflection ratio
    float eta_k;  // extinction coefficient
    float anisotropy;  // for scattering only
};


// generate orthonormal basis
// https://graphics.pixar.com/library/OrthonormalB/paper.pdf
void onb(vec3 n, out vec3 b1, out vec3 b2){
	float s = n.z>=0.0 ? 1. : -1.;
	float a = -1.0/(s+n.z);
	float b = n.x*n.y*a;
	b1 = vec3(1.0+s*n.x*n.x*a, s*b, -s*n.x);
	b2 = vec3(b, s+n.y*n.y*a, -n.y);
}

vec3 sampleUniformSphere();
vec3 sampleUniformSolidAngle(float alpha);

#define STDEV 0.01
float sampleHeight(float h, vec3 w) {
    if (w.z > 0.0) return 10.0*STDEV;
    return 0.0;
}

#define RANDOM_WALK_DEPTH 8.0

vec3 ggxSampleNormal(float alpha) {
    float r1 = randf(), r2 = randf();
    float su = 2.0*PI*r2;
    float sv = atan(alpha*sqrt(r1/(1.0-r1)));
    return vec3(sin(sv)*vec2(cos(su),sin(su)),cos(sv));
}

float pConductor(Material m, vec3 wi, vec3 wo) {
    if (wi.z*wo.z < 0.0)
        return 0.0;
    vec3 hr = normalize(wi+wo);
    float G = ggxDistribution(m.roughness,hr);
    float F = ggxFresnel(m.eta, m.eta_k, dot(wi,hr));
    return F * G / (4.0*abs(dot(wi,hr)));
    return G / (4.0*abs(dot(wi,hr)));
}
float pConductorWithFresnel(Material m, vec3 wi, vec3 wo) {
    if (wi.z*wo.z < 0.0)
        return 0.0;
    vec3 hr = normalize(wi+wo);
    float G = ggxDistribution(m.roughness,hr);
    float F = ggxFresnel(m.eta, m.eta_k, dot(wi,hr));
    return F * G / (4.0*abs(dot(wi,hr)));
}

vec4 sampleBsdfConductor(Material m, vec3 wi) {
    float h = 5.*STDEV;
    float e = 1.;
    vec3 w0, w = -wi;
    for (float r = ZERO; r < RANDOM_WALK_DEPTH; r++) {
        h = sampleHeight(h, w);
        if(abs(h) > 5.*STDEV)
            break;
        vec3 hr = ggxSampleNormal(m.roughness);
        e *= ggxFresnel(m.eta, m.eta_k, dot(w,hr));
        w = reflect(w,hr);
    }
    return vec4(w, e);
}

float evalBsdfConductor(Material m, vec3 wi, vec3 wo) {
    float alpha = m.roughness;
    float h = 5.*STDEV;
    float e = 1.;
    vec3 w = -wi;
    float total = 0.0;
    for (float r = ZERO; r < RANDOM_WALK_DEPTH; r++) {
        h = sampleHeight(h, w);
        if(abs(h) > 5.*STDEV)
            break;
        vec3 hr = ggxSampleNormal(m.roughness);
        vec3 w1 = reflect(w,hr);
        total += e * pConductor(m,-w,wo) * ggxG1dist(alpha,w1);
        e *= ggxFresnel(m.eta, m.eta_k, dot(w,hr));
        w = w1;
    }
    return total * (4.0*PI);
}


float pDielectric(Material m, vec3 wi, vec3 wo) {
    float refl = pConductorWithFresnel(m,wi,wo);
    if (wo.z*wi.z>0.0) return refl;
    vec3 ht = normalize(wi+m.eta*wo)*sign(1.0-m.eta);
    if (dot(wo,ht)>0.0) return refl;
    float D = ggxDistribution(m.roughness,ht);
    float F = ggxFresnel(m.eta,m.eta_k,dot(wi,ht));
    float refr = m.eta*m.eta * (1.0-F) * D / (pow(dot(wi,ht)+m.eta*dot(wo,ht),2.0)+1e-4);
    return refl + refr;
}

vec4 sampleBsdfDielectric(Material m, vec3 wi) {
    float h = 5.*STDEV;
    vec3 w = -wi;
    float transmit = 1.0;
    for (float r = ZERO; r < RANDOM_WALK_DEPTH; r++) {
        h = sampleHeight(h, w*transmit);
        if(abs(h) > 5.*STDEV)
            break;
        vec3 wm = ggxSampleNormal(m.roughness);
        float F = ggxFresnel(m.eta, 0.0, dot(w,wm));
        vec3 w1 = refract(w,wm,1.0/m.eta);
        if (w1==vec3(0) || randf()<F)
            w1 = reflect(w,wm);
        else transmit *= -1.0;
        w = w1;
    }
    return vec4(w, 1.0);
}

float evalBsdfDielectric(Material m, vec3 wi, vec3 wo) {
    float alpha = m.roughness;
    float h = 5.*STDEV;
    vec3 w = -wi;
    float transmit = 1.0;
    float total = 0.0;
    for (float r = ZERO; r < RANDOM_WALK_DEPTH; r++) {
        h = sampleHeight(h, w*transmit);
        if(abs(h) > 5.*STDEV)
            break;
        vec3 wm = ggxSampleNormal(m.roughness);
        float F = ggxFresnel(m.eta, 0.0, dot(w,wm));
        vec3 w1 = refract(w,wm,1.0/m.eta);
        if (w1==vec3(0) || randf()<F)
            w1 = reflect(w,wm);
        else transmit *= -1.0;
        total += pDielectric(m,-w,wo) * ggxG1dist(alpha,w1);
        w = w1;
    }
    return total * (4.0*PI);
}

vec3 sampleBsdf0(Material m, vec3 wi, out vec3 w) {
    vec4 wod;
    if (randf() < m.opacity) {
        w = m.albedo;
        wod = sampleBsdfConductor(m, wi);
        float F = ggxFresnel(m.eta, m.eta_k, wod.z);
        float diffuse_amount = 1.0-F;
        float p = clamp(diffuse_amount,0.001,0.999);
        if (randf() < p) {
            wod.xyz = sampleUniformSolidAngle(0.5*PI);
            wod.w = 0.5*PI * wod.z * diffuse_amount / p;
        }
        else {
            wod.w /= 1.0-p;
            w = mix(vec3(1), w, m.tint);
        }
    }
    else {
        w = vec3(1);
        wod = sampleBsdfDielectric(m, wi);
    }
    w *= wod.w;
    return wod.xyz;
}
vec3 evalBsdf0(Material m, vec3 wi, vec3 wo) {
    vec3 r = evalBsdfConductor(m, wi, wo) * mix(vec3(1), m.albedo, m.tint);
    if (wi.z*wo.z > 0.0) {
        float F = ggxFresnel(m.eta, m.eta_k, wo.z);
        r += PI * (1.0-F) * abs(wo.z) * m.albedo;
    }
    vec3 t = evalBsdfDielectric(m, wi, wo) * vec3(1);
    return mix(t, r, m.opacity);
}

vec3 sampleBsdf(
    Material m, vec3 wi, vec3 n, inout vec3 m_col
) {
    // m.albedo = pow(m.albedo, vec3(2.2));

    if (dot(wi, n) < 0.0) n = -n;
    vec3 u, v; onb(n, u, v);
    wi = vec3(dot(wi, u), dot(wi, v), dot(wi, n));

    bool ImportanceSampling = true;
    // ImportanceSampling = gl_FragCoord.x > gl_FragCoord.y;
    // ImportanceSampling = false;

    vec3 wo;
    vec3 r;
    if (ImportanceSampling) {
        wo = sampleBsdf0(m,wi, r);
    }
    else {
        wo = sampleUniformSphere();
        r = evalBsdf0(m,wi,wo);
    }

    //m_col *= min(r, min(40.0/wi.z,200.0));
    m_col *= r;
    return wo.x * u + wo.y * v + wo.z * n;
}

vec3 evalBsdf(
    Material m, vec3 wi, vec3 wo, vec3 n
) {
    if (dot(wi, n) < 0.0) n = -n;
    vec3 u, v; onb(n, u, v);
    wi = vec3(dot(wi, u), dot(wi, v), dot(wi, n));
    wo = vec3(dot(wo, u), dot(wo, v), dot(wo, n));
    return evalBsdf0(m, wi, wo);
}


// volume

vec3 sampleUniformSphere() {
    float u = 2.0*PI*randf();
    float v = 2.0*randf()-1.0;
    return vec3(vec2(cos(u), sin(u))*sqrt(1.0-v*v), v);
}

vec3 sampleUniformSolidAngle(float alpha) {
    // uniformly for 0 < phi < alpha < pi
    float u = 2.0*PI*randf();
    float v = 1.0-randf()*(1.0-cos(alpha));
    return vec3(vec2(cos(u),sin(u))*sqrt(1.0-v*v), v);
}

float evalHenyeyGreenstein(float g, vec3 wi, vec3 wo) {
    // normalized by 1/(4*PI)
    float c = clamp(-dot(wi, wo), -0.999999, 0.999999);
    return (1.0-g*g)/pow(1.0+g*g-2.0*g*c, 1.5);
}

vec3 sampleHenyeyGreenstein(float g, vec3 wi) {
    if (g == 0.0) return sampleUniformSphere();
    if (g >= 1.0) return wi;
    if (g <= -1.0) return -wi;
    float us = randf();
    float vs = 2.0*PI*randf();
    float z = (1.0+g*g-pow((1.0-g*g)/(1.0-g+2.0*g*us),2.0))/(2.0*g);
    vec3 rd = vec3(vec2(cos(vs),sin(vs))*sqrt(1.0-z*z), z);
    vec3 u, v; onb(wi, u, v);
    return rd.x*u + rd.y*v + rd.z*wi;
    // return vec3(dot(rd,u),dot(rd,v),dot(rd,wi));
}


// parameters

uniform float rOpacity;
uniform float rIor;
uniform float rRoughness1;
uniform float rMetallic1;
uniform float rDiffuse1;
uniform float rTint1;
uniform float rEmission1;
uniform float rAbsorb1;
uniform float rVEmission1;
uniform float rScatter1;
uniform float rScatterAniso1;

uniform float rBrightness2;
uniform float rContrast2;
uniform float rRoughness2;
uniform float rMetallic2;
uniform float rIor2;
uniform float rTint2;
uniform float rEmission2;
uniform float rAbsorb2;
uniform float rVAbsorbHue;
uniform float rVAbsorbChr;
uniform float rVDecayAbs;
uniform float rVEmission2;
// uniform float rVEmissionTint2;
#define rVEmissionTint2 1.0
uniform float rScatter2;
uniform float rScatterAniso2;
uniform float rVDecaySca;
uniform float rVSharpSca;

uniform float rLightIntensity;
uniform float rLightSky;
uniform float rLightAmbient;
uniform float rLightSoftness;
uniform float rLightHardness;


// intersection

void intersectScene(
    vec3 ro, vec3 rd, out float min_t, out vec3 min_n,
    vec3 prev_col, out vec3 col, out float abst, out vec3 abscol,
    out int material, inout float is_inside
) {
    vec3 n; float t;
    vec3 tmpcol;
    min_n = vec3(0); min_t = 1e6;
    material = MAT_BACKGROUND;
    abst = 0.0, abscol = vec3(1);

    // plane
    t = -(ro.z+uClipBox.z) / rd.z;
    if (t > 0.0) {
        min_t = t, min_n = vec3(0,0,1);
        vec3 p = ro+rd*t;
        float s = getScale2();
        col = sin(s*PI*p.x)*sin(s*PI*p.y) < 0. ?
            vec3(mix(rBrightness2,1.0,rContrast2)) :
            vec3(mix(rBrightness2,0.0,rContrast2));
        col = pow(col, vec3(2.2));
        material = MAT_PLANE;
    }

    // object
    float totalv;
    float clip_t1 = min_t;
    t = intersectObject(ro, rd, 0.0, clip_t1, tmpcol, n, totalv);
    if (t > 0.0 && t < min_t) {
        min_t = t, min_n = n;
        col = tmpcol;
        material = MAT_OBJECT;
    }
    if (bool({%CLOSED%}))
        is_inside = sign(totalv);

    // scattering
    if (is_inside < 0.0) {
        float A_sca = pow(rScatter1, 0.5); A_sca = 0.5*A_sca/(1.0-A_sca);
        float r = randf();
        float tsc = -log(r) / A_sca;
        abscol = 0.5*(prev_col+col);
        if (tsc < min_t && uOutput == OUTPUT_RADIANCE) {
            min_t = tsc, min_n = vec3(0);
            abscol = mix(prev_col, col, tsc/min_t);
            col = prev_col;
            material = MAT_SCATTER;
        }
        abst = min(min_t, clip_t1);
    }
    else {
        float z0 = -uClipBox.z;
        float k0_sca = pow(rVDecaySca, 1.0);
        k0_sca = 1.0 / (k0_sca/(1.0-k0_sca));  // reciprocal layer thickness
        float A0_sca = 1.0-pow(1.0-rScatter2,2.0); 
        A0_sca = 0.01*A0_sca/(1.0-A0_sca) / (0.1*k0_sca);  // scattering intensity
        if (randf() < rVSharpSca) {
            // scattering p(t) = exp( -A/k (1-exp(-kt)) ),
            //      from 1 to exp(-A/k)
            // https://www.desmos.com/calculator/vjguq3x7wm
            vec2 tb = vec2((z0-ro.z)/rd.z, (z0+1.0/k0_sca-ro.z)/rd.z);
            tb = max(rd.z<0.0 ? tb.yx : tb, 0.0);
            if (tb.y > 0.0) {
                float A_sca = A0_sca;
                float k_sca = k0_sca / (tb.y-tb.x);
                float r = randf();
                float rth = exp(-A_sca/k_sca);
                if ((r > rth || k_sca < 0.0) && uOutput == OUTPUT_RADIANCE) {
                    float tsc = tb.x - log(mix(rth, 1.0, r)) / A_sca;
                    if (tsc < min_t) {
                        min_t = tsc, min_n = vec3(0);
                        col = prev_col;
                        material = MAT_SCATTER;
                    }
                }
            }
        }
        else {
            // scattering p(t) = exp( -A/k (1-exp(-kt)) ),
            //      from 1 to exp(-A/k)
            // floating point bad here - large scattering with small decay
            // https://www.desmos.com/calculator/wo63zpczge
            // if this is fixed we can increase k0_sca for "thin snow" effect
            float A_sca = A0_sca * exp(-k0_sca*(ro.z-z0));
            float k_sca = k0_sca * rd.z;
            float r = randf();
            if ((r > exp(-A_sca/k_sca) || k_sca < 0.0)
                && uOutput == OUTPUT_RADIANCE) {
                float tsc = -log(1.0+k_sca/A_sca*log(r))/k_sca;
                if (tsc < min_t) {
                    min_t = tsc, min_n = vec3(0);
                    col = prev_col;
                    material = MAT_SCATTER;
                }
            }
        }
        abst = min_t;
    }
}

bool isOccluded(
    vec3 ro, vec3 rd, float max_t, vec3 prev_col,
    out float abst, out vec3 abscol, out float is_inside
) {
    abst = 0.0;
    abscol = vec3(1);

    // plane
    float t = -(ro.z+uClipBox.z) / rd.z;
    if (t > 0.0 && t < max_t) {
        abst = t;
        return true;
    }

    // object
    float totalv;
    float clip_t1 = max_t;
    vec3 col=prev_col, n;
    t = intersectObject(ro, rd, 0.0, clip_t1, col, n, totalv);
    if (t > 0.0 && t < max_t) {
        return true;
    }
    if (bool({%CLOSED%}))
        is_inside = sign(totalv);

    // scattering
    if (is_inside < 0.0) {
        float A_sca = pow(rScatter1, 0.5); A_sca = 0.5*A_sca/(1.0-A_sca);
        float r = randf();
        float tsc = -log(r) / A_sca;
        abst = min(max_t, clip_t1);
        if (tsc < max_t) {
            abscol = mix(prev_col, col, tsc/max_t);
            return true;
        }
        abscol = 0.5*(prev_col+col);
        return false;
    }
    else {
        float z0 = -uClipBox.z;
        float k0_sca = pow(rVDecaySca, 1.0);
        k0_sca = 1.0 / (k0_sca/(1.0-k0_sca));  // reciprocal layer thickness
        float A0_sca = 1.0-pow(1.0-rScatter2,2.0); 
        A0_sca = 0.01*A0_sca/(1.0-A0_sca) / (0.1*k0_sca);  // scattering intensity
        if (randf() < rVSharpSca) {
            // scattering p(t) = exp( -A/k (1-exp(-kt)) ),
            //      from 1 to exp(-A/k)
            // https://www.desmos.com/calculator/vjguq3x7wm
            vec2 tb = vec2((z0-ro.z)/rd.z, (z0+1.0/k0_sca-ro.z)/rd.z);
            tb = max(rd.z<0.0 ? tb.yx : tb, 0.0);
            if (tb.y > 0.0) {
                float A_sca = A0_sca;
                float k_sca = k0_sca / (tb.y-tb.x);
                float r = randf();
                float rth = exp(-A_sca/k_sca);
                if ((r > rth || k_sca < 0.0) && uOutput == OUTPUT_RADIANCE) {
                    float tsc = tb.x - log(mix(rth, 1.0, r)) / A_sca;
                    if (tsc < max_t) {
                        abst = tsc;
                        return true;
                    }
                }
            }
            return false;
        }
        else {
            // scattering p(t) = exp( -A/k (1-exp(-kt)) ),
            //      from 1 to exp(-A/k)
            // floating point bad here - large scattering with small decay
            // https://www.desmos.com/calculator/wo63zpczge
            // if this is fixed we can increase k0_sca for "thin snow" effect
            float A_sca = A0_sca * exp(-k0_sca*(ro.z-z0));
            float k_sca = k0_sca * rd.z;
            float r = randf();
            if ((r > exp(-A_sca/k_sca) || k_sca < 0.0)
                && uOutput == OUTPUT_RADIANCE) {
                float tsc = -log(1.0+k_sca/A_sca*log(r))/k_sca;
                if (tsc < max_t) {
                    abst = tsc;
                    return true;
                }
            }
            return false;
        }
    }
}

// lighting

vec3 getSkyLight(vec3 rd) {
    float intensity = pow(2.0*rLightIntensity,2.0);
    float soft = pow(rLightSoftness, 4.0);
    // https://www.desmos.com/3d/750cc71ae5
    float k1 = 1.0 / soft;
    float k2 = 1.52004*sqrt(soft)-0.379175*(soft); k2 = min(sqrt(2.)*k2, PI);
    vec3 spot = mix(vec3(1)*mix(
        0.5*(k1+1.0)*pow(0.5+0.5*dot(rd,LDIR),k1),
        dot(rd,LDIR)>cos(k2) ? 1.0/(1.0-cos(k2)) : 0.0,
        rLightHardness), vec3(0.5), rLightAmbient);
    vec3 sky = skyColor(vec3(rd.x,rd.z,-rd.y), vec3(LDIR.x,LDIR.z,-LDIR.y));
    return intensity * mix(spot, sky, rLightSky);
}

float sampleSkyLight(out vec3 rd) {
    float soft = pow(rLightSoftness, 4.0);
    float k1 = 1.0 / soft;
    float k2 = 1.52004*sqrt(soft)-0.379175*(soft); k2 = min(sqrt(2.)*k2, PI);
    // sample light
    if (randf() < rLightAmbient || randf() < rLightSky) {
        rd = sampleUniformSphere();
    }
    else if (randf() < rLightHardness) {
        rd = sampleUniformSolidAngle(k2);
    }
    else {
        // https://www.desmos.com/calculator/tstxuwl5or
        float u = 2.0*PI*randf();
        float theta = 2.0*acos(pow(randf(),1.0/(2.0*(k1+1.0))));
        rd = vec3(vec2(cos(u),sin(u))*sin(theta),cos(theta));
    }
    // calculate pdf (normalized by 1/(4*PI))
    float pdf_amb = 1.0;
    float pdf_hard = rd.z>cos(k2) ? 1.0/(0.5*(1.0-cos(k2))) : 0.0;
    float pdf_soft = (k1+1.0)*pow(0.5+0.5*rd.z,k1);
    float pdf = mix(pdf_amb,
        mix(pdf_soft, pdf_hard, rLightHardness),
        (1.0-rLightAmbient)*(1.0-rLightSky));
    // rotate rd
    vec3 u, v; onb(LDIR, u, v);
    rd = rd.x*u + rd.y*v + rd.z*LDIR;
    return pdf;
}


// rendering

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

void getVolumeAbsorptionEmission(
    float is_inside, vec3 ro, vec3 rd, vec3 abscol, float abst,
    out vec3 out_abs, out vec3 out_emi
) {
    if (is_inside < 0.0) {
        float A_abs = rAbsorb1/(1.0-rAbsorb1);
        float A_emi = 4.0 * pow(rVEmission1, 2.2);
        vec3 emit = vec3(A_emi) * abscol;
        vec3 a = pow(clamp(abscol, 0.00001, 0.99999), vec3(A_abs));
        out_abs = pow(a, vec3(abst));
        out_emi = emit * (A_abs==0.0 ? vec3(abst) : (out_abs-1.0)/log(a));
    }
    else {
        // density A0 exp(-k0 z)
        //      = A0 exp(-k0 (ro.z + rd.z t))
        //      = (A0 exp(-k0 ro.z)) exp(-k0 rd.z t)
        //      = A exp(-k t)
        // total absorption density A/k (1-exp(-kt))
        float z0 = -uClipBox.z;
        float k0_abs = pow(rVDecayAbs, 0.8);
        k0_abs = 0.2 / (k0_abs/(1.0-k0_abs));
        float A0_abs = rAbsorb2/(1.0-rAbsorb2);
        vec3 c_abs = getAbsorbColor();
        vec3 c_emi = 0.5 * pow(rVEmission2, 2.2) * mix(vec3(1), c_abs, rVEmissionTint2);
        float A_abs = A0_abs * exp(-k0_abs*(ro.z-z0));
        float k_abs = k0_abs * rd.z;
        vec3 c = pow(clamp(c_abs, 0.00001, 0.99999), vec3(A_abs));
        vec3 A = -log(c);
        out_abs = exp(k_abs == 0.0 ? -vec3(abst) : A/k_abs*(exp(-k_abs*abst)-1.0));
        out_emi = (A0_abs == 0.0) ? vec3(0.0) : c_emi * (1.0-out_abs) / A;
    }
}

vec3 mainRender(vec3 ro, vec3 rd) {
    vec3 m_col = vec3(1.0), t_col = vec3(0.0), col, tmpcol;
    vec3 prev_col = vec3(1.0);
    rd = normalize(rd);

    float maxLightPathDepth = float({%LIGHT_PATH_DEPTH%});
    for (float iter = ZERO; iter < maxLightPathDepth; iter++) {
        if (dot(m_col,vec3(1)) <= 0.0 || isnan(length(m_col)))
            break;
        // if (iter >= 1.0) return m_col;
        if (iter != 0.)
            ro += 1e-4*length(ro) * rd;

        // ray surface intersection
        float min_t; vec3 min_n;
        int material;
        float abst; vec3 abscol;
        float is_inside;

        intersectScene(
            ro, rd, min_t, min_n,
            prev_col, col, abst, abscol,
            material, is_inside
        );
        vec3 min_ro = ro + rd * min_t;
        vec3 min_rd = rd;
        // return is_inside<0.0 ? vec3(0,0,1) : vec3(1,0,0);

        // absorption and emission
        vec3 c_abs=vec3(1), c_emi=vec3(0);
        getVolumeAbsorptionEmission(
            is_inside, ro, rd, abscol, abst, c_abs, c_emi);
        if (!isnan(length(c_emi)))
            t_col += m_col * c_emi;
        if (!isnan(length(c_abs)))
            m_col *= c_abs;

        // buffer
        #if 0
        if (uOutput == OUTPUT_WORLD_NORMAL ||
            uOutput == OUTPUT_DENOISE_NORMAL)
            return isnan(dot(min_n,vec3(1))) ? vec3(0) : min_n;
        if (uOutput == OUTPUT_WORLD_POSITION)
            return min_ro;1
        if (uOutput == OUTPUT_ALBEDO ||
            uOutput == OUTPUT_DENOISE_ALBEDO)
            return material == MAT_BACKGROUND ?
                vec3(0) : m_col * col;
        #endif

        // background
        if (material == MAT_BACKGROUND) {
            t_col += m_col * getSkyLight(rd);
            break;
        }
        // nan
        if (isnan(dot(min_n, col))) {
            // this glows, should fix it
            t_col += m_col * vec3(0,1,0);
            break;
        }

        // get material
        Material m;
        if (material == MAT_SCATTER) {
            m.bsdf = MAT_SCATTER;
            m.emission = vec3(0);
            float aniso = is_inside<0.0 ? rScatterAniso1 : rScatterAniso2;
            m.anisotropy = 1.5*aniso - 0.5*pow(aniso,3.0);
        }
        else if (material == MAT_PLANE) {
            m.bsdf = MAT_BSDF;
            m.albedo = col;
            m.emission = 2.0*rEmission2 * col;
            m.roughness = pow(rRoughness2, 2.0);
            m.metallic = rMetallic2;
            m.diffuse = 1.0-rMetallic2;
            m.tint = rTint2;
            m.opacity = 1.0;
            m.eta = rIor2;
            m.eta_k = 2.0*rMetallic2/(1.0001-rMetallic2);
        }
        else if (material == MAT_OBJECT) {
            m.bsdf = MAT_BSDF;
            col = pow(clamp(col,0.0,1.0), vec3(rAbsorb1/(1.0-rAbsorb1)));
            m.albedo = col;
            m.emission = rEmission1 * col;
            m.roughness = pow(rRoughness1,2.0);
            m.metallic = rMetallic1;
            m.diffuse = 1.0-rMetallic1;
            m.tint = rTint1;
            m.opacity = rOpacity;
            m.eta = is_inside<0.0 ? 1.0/rIor : rIor;
            m.eta_k = 2.0*rMetallic1/(1.0001-rMetallic1);
        }

        // update ray
        ro = min_ro;
        min_n = dot(min_rd,min_n) < 0. ? min_n : -min_n;
        t_col += m_col * m.emission;
        vec3 rd_r, rd_l;  // rd for bsdf and light
        float pdf_r, pdf_l;  // pdf for bsdf and light
        vec3 m_col1 = m_col;
        if (m.bsdf == MAT_SCATTER) {
            rd_r = sampleHenyeyGreenstein(m.anisotropy, min_rd);
            pdf_r = evalHenyeyGreenstein(m.anisotropy, -min_rd, rd_r);
        }
        else if (m.bsdf == MAT_BSDF) {
            rd_r = sampleBsdf(m, -min_rd, min_n, m_col1);
            Material m1 = m; m1.albedo = vec3(1);
            pdf_r = evalBsdf(m1, -min_rd, rd_r, min_n).x;
        }
        pdf_l = sampleSkyLight(rd_l);
        float mis = (pdf_r*pdf_r) / (pdf_r*pdf_r+pdf_l*pdf_l);
        // if (gl_FragCoord.x > gl_FragCoord.y) mis = 1.0;
        if (m.bsdf == MAT_BSDF && m.roughness == 0.0)
            mis = 1.0;
        if (randf() < mis || !bool({%MIS%})) {
            rd = rd_r;
            m_col = m_col1;
        }
        else {
            // sample light
            vec3 frcos =
                m.bsdf == MAT_SCATTER ?
                    vec3(evalHenyeyGreenstein(m.anisotropy, -min_rd, rd_l)) :
                m.bsdf == MAT_BSDF ?
                    evalBsdf(m, -min_rd, rd_l, min_n) :
                vec3(1);
            // m_col *= frcos / pdf_l;
            m_col *= frcos / max(pdf_l,1e-4*length(frcos));
            rd = rd_l;
        }

        prev_col = col;
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

// sampling aperture
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

// main

void main(void) {
    float focal = length(screenToWorld(vec3(0)));
    focal *= 1.0 + 0.5 * (rFocalLength-0.5) / (rFocalLength*(1.0-rFocalLength));

    vec4 totcol = vec4(0);
    totcol = texelFetch(accumBuffer, ivec2(gl_FragCoord.xy), 0);
    if (iSpp == 0.0) totcol = vec4(0);
    for (float fi=ZERO; fi<sSamples; fi++) {
        // random number seed
        seed0 = hash13(vec3(gl_FragCoord.xy/iResolution.xy, sin(iSeed+fi/sSamples)));
        seed = round(65537.*seed0);

        // frame skipping
        // to-do: some way without increasing variance
        const float tile_size = 16.0;
        vec2 tile_uv = mod(floor(gl_FragCoord.xy), tile_size);
        vec2 tile_ij = floor(gl_FragCoord.xy/tile_size);
        float tile_ij_hash = floor(hash13(vec3(tile_ij,tile_size))*tile_size*tile_size);
        float tile_i = tile_uv.y*tile_size + tile_uv.x;
        tile_i = mod(37.0*tile_i+tile_ij_hash, tile_size*tile_size);
        float tile_f = tile_i / (tile_size*tile_size);
        float tile_offset = mod(iSpp, 1.0);
        if (mod(tile_f+tile_offset, 1.0) >= sSamples)
            continue;

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
            else totcol += vec4(col, 1) / sSamples;
        }
    }
    fragColor = totcol;
}
