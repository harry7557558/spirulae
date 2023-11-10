#version 300 es
precision highp float;

in vec2 vXy;
out vec4 fragColor;

uniform sampler2D iChannel0;
uniform mat4 transformMatrix;
uniform vec2 screenCenter;
uniform float uScale;
uniform vec3 uClipBox;

uniform float rBrightness;
uniform float rZScale;

uniform float ZERO;  // used in loops to reduce compilation time
#define PI 3.1415926


// Random number generator
float seed;
float hash31(vec3 p) {
    vec3 p3 = fract(p*1.1031);
    p3 += dot(p3, p3.zxy + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}
float randf() {
    // seed = hash31(vec3(seed,1,1));
    seed = fract(sin(12.9898*seed+78.233) * 43758.5453);
    return seed;
}


#if {%LIGHT_THEME%}
#define BACKGROUND_COLOR vec3(0.8)
#else
#define BACKGROUND_COLOR vec3(4e-4, 5e-4, 6e-4)
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

#if {%CLIP%}==1
bool clipIntersection(vec3 ro, vec3 rd, out float tn, out float tf) {
    vec3 inv_rd = 1.0 / rd;
    vec3 n = inv_rd*(ro);
    vec3 k = abs(inv_rd)*0.8*uClipBox;
    vec3 t1 = -n - k, t2 = -n + k;
    tn = max(max(t1.x, t1.y), t1.z);
    tf = min(min(t2.x, t2.y), t2.z);
    if (tn > tf) return false;
    return true;
}
#elif {%CLIP%}==2
bool clipIntersection(vec3 ro, vec3 rd, out float t1, out float t2) {
	float a = dot(rd/uClipBox,rd/uClipBox);
	float b = -dot(rd/uClipBox,ro/uClipBox);
	float c = dot(ro/uClipBox,ro/uClipBox)-1.0;
	float delta = b*b-a*c;
	if (delta < 0.0) return false;
	delta = sqrt(delta);
	t1 = (b-delta)/a, t2 = (b+delta)/a;
	if (t1>t2) { float t=t1; t1=t2; t2=t;}
	return true;
}
#endif


// function and its gradient in world space
#define ZETA_FAST
#include "../shaders/complex.glsl"

{%FUN%}
#line 82

int callCount = 0;
vec2 funz(vec2 z) {  // function
    callCount += 1;
    return funRaw(z);
}

#line 90
float fun(vec3 p) {
    vec2 z = funz(p.xy);
    return p.z - rZScale*({%HZ%});
}

// numerical normal
vec3 funGrad(vec3 p) {
    float h = 0.002*length(p.xy);
    return normalize(vec3(vec2(
        fun(p+vec3(h,0,0)) - fun(p-vec3(h,0,0)),
        fun(p+vec3(0,h,0)) - fun(p-vec3(0,h,0))
    ), 2.0*h));
}


// function and its gradient in screen space

float funS(vec3 p) {
    return fun(screenToWorld(p));
}


#define STEP_SIZE (({%STEP_SIZE%})*(0.5))
#define MAX_STEP int(10.0/(STEP_SIZE))

uniform vec3 LDIR;
#define OPACITY 0.6

// Domain coloring
float hue2rgb(float p, float q, float t) {
    if (t < 0.) t += 1.;
    if (t > 1.) t -= 1.;
    if (t < 1./6.) return p + (q - p) * 6. * t;
    if (t < 1./2.) return q;
    if (t < 2./3.) return p + (q - p) * (2./3. - t) * 6.;
    return p;
}
vec3 hslToRgb(float h, float s, float l) {
    if (s == 0.) return vec3(l);
    // float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float q = -0.05*log(exp(-20.*(l*(1.+s)))+exp(-20.*(l+s-l*s)));
    float p = 2. * l - q;
    return vec3(
        hue2rgb(p, q, h + 1./3.),
        hue2rgb(p, q, h),
        hue2rgb(p, q, h - 1./3.)
    );
}
vec3 colorDomain(vec2 z) {
    float h = atan(z.y, z.x) * 0.15915494309189535;
    float s = 1.0;
    float brightness = pow(rBrightness, 0.5);
    float k = 2.5-brightness;
    float bri = pow(brightness,k)/(pow(brightness,k)+pow(1.-brightness,k));
    float l = 1.0 - pow(1.0-bri, log(log(length(z) + 1.0) + 1.05));
    l = mix(0.1, 0.8, l);
    return max(hslToRgb(h, s, l), 0.);
}

// calculate the color at one point, parameters are in screen space
float grid1(vec3 p, vec3 n, float w) {
    p.z /= rZScale;
    n = normalize(n/vec3(1,1,rZScale));
    vec3 a = 1.0 - abs(1.0-2.0*fract(p));
    a.z *= rZScale;
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
    float g = min(min(mix(0.65, 1.0, g0), mix(mix(0.8,0.65,fs), 1.0, g1)), mix(mix(1.0,0.8,fs), 1.0, g2));
    return 0.1+0.9*g;
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
    vec2 z = funz(p.xy);
    vec3 n = funGrad(p);
    rd = normalize(screenToWorld(ro+rd)-screenToWorld(ro));
    n = dot(n,rd)>0. ? -n : n;
    float g = bool({%GRID%}) ? 1.1*pow(grid(p, n),1.8) : 1.0;
    vec3 albedo = pow(colorDomain(z), vec3(1.8)) * g;
    vec3 amb = (vec3(0.2+0.0*n.y)+0.15*BACKGROUND_COLOR) * albedo;
    vec3 dif = 0.6*max(dot(n,LDIR),0.0) * albedo;
    vec3 spc = pow(max(dot(reflect(rd,n),LDIR),0.0),40.0) * 0.05*pow(albedo,vec3(0.5));
    vec3 col = amb + dif + spc;
    if (isnan(dot(col, vec3(1))))
        return vec4(mix(BACKGROUND_COLOR, vec3(0,0.5,0)*g, fade(t)), 1.0);
    return vec4(
        mix(BACKGROUND_COLOR, col, fade(t)),
        1.0-pow(1.0-OPACITY,abs(1.0/dot(rd,n)))
    );
}

// Without opacity, finds the zero using bisection search
vec3 vSolid(in vec3 ro, in vec3 rd, float t0, float t1) {
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
                clamp(min(abs(v/g)-STEP_SIZE, t1-t0-0.01*STEP_SIZE), 0.05*STEP_SIZE, STEP_SIZE);
            dt00 = dt0, dt0 = dt, t0 = t, v00 = v0, v0 = v;
            dt *= 0.9+0.2*randf();
            dt = max(min(t1-t, dt), 0.01*STEP_SIZE);
            t += dt;
        }
        if (++i >= MAX_STEP || t > t1) return BACKGROUND_COLOR;
    }
    return calcColor(ro, rd, t).xyz;
}

