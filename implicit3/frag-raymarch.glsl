#version 300 es
precision highp float;

in vec2 vXy;
out vec4 fragColor;

uniform sampler2D iChannel0;
uniform mat4 transformMatrix;
uniform vec2 screenCenter;
uniform float uScale;
uniform vec3 uClipBox;

uniform float ZERO;  // used in loops to reduce compilation time
#define PI 3.1415926

#if {%LIGHT_THEME%} && !{%FIELD%}
#define BACKGROUND_COLOR vec3(0.82,0.8,0.78)
#else
#define BACKGROUND_COLOR vec3(4e-4, 5e-4, 6e-4)
#endif

bool boxIntersection(vec3 ro, vec3 rd, out float tn, out float tf) {
    vec3 inv_rd = 1.0 / rd;
    vec3 n = inv_rd*(ro);
    vec3 k = abs(inv_rd)*abs(uClipBox);
    vec3 t1 = -n - k, t2 = -n + k;
    tn = max(max(t1.x, t1.y), t1.z);
    tf = min(min(t2.x, t2.y), t2.z);
    if (tn > tf) return false;
    return true;
}

vec3 screenToWorld(vec3 p) {
    vec4 q = transformMatrix * vec4(p, 1);
    return q.xyz / q.w;
}
vec3 worldToScreen(vec3 p) {
    vec4 q = inverse(transformMatrix) * vec4(p, 1);
    if (q.w < 0.0) return vec3(-1);
    return q.xyz / q.w;
}


// function and its gradient in world space
#include "../shaders/functions.glsl"

{%FUN%}

