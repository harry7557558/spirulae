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

#if {%LIGHT_THEME%}
#define BACKGROUND_COLOR vec3(0.9)
#else
#define BACKGROUND_COLOR vec3(0.02, 0.022, 0.025)
#endif

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

vec3 funGrad(vec3 p) {  // numerical gradient
    float h = 0.002*length(p);
    return vec3(
        fun(p+vec3(h,0,0)) - fun(p-vec3(h,0,0)),
        fun(p+vec3(0,h,0)) - fun(p-vec3(0,h,0)),
        fun(p+vec3(0,0,h)) - fun(p-vec3(0,0,h))
    ) / (2.0*h);
}
#line 50

// function and its gradient in screen space

float funS(vec3 p) {
    return fun(screenToWorld(p));
}


#define STEP_SIZE (({%STEP_SIZE%})*(0.5))
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
    vec3 amb = (vec3(0.2+0.0*n.y)+0.1*BACKGROUND_COLOR) * albedo;
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
    vec3 amb = (vec3(0.2+0.0*n.y)+0.15*BACKGROUND_COLOR) * albedo;
    vec3 dif = 0.6*max(dot(n,LDIR),0.0) * albedo;
    vec3 spc = pow(max(dot(reflect(rd,n),LDIR),0.0),40.0) * vec3(0.1);
    vec3 col = amb + dif + spc;
#endif // {%COLOR%} == 0
    if (isnan(dot(col, vec3(1))))
        return vec4(mix(BACKGROUND_COLOR, vec3(0,0.5,0), fade(t)), 1.0);
    return vec4(
        mix(BACKGROUND_COLOR, col, fade(t)),
        1.0-pow(1.0-OPACITY,abs(1.0/dot(rd,n)))
    );
}


#if !{%TRANSPARENCY%}

// Without opacity, finds the zero using bisection search
vec3 render(in vec3 ro, in vec3 rd, float t0, float t1) {
    // raymarching - https://www.desmos.com/calculator/mhxwoieyph
    float t = t0, dt = STEP_SIZE;
    float v = 0.0, v0 = v, v00 = v, v1;
    float dt0 = 0.0, dt00 = 0.0;
    float dvdt, old_dvdt;  // discontinuity checking
    bool isBisecting = false;
    int i = int(ZERO);
    while (true) {
        v = funS(ro+rd*t);
        if (isBisecting) {  // bisection search
            if (t1-t0 <= STEP_SIZE/64.) break;
            if (v*v0 < 0.0) t1 = t, v1 = v;
            else t0 = t, v0 = v;
            t = 0.5*(t0+t1);
#if {%DISCONTINUITY%}
            dvdt = abs((v1-v0)/(t1-t0));
            if (abs(t1-t0) < 1e-4 && dvdt > 1.8*old_dvdt) {
                vec3 albedo = vec3(1,0,0);
                if (bool({%GRID%}))
                    albedo *= grid(screenToWorld(ro+rd*t), vec3(sqrt(0.33)));
                return mix(BACKGROUND_COLOR, albedo, fade(0.5*(t0+t1)));
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
            if (isnan(dt0) || dt0 <= 0.0) v00 = v, v0 = v, dt0 = dt00 = 0.0;
            float g = dt0 > 0.0 ? ( // estimate gradient
                dt00 > 0.0 ? // quadratic fit
                    v00*dt0/(dt00*(dt0+dt00))-v0*(dt0+dt00)/(dt0*dt00)+v*(2.*dt0+dt00)/(dt0*(dt0+dt00))
                    : (v-v0)/dt0  // finite difference
            ) : 0.;
            dt = (isnan(g) || g==0.) ? STEP_SIZE :
                clamp(abs(v/g)-STEP_SIZE, 0.05*STEP_SIZE, STEP_SIZE);
            dt00 = dt0, dt0 = dt, v00 = v0, v0 = v;
            t += dt;
        }
        if (++i >= MAX_STEP || t > t1) return BACKGROUND_COLOR;
    }
    return calcColor(ro, rd, t).xyz;
}

#else  // !{%TRANSPARENCY%}

vec3 render(in vec3 ro, in vec3 rd, float t0, float t1) {
    float t = t0, dt = STEP_SIZE;
    float v = 0.0, v0 = v, v00 = v, g0 = 0.0, g;
    float dt0 = 0.0, dt00 = 0.0;
    int i = int(ZERO);
    vec3 tcol = vec3(0);
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
    return tcol + mcol * BACKGROUND_COLOR;
}

#endif


void main(void) {
    vec3 ro = vec3(vXy-screenCenter, 0);
    vec3 rd = vec3(0, 0, 1);
    vec2 t01 = texture(iChannel0, 0.5+0.5*vXy).xy;
    float pad = max(STEP_SIZE, 1./255.);
    vec3 col = render(ro, rd, t01.x==1.?1.:max(t01.x-pad, 0.0), min(t01.y+pad, 1.0));
    col -= vec3(1.5/255.)*fract(0.13*gl_FragCoord.x*gl_FragCoord.y);  // reduce "stripes"
    // col = vec3(callCount) / 255.0;
#if {%GRID%}
    col = pow(col, vec3(0.85));
#endif
    fragColor = vec4(clamp(col,0.,1.), 1.0);
}
