#version 300 es
precision highp float;

in vec2 vXy;
out vec4 fragColor;

uniform mat4 transformMatrix;
uniform vec2 screenCenter;
uniform vec3 uClipBox;

uniform float ZERO;  // used in loops to reduce compilation time
#define PI 3.1415926

#define ZETA_FAST
#include "../shaders/complex.glsl"


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

{%FUN%}
#line 54

int callCount = 0;
float fun(vec3 p) {  // function
    callCount += 1;
#if {%Y_UP%}
    float x=p.x, y=p.z, z=-p.y;
#else
    float x=p.x, y=p.y, z=p.z;
#endif
    return funRaw(x, y, z);
    // return funRaw(x, y, z).w;
}


// function and its gradient in screen space

float funS(vec3 p) {
    return fun(screenToWorld(p));
}


#define STEP_SIZE (({%STEP_SIZE%})*0.5)
#define MAX_STEP int(10.0/(STEP_SIZE))

// returns the inverval to check for intersections
// approximates the gradient from three previous values
vec2 premarch(in vec3 ro, in vec3 rd, float t0_, float t1_) {
    float t0 = -1.0, t1 = -1.0;
    float min_t = t0_, min_v = 1e12;
    float t = ZERO+t0_, dt = STEP_SIZE;
    float v = 0.0, v0 = v, v00 = v;
    float dt0 = 0.0, dt00 = 0.0;
    int i = int(ZERO);
    for (; i < MAX_STEP && t < t1_; t += dt, i++) {
        v = funS(ro+rd*t);
        if (isnan(dt0) || dt0 <= 0.0) v00 = v, v0 = v, dt0 = dt00 = 0.0;
        float g = dt0 > 0.0 ? ( // estimate gradient
            dt00 > 0.0 ? // quadratic fit
                v00*dt0/(dt00*(dt0+dt00))-v0*(dt0+dt00)/(dt0*dt00)+v*(2.*dt0+dt00)/(dt0*(dt0+dt00))
                : (v-v0)/dt0  // finite difference
        ) : 0.;
        float dt1 = (isnan(g) || g==0.) ? STEP_SIZE :
            clamp(abs(v/g)-STEP_SIZE, 0.05*STEP_SIZE, STEP_SIZE);
        if (abs(v/g) < min_v) min_t = t, min_v = abs(v/g);
        if (v*v0 < 0.0) {
            if (t0 < 0.) t0 = t - dt, t1 = t + dt1;
            else t1 = t;
        }
        dt = dt1;
        dt00 = dt0, dt0 = dt, v00 = v0, v0 = v;
        if (i == 1) dt *= randf();
        else dt *= 0.9+0.2*randf();
    }
    if (t0 < t0_) t0 = t1 = min_t;
    return vec2(t0, t1);
}


void main(void) {
    seed = hash31(vec3(gl_FragCoord.xy,0));

    vec3 ro_s = vec3(vXy-(-1.0+2.0*screenCenter),0);
    vec3 rd_s = vec3(0,0,1);
#if {%CLIP%}
    vec3 ro_w = screenToWorld(ro_s);
    vec3 rd_w = screenToWorld(ro_s+rd_s)-ro_w;
    float t0, t1;
    if (clipIntersection(ro_w, rd_w, t0, t1)) {
        t0 = dot(worldToScreen(ro_w+t0*rd_w)-ro_s, rd_s);
        vec3 p1 = worldToScreen(ro_w+t1*rd_w);
        t1 = p1==vec3(-1) ? 1.0 : dot(p1-ro_s, rd_s);
        t0 = max(t0, 0.0); t1 = min(t1, 1.0);
        fragColor.xy = fragColor.zw = vec2(t0, t1);
#if {%FIELD%}==0
        fragColor.xy = premarch(ro_s, rd_s, t0, t1);
#endif
    }
    else fragColor = vec4(1, 1, 1, 1);
#else // {%CLIP%}
    fragColor.xy = fragColor.zw = vec2(0, 1);
#if {%FIELD%}==0
    fragColor.xy = premarch(ro_s, rd_s, 0.0, 1.0);
#endif
#endif // {%CLIP%}
}
