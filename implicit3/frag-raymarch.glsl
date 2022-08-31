#version 300 es
precision highp float;

in vec2 vXy;
out vec4 fragColor;

uniform sampler2D iChannel0;
uniform mat4 transformMatrix;
uniform vec2 screenCenter;
uniform float uScale;

uniform float ZERO;  // used in loops to reduce compilation time
#define PI 3.1415926

vec3 screenToWorld(vec3 p) {
    vec4 q = transformMatrix * vec4(p, 1);
    return q.xyz / q.w;
}


// function and its gradient in world space
#include "../shaders/functions.glsl"

int callCount = 0;
float fun(vec3 p) {  // function
    callCount += 1;
#if {%Y_UP%}
    float x=p.x, y=p.z, z=-p.y;
#else
    float x=p.x, y=p.y, z=p.z;
#endif
    {%FUN%}
}

vec4 funGradA(vec3 p) {  // analytical gradient
    callCount += 1;
#if {%Y_UP%}
    float x=p.x, y=p.z, z=-p.y;
#else
    float x=p.x, y=p.y, z=p.z;
#endif
    {%FUNGRAD%}
}

vec3 funGradN(vec3 p) {  // numerical gradient
    //float h = 0.002*max(pow(length(p),1./3.),1.);
    float h = 0.002*length(p);
    return vec3(
        fun(p+vec3(h,0,0)) - fun(p-vec3(h,0,0)),
        fun(p+vec3(0,h,0)) - fun(p-vec3(0,h,0)),
        fun(p+vec3(0,0,h)) - fun(p-vec3(0,0,h))
    ) / (2.0*h);
}

#if {%ANALYTICAL_GRADIENT%}
#if {%Y_UP%}
vec3 funGrad(vec3 p) {
    vec3 n = funGradA(p).xyz;
    return vec3(n.x, -n.z, n.y);
}
#else
#define funGrad funGradA
#endif  // {%Y_UP%}
#else // {%ANALYTICAL_GRADIENT%}
#define funGrad funGradN
#endif


// function and its gradient in screen space

float funS(vec3 p) {
    return fun(screenToWorld(p));
}

#if {%ANALYTICAL_GRADIENT%}

vec4 funGradS(vec3 x) {
    mat3 R = mat3(transformMatrix);
    vec3 T = transformMatrix[3].xyz;
    vec3 P = vec3(transformMatrix[0][3], transformMatrix[1][3], transformMatrix[2][3]);
    float S = transformMatrix[3][3];
    float pers = dot(P, x) + S;
    mat3 M = (R * pers - outerProduct(R*x+T, P)) / (pers*pers);
    return funGrad(screenToWorld(x)) * mat4(M);
}

float sdfS(vec3 p, vec3 rd) {
    vec4 gv = funGradS(p);
    return gv.w / abs(dot(gv.xyz, rd));
}

#endif