int callCount = 0;
float fun(vec3 p) {  // function
    callCount += 1;
#if {%Y_UP%}
    float x=p.x, y=p.z, z=-p.y;
#else
    float x=p.x, y=p.y, z=p.z;
#endif
    return funRaw(x, y, z);
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
float fade(float t) {
    t = smoothstep(0.7, 1., t);
    t = t/(1.-t);
    t = mix(pow(0.8*t, 0.8), pow(0.2*t, 1.5),
        smoothstep(0., 0.8, dot(BACKGROUND_COLOR,vec3(1./3.))));
    t = pow(t, 1.2);
    return exp(-t);
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
    float g = bool({%GRID%}) ? 1.1*grid(p, n) : 1.0;
#if {%COLOR%} == 0
    // porcelain-like shading
    vec3 albedo = g * mix(vec3(0.7), normalize(n0), 0.1);
    vec3 amb = (0.1+0.2*BACKGROUND_COLOR) * albedo;
    vec3 dif = 0.6*max(dot(n,LDIR),0.0) * albedo;
    vec3 spc = min(1.2*pow(max(dot(reflect(rd,n),LDIR),0.0),100.0),1.) * vec3(20.);
    vec3 rfl = mix(vec3(1.), vec3(4.), clamp(5.*dot(reflect(rd,n),LDIR),0.,1.));
    vec3 col = mix(amb+dif, rfl+spc, mix(.01,.2,pow(clamp(1.+dot(rd,n),.0,.8),5.)));
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
    albedo = pow(albedo, vec3(2.2));
    // phong shading
    vec3 amb = (0.05+0.2*BACKGROUND_COLOR) * albedo;
    vec3 dif = 0.6*pow(max(dot(n,LDIR),0.0),1.5) * albedo;
    vec3 spc = pow(max(dot(reflect(rd,n),LDIR),0.0),40.0) * vec3(0.06) * pow(albedo,vec3(0.2));
    vec3 col = amb + dif + spc;
#endif // {%COLOR%} == 0
    if (isnan(dot(col, vec3(1))))
        return vec4(mix(BACKGROUND_COLOR, vec3(0,0.5,0)*g, fade(t)), 1.0);
    return vec4(
        mix(BACKGROUND_COLOR, col, fade(t)),
        1.0-pow(1.0-OPACITY,abs(1.0/dot(rd,n)))
    );
}

#define FIELD_EMISSION 0.25
#define ISOSURFACE_FREQUENCY 10.0
#define DISCONTINUITY_OPACITY 10.0
#define SURFACE_GRADIENT 10.0

vec3 colorSdf(float t) {
    float r = .385+.619*t+.238*cos(4.903*t-2.61);
    float g = -5.491+.959*t+6.089*cos(.968*t-.329);
    float b = 1.107-.734*t+.172*cos(6.07*t-2.741);
    return clamp(vec3(r, g, b), 0.0, 1.0);
}


#if !{%TRANSPARENCY%}

// Without opacity, finds the zero using bisection search
vec3 render(in vec3 ro, in vec3 rd, float t0, float t1) {
    // raymarching - https://www.desmos.com/calculator/mhxwoieyph
    float t = t0, dt = STEP_SIZE;
    float v = 0.0, v0 = v, v00 = v, v1;
    float g = 0.0, g0 = g, g00 = g;
    float dt0 = 0.0, dt00 = 0.0;
    float dvdt, old_dvdt;  // discontinuity checking
    bool isBisecting = false;
    int i = int(ZERO);
    vec3 totemi = vec3(0.0);
    float totabs = 1.0;
    while (true) {
        if (++i >= MAX_STEP || t > t1) {
            return BACKGROUND_COLOR*totabs + totemi;
        }
        v = funS(ro+rd*t);
        if (isBisecting) {  // bisection search
            // if (t1-t0 <= STEP_SIZE/64.) break;
            if (t1-t0 <= 1e-4) break;
            if (v*v0 < 0.0) t1 = t, v1 = v;
            else t0 = t, v0 = v;
            t = 0.5*(t0+t1);
#if {%DISCONTINUITY%}
            dvdt = abs((v1-v0)/(t1-t0));
            if (abs(t1-t0) < 1e-4 && dvdt > 1.8*old_dvdt) {
                vec3 albedo = vec3(1,0,0);
                if (bool({%GRID%}))
                    albedo *= grid(screenToWorld(ro+rd*t), vec3(sqrt(0.33)));
                vec3 col = mix(BACKGROUND_COLOR, albedo, fade(0.5*(t0+t1)));
                return totemi + col * totabs;
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
            g = dt0 > 0.0 ? ( // estimate gradient
                dt00 > 0.0 ? // quadratic fit
                    v00*dt0/(dt00*(dt0+dt00))-v0*(dt0+dt00)/(dt0*dt00)+v*(2.*dt0+dt00)/(dt0*(dt0+dt00))
                    : (v-v0)/dt0  // finite difference
            ) : 0.;
            float a = dt0 > 0.0 ? ( // estimate second derivative
                dt00 > 0.0 ? // quadratic fit
                    g00*dt0/(dt00*(dt0+dt00))-g0*(dt0+dt00)/(dt0*dt00)+g*(2.*dt0+dt00)/(dt0*(dt0+dt00))
                    : (g-g0)/dt0  // finite difference
            ) : 0.;
#if {%FIELD%}
            // field
            vec3 col = colorSdf(0.5+0.5*sin(ISOSURFACE_FREQUENCY*PI*0.5*
                log(abs(v))/log(10.) ));
            float absorb = FIELD_EMISSION;
#if {%DISCONTINUITY%} && 0
            // try to highlight discontinuity, terrible
            if (dt >= 0.99*STEP_SIZE && dt00 != 0.0) {
                vec3 dpdt = (screenToWorld(ro+rd*(t+0.01))-screenToWorld(ro+rd*(t-0.01)))/0.02;
                float dt_ = length(dpdt)/length(rd)*dt;
                a *= (dt*dt) / (dt_*dt_);
                float discon0 = (abs(v0-v00)/dt00) / (abs(v-v00)/(dt00+dt0));
                float discon1 = (abs(v-v0)/dt0) / (abs(v-v00)/(dt00+dt0));
                float k = discon1 / discon0 * (0.02) - 1.0;
                if (k > 0.) {
                    col = mix(vec3(1,0,0), col, clamp(exp(-1.0*k),0.0,1.0));
                    absorb += DISCONTINUITY_OPACITY*max(10.0*k,0.0);
                }
            }
#endif
            if (isnan(v) || isinf(v) || isnan(absorb) || isinf(absorb)) {
                col = vec3(0,1,0);
                absorb = 0.1;
            }
            col = pow(col, vec3(6));
            totabs *= exp(-absorb*dt);
            totemi += col*absorb*totabs*dt;
#endif
            // update
            dt00 = dt0, dt0 = dt, t0 = t, v00 = v0, v0 = v, g00 = g0, g0 = g;
            dt = (isnan(g) || g==0.) ? STEP_SIZE :
                clamp(abs(v/g)-STEP_SIZE, 0.05*STEP_SIZE, STEP_SIZE);
            t += dt;
        }
    }
    vec3 col = calcColor(ro, rd, t).xyz;
    return totemi + col * totabs;
}

#else  // !{%TRANSPARENCY%}

vec3 render(in vec3 ro, in vec3 rd, float t0, float t1) {
    float t = t0, dt = STEP_SIZE;
    float v = 0.0, v0 = v, v00 = v, g0 = 0.0, g;
    float dt0 = 0.0, dt00 = 0.0;
    int i = int(ZERO);
    vec3 tcol = vec3(0);
    float mcol = 1.0;
    vec3 totemi = vec3(0.0);
    float totabs = 1.0;
    for (; i < MAX_STEP && t < t1; t += dt, i++) {
        v = funS(ro+rd*t);
        if (v*v0 < 0.0 && mcol > 0.01) {  // intersection
            if (isnan(g) || g <= 0.0) g = 1.0;
            if (isnan(g0) || g0 <= 0.0) g0 = g;
            float tm = t - dt * (v/g) / ((v/g) - (v0/g0));
            vec4 rgba = calcColor(ro, rd, tm);
            tcol += totabs * mcol * rgba.xyz * rgba.w;
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
#if {%FIELD%}
        // field
        vec3 col = colorSdf(0.5+0.5*sin(ISOSURFACE_FREQUENCY*PI*0.5*
            log(abs(v))/log(10.) ));
        float absorb = FIELD_EMISSION;
        if (isnan(v) || isinf(v) || isnan(absorb) || isinf(absorb)) {
            col = vec3(0,1,0);
            absorb = 0.1;
        }
        col = pow(col, vec3(6));
        totabs *= exp(-absorb*dt);
        totemi += col*mcol*absorb*totabs*dt;
#endif
    }
    return tcol + totemi + mcol * BACKGROUND_COLOR;
}

#endif


void main(void) {
    vec3 ro_s = vec3(vXy-screenCenter,0);
    vec3 rd_s = vec3(0,0,1);
    vec4 tt = texelFetch(iChannel0, ivec2(vec2(textureSize(iChannel0, 0))*(0.5+0.5*vXy)), 0);
    float pad = max(STEP_SIZE, 1./255.);
    vec3 col = BACKGROUND_COLOR;
#if {%CLIP%}
    vec3 ro_w = screenToWorld(ro_s);
    vec3 rd_w = screenToWorld(ro_s+rd_s)-ro_w;
    float t0, t1;
    if (boxIntersection(ro_w, rd_w, t0, t1)) {
        t0 = dot(worldToScreen(ro_w+t0*rd_w)-ro_s, rd_s);
        vec3 p1 = worldToScreen(ro_w+t1*rd_w);
        t1 = p1==vec3(-1) ? 1.0 : dot(p1-ro_s, rd_s);
        tt.z = max(t0, 0.0); tt.w = min(t1, 1.0);
        col = render(ro_s, rd_s,
            tt.z>=254./255.?1.: max(tt.x-pad, max(tt.z, 0.0)),
            min(tt.y+pad, min(tt.w, 1.0))
        );
    }
    else col = clamp(mix(col, vec3(0.5), -0.2), 0.0, 1.0);
#else
    col = render(ro_s, rd_s,
        tt.z>=254./255.?1.: max(tt.z-pad, max(tt.z, 0.0)),
        min(tt.w+pad, min(tt.w, 1.0))
    );
#endif
    col = pow(col, vec3(1./2.2));
    col -= vec3(1.5/255.)*fract(0.13*gl_FragCoord.x*gl_FragCoord.y);  // reduce "stripes"
    // col = vec3(callCount) / 255.0;
    fragColor = vec4(clamp(col,0.,1.), 1.0);
}