void main(void) {
    seed = hash31(vec3(gl_FragCoord.xy,0));

    vec3 ro_s = vec3(vXy-(-1.0+2.0*screenCenter),0);
    vec3 rd_s = vec3(0,0,1);
    // vec4 tt = texelFetch(iChannel0, ivec2(vec2(textureSize(iChannel0, 0))*(0.5+0.5*vXy)), 0);
    vec4 tt = texture(iChannel0, 0.5+0.5*vXy);
    float pad1 = max(STEP_SIZE, 1./255.);
    float pad0 = pad1 + randf()/255.;
    vec3 col = BACKGROUND_COLOR;
#if {%CLIP%}
    vec3 ro_w = screenToWorld(ro_s);
    vec3 rd_w = screenToWorld(ro_s+rd_s)-ro_w;
    float t0, t1;
    if (clipIntersection(ro_w, rd_w, t0, t1)) {
        t0 = dot(worldToScreen(ro_w+t0*rd_w)-ro_s, rd_s);
        vec3 p1 = worldToScreen(ro_w+t1*rd_w);
        t1 = p1==vec3(-1) ? 1.0 : dot(p1-ro_s, rd_s);
        tt.z = max(t0, 0.0); tt.w = min(t1, 1.0);
        col = vSolid(ro_s, rd_s,
            tt.z>=254./255.?1.: max(tt.x-pad0, max(tt.z, 0.0)),
            min(tt.y+pad1, min(tt.w, 1.0))
        );
    }
    else col = clamp(mix(col, vec3(0.5), -10.0), 0.0, 1.0);
#else
    col = vSolid(ro_s, rd_s,
        tt.z>=254./255.?1.: max(tt.x-pad0, max(tt.z, 0.0)),
        min(tt.y+pad1, min(tt.w, 1.0))
    );
#endif
    // vec3 col = vSolid(ro, rd, t01.x==1.?1.:max(t01.x-pad, 0.0), min(t01.y+pad, 1.0));
    col = (col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14);
    col = pow(col, vec3(1.0/2.2));
    col -= vec3(1.5/255.)*fract(0.13*gl_FragCoord.x*gl_FragCoord.y);  // reduce "stripes"
    fragColor = vec4(clamp(col,0.,1.), 1.0);
}