#define STEP_SIZE (({%STEP_SIZE%})*(bool({%ANALYTICAL_GRADIENT%})?1.0:0.5))
#define MAX_STEP int(10.0/(STEP_SIZE))

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
    float ls = log(uScale) / log(10.);
    float fs = pow(ls - floor(ls), 1.0);
    float es = pow(10., floor(ls));
    vec3 q0 = es*p;
    vec3 q1 = 10.*q0;
    vec3 q2 = 10.*q1;
    float w0 = .05*es/uScale;
    float w1 = mix(1.,10.,fs)*w0;
    float g0 = grid1(q0, n, w0);
    float g1 = grid1(q1, n, w1);
    float g2 = grid1(q2, n, w1);
    return min(min(mix(0.65, 1.0, g0), mix(mix(0.8,0.65,fs), 1.0, g1)), mix(mix(1.0,0.8,fs), 1.0, g2));
}
float fade(float t) {
    return smoothstep(0., 1., 5.0*(clamp(1.0-t, 0., 1.)));
}
vec4 calcColor(vec3 ro, vec3 rd, float t) {
    vec3 p = screenToWorld(ro+rd*t);
    vec3 n0 = funGrad(p).xyz;
    rd = normalize(screenToWorld(ro+rd)-screenToWorld(ro));
    n0 = dot(n0,rd)>0. ? -n0 : n0;
    vec3 n = normalize(n0);
#if {%Y_UP%}
    n0 = vec3(n0.x, n0.z, -n0.y);
#endif // {%Y_UP%}
    float g = bool({%GRID%}) ? grid(p, n) : 1.0;
#if {%COLOR%} == 0
    // porcelain-like shading
    vec3 albedo = g * mix(vec3(0.9), normalize(n0), 0.05);
    vec3 amb = vec3(0.2+0.0*n.y) * albedo;
    vec3 dif = 0.6*max(dot(n,LDIR),0.0) * albedo;
    vec3 spc = min(1.2*pow(max(dot(reflect(rd,n),LDIR),0.0),100.0),1.) * vec3(10.);
    vec3 rfl = mix(vec3(1.), vec3(4.), clamp(5.*dot(reflect(rd,n),LDIR),0.,1.));
    vec3 col = mix(amb+dif, rfl+spc, mix(.01,.2,pow(clamp(1.+dot(rd,n),.0,.8),5.)));
#else // {%COLOR%} == 0
#if {%COLOR%} == 1
    // color based on normal
    vec3 albedo = mix(vec3(1.0), normalize(n0), 0.45);
    //albedo = pow(albedo, vec3(0.8));
    albedo /= 1.2*pow(dot(albedo, vec3(0.299,0.587,0.114)), 0.5);
#elif {%COLOR%} == 2
    // heatmap color based on gradient magnitude
    float grad = 0.5-0.5*cos(PI*log(length(n0))/log(10.));
    vec3 albedo = vec3(.372,.888,1.182) + vec3(.707,-2.123,-.943)*grad
        + vec3(.265,1.556,.195)*cos(vec3(5.2,2.48,8.03)*grad-vec3(2.52,1.96,-2.88));
#endif // {%COLOR%} == 1
    albedo *= g;
    // phong shading
    vec3 amb = vec3(0.2+0.0*n.y) * albedo;
    vec3 dif = 0.6*max(dot(n,LDIR),0.0) * albedo;
    vec3 spc = pow(max(dot(reflect(rd,n),LDIR),0.0),40.0) * vec3(0.1);
    vec3 col = amb + dif + spc;
#endif // {%COLOR%} == 0
    return vec4(col*fade(t), 1.0-pow(1.0-OPACITY,abs(1.0/dot(rd,n))));
}

// Without opacity, finds the zero using bisection search
vec3 vSolid(in vec3 ro, in vec3 rd, float t0, float t1) {
    // raymarching
#if {%ANALYTICAL_GRADIENT%}
    float t = t0, dt = STEP_SIZE;
    float v0 = sdfS(ro+rd*t, rd), v;
    int i = int(ZERO);
    for (t += dt; i < MAX_STEP && t < t1; t += dt, i++) {
        v = sdfS(ro+rd*t, rd);
        if (v*v0 < 0.0) break;
        v0 = v;
        dt = isnan(v) ? STEP_SIZE : clamp(abs(v)-STEP_SIZE, 0.05*STEP_SIZE, STEP_SIZE);
    }
#else // {%ANALYTICAL_GRADIENT%}
    // https://www.desmos.com/calculator/mhxwoieyph
    float t = t0, dt = STEP_SIZE;
    float v = 0.0, v0 = v, v00 = v;
    float dt0 = 0.0, dt00 = 0.0;
    int i = int(ZERO);
    for (; i < MAX_STEP && t < t1; t += dt, i++) {
        v = funS(ro+rd*t);
        if (v*v0 < 0.0) break;
        if (isnan(dt0) || dt0 <= 0.0) v00 = v, v0 = v, dt0 = dt00 = 0.0;
        float g = dt0 > 0.0 ? ( // estimate gradient
            dt00 > 0.0 ? // quadratic fit
                v00*dt0/(dt00*(dt0+dt00))-v0*(dt0+dt00)/(dt0*dt00)+v*(2.*dt0+dt00)/(dt0*(dt0+dt00))
                : (v-v0)/dt0  // finite difference
        ) : 0.;
        dt = (isnan(g) || g==0.) ? STEP_SIZE :
            clamp(abs(v/g)-STEP_SIZE, 0.05*STEP_SIZE, STEP_SIZE);
        dt00 = dt0, dt0 = dt, v00 = v0, v0 = v;
    }
#endif // {%ANALYTICAL_GRADIENT%}
    if (v*v0 >= 0.0) return vec3(0);
    // finding root
    t0 = t-dt, t1 = t;
#if {%ANALYTICAL_GRADIENT%} && {%DISCONTINUITY%}
    v0 = funS(ro+rd*t0);  // use raw function value for discontinuity detection
    float v1 = funS(ro+rd*t1);
#else
    float v1 = v;
#endif
    float old_dvdt = abs((v1-v0)/(t1-t0)), dvdt;
    for (int s = int(ZERO); s < 8; s += 1) {
        // bisect
        t = 0.5 * (t0 + t1);
        vec3 p = ro + rd * t;
        v = funS(p);
        if (v*v0 < 0.0) t1 = t, v1 = v;
        else t0 = t, v0 = v;
        // check discontinuity
        dvdt = abs((v1-v0)/(t1-t0));
#if {%DISCONTINUITY%}
        if (abs(t1-t0) < 1e-4 && dvdt > 1.8*old_dvdt) {
            vec3 albedo = vec3(1,0,0);
#if {%GRID%}
            albedo *= grid(screenToWorld(p), vec3(sqrt(0.33)));
#endif
            return albedo * fade(0.5*(t0+t1));
        }
#endif
        if (abs(t1-t0) < 0.001*STEP_SIZE) break;
        old_dvdt = dvdt;
    }
#if 0
    {  // debug analytical gradient
        vec3 p = screenToWorld(ro+rd*t);
        vec3 nn = funGradN(p);
        vec3 na = funGradA(p);
        return vec3(tanh(100.*length(nn-na)));
    }
#endif
    return calcColor(ro, rd, t).xyz;
}


