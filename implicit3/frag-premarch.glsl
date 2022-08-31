#version 300 es
precision highp float;

in vec2 vXy;
out vec4 fragColor;

uniform mat4 transformMatrix;
uniform vec2 screenCenter;

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
    float h = 0.002*max(pow(length(p),1./3.),1.);  // error term O(h²)
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
#else  // {%Y_UP%}
#define funGrad funGradA
#endif  // {%Y_UP%}
#else  // {%ANALYTICAL_GRADIENT%}
#define funGrad funGradN
#endif  // {%ANALYTICAL_GRADIENT%}


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

// returns the inverval to check for intersections

#if {%ANALYTICAL_GRADIENT%}

// gradient-based raymarching
vec2 premarch(in vec3 ro, in vec3 rd) {
    float t = ZERO, dt = STEP_SIZE;
    float v0 = funS(ro), v;
    float t0 = -1.0, t1 = -1.0;
    float min_t = 0.0, min_v = 1e12;
    int i = int(ZERO);
    for (t += dt; i < MAX_STEP && t < 1.0; t += dt, i++) {
        vec3 p = ro + rd * t;
        v = sdfS(p, rd);
        if (abs(v) < min_v) min_t = t, min_v = abs(v);
        float dt1 = isnan(v) ? STEP_SIZE : clamp(abs(v)-STEP_SIZE, 0.1*STEP_SIZE, STEP_SIZE);
        if (v*v0 < 0.0) {
            if (t0 < 0.) t0 = t - dt, t1 = t + dt1;
            else t1 = t;
        }
        v0 = v;
        dt = dt1;
    }
    if (t0 < 0.) t0 = t1 = min_t;
    return vec2(t0, t1);
}

#else // {%ANALYTICAL_GRADIENT%}

// approximates the gradient from three previous values
vec2 premarch(in vec3 ro, in vec3 rd) {
    float t0 = -1.0, t1 = -1.0;
    float min_t = 0.0, min_v = 1e12;
    float t = ZERO, dt = STEP_SIZE;
    float v = 0.0, v0 = v, v00 = v;
    float dt0 = 0.0, dt00 = 0.0;
    int i = int(ZERO);
    for (; i < MAX_STEP && t < 1.0; t += dt, i++) {
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
    }
    if (t0 < 0.) t0 = t1 = min_t;
    return vec2(t0, t1);
}

#endif // {%ANALYTICAL_GRADIENT%}


void main(void) {
    vec2 t = premarch(vec3(vXy-screenCenter,0), vec3(0,0,1));
    // t = vec2(0, 1);
    fragColor = vec4(t, 0.0, 1.0);
}