// With opacity, approximates zeros using linear interpolation
#if {%ANALYTICAL_GRADIENT%}

vec3 vAlpha(in vec3 ro, in vec3 rd, float t0, float t1) {
    float t = ZERO, dt = STEP_SIZE;
    float v0 = sdfS(ro+rd*t0, rd), v;
    int i = int(ZERO);
    vec3 tcol = vec3(0.0);
    float mcol = 1.0;
    for (t += t0 + dt; i < MAX_STEP && t < t1; t += dt, i++) {
        vec3 p = ro + rd * t;
        v = sdfS(p, rd);
        if (v*v0 < 0.0 && mcol > 0.01) {
            float tm = t - dt * v / (v - v0);
            vec4 rgba = calcColor(ro, rd, tm);
            tcol += mcol * rgba.xyz * rgba.w;
            mcol *= 1.0 - rgba.w;
        }
        v0 = v;
        dt = isnan(v) ? STEP_SIZE : clamp(abs(v)-STEP_SIZE, 0.05*STEP_SIZE, STEP_SIZE);
    }
    return tcol;
}

#else // {%ANALYTICAL_GRADIENT%}

vec3 vAlpha(in vec3 ro, in vec3 rd, float t0, float t1) {
    float t = t0, dt = STEP_SIZE;
    float v = 0.0, v0 = v, v00 = v, g0 = 0.0, g;
    float dt0 = 0.0, dt00 = 0.0;
    int i = int(ZERO);
    vec3 tcol = vec3(0.0);
    float mcol = 1.0;
    for (; i < MAX_STEP && t < t1; t += dt, i++) {
        v = funS(ro+rd*t);
        if (v*v0 < 0.0 && mcol > 0.01) {  // intersection
            if (isnan(g) || g <= 0.0) g = 1.0;
            if (isnan(g0) || g0 <= 0.0) g0 = g;
            float tm = t - dt * (v/g) / ((v/g) - (v0/g0));
            vec4 rgba = calcColor(ro, rd, tm);
            tcol += mcol * rgba.xyz * rgba.w;
            mcol *= 1.0 - rgba.w;
        }
        if (isnan(dt0) || dt0 <= 0.0) v00 = v, v0 = v, dt0 = dt00 = 0.0;
        g = dt0 > 0.0 ? ( // estimate gradient
            dt00 > 0.0 ? // quadratic fit
                v00*dt0/(dt00*(dt0+dt00))-v0*(dt0+dt00)/(dt0*dt00)+v*(2.*dt0+dt00)/(dt0*(dt0+dt00))
                : (v-v0)/dt0  // finite difference
        ) : 0.;
        if (isnan(g0) || g0 <= 0.0) g0 = g;
        dt = (isnan(g) || g==0.) ? STEP_SIZE :
            clamp(abs(v/g)-STEP_SIZE, 0.05*STEP_SIZE, STEP_SIZE);
        dt00 = dt0, dt0 = dt, v00 = v0, v0 = v, g0 = g;
    }
    return tcol;
}

#endif // {%ANALYTICAL_GRADIENT%}


void main(void) {
    vec3 ro = vec3(vXy-screenCenter, 0);
    vec3 rd = vec3(0, 0, 1);
    vec2 t01 = texture(iChannel0, 0.5+0.5*vXy).xy;
    float pad = max(STEP_SIZE, 1./255.);
    vec3 col = {%V_RENDER%}(ro, rd, t01.x==1.?1.:max(t01.x-pad, 0.0), min(t01.y+pad, 1.0));
    col -= vec3(1.5/255.)*fract(0.13*gl_FragCoord.x*gl_FragCoord.y);  // reduce "stripes"
    // col = vec3(callCount) / 255.0;
#if {%GRID%}
    col = pow(col, vec3(0.85));
#endif
    fragColor = vec4(clamp(col,0.,1.), 1.0);
}
