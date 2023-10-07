#version 300 es
precision highp float;

in vec2 vXy;
out vec4 fragColor;

uniform vec2 iResolution;
uniform vec2 xyMin;
uniform vec2 xyMax;

#define DIFF_ORDER {%DEBUG%}

// function
{%FUN%}
#line 17

float fun(vec2 p) {
#if DIFF_ORDER == 0
    return funRaw(p.x, p.y);
#elif DIFF_ORDER == 1
    return funRaw(p.x, p.y).z;
#elif DIFF_ORDER == 2
    return funRaw(p.x, p.y)[2][2];
#endif
}

// numerical gradient
vec2 funGradN(vec2 p) {
    float h = 0.001*pow(dot(p,p),1.0/6.0);
    return vec2(
        fun(p+vec2(h,0)) - fun(p-vec2(h,0)),
        fun(p+vec2(0,h)) - fun(p-vec2(0,h))
    ) / (2.0*h);
}

// analytical gradient
vec3 funGrad(vec2 p) {
#if DIFF_ORDER == 0
    return vec3(funGradN(p), fun(p));
#elif DIFF_ORDER == 1
    return funRaw(p.x, p.y);
#elif DIFF_ORDER == 2
    return funRaw(p.x, p.y)[2];
#endif
}

// numerical hessian
mat2 funHessN(vec2 p) {
    float h = 0.002*pow(dot(p,p),1.0/6.0);
    float f = fun(p);
    float fxx = (fun(p+vec2(h,0))+fun(p-vec2(h,0))-2.0*f)/(h*h);
    float fyy = (fun(p+vec2(0,h))+fun(p-vec2(0,h))-2.0*f)/(h*h);
    float fxy = (fun(p+vec2(h,h))+fun(p-vec2(h,h))-fun(p-vec2(h,-h))-fun(p-vec2(-h,h)))/(4.0*h*h);
    return mat2(fxx, fxy, fxy, fyy);
}

#if DIFF_ORDER == 2
// analytical hessian
mat2 funHess(vec2 p) {
    // return mat2(2, 0, 0, 0);
    // return mat2(2.0, 0, 0, 2.0);
    // {
    //     float x = p.x, y = p.y;
    //     float a = x*x+y*y-1.0;
    //     float fxx = 6.0*a*a+24.0*x*x*a-4.0*y*y*y;
    //     float fyy = 6.0*a*a+24.0*y*y*a-12.0*x*x*y;
    //     float fxy = 24.0*x*y*a-12.0*x*y*y;
    //     return mat2(fxx, fxy, fxy, fyy);
    // }
    return mat2(funRaw(p.x, p.y));
}
#endif


// grid
float grid1(vec2 p, float w) {
    vec2 a = 1.0 - abs(1.0-2.0*fract(p));
    a = a / w - 1. - (step(abs(p),vec2(.5))-1.);
    a = clamp(a, 0., 1.);
    return ((a.x+1.)*(a.y+1.)-1.)/3.;
}
float grid(vec2 p) {
    float scale = 16.0/length(xyMax-xyMin);
    float ls = log(scale) / log(10.);
    float fs = pow(ls - floor(ls), 1.0);
    float es = pow(10., floor(ls));
    vec2 q0 = es*p;
    vec2 q1 = 10.*q0;
    vec2 q2 = 10.*q1;
    float w0 = (30./sqrt(iResolution.x*iResolution.y))*es/scale;
    float w1 = mix(1.,10.,fs)*w0;
    float g0 = grid1(q0, w0);
    float g1 = grid1(q1, w1);
    float g2 = grid1(q2, 5.*w1);
    return min(min(mix(0.75,1.0,g0), mix(mix(0.95,0.75,fs), 1.0, g1)), mix(mix(1.0,0.95,fs), 1.0, g2));
}


void main(void) {
    vec2 uv = vXy;
    vec2 xy = mix(xyMin, xyMax, 0.5+0.5*uv);

    // get value and gradient
    vec3 gv = funGrad(xy);
    vec2 g = gv.xy;
    float v = gv.z;
    g = (xyMax-xyMin)/iResolution * g;

    // handle infinite discontinuity
    float k = 1./max(abs(v),1.);
    //k = exp(round(log(k)));
    k *= 4.;
    //v *= k, g *= k;
    // g /= v*v+1., v = atan(v);

    // shading
    float d = v / length(g);
    vec3 col = d < 0. ? vec3(0.6,0.7,1) : vec3(1,0.7,0.6);
    col = mix(vec3(0), col, clamp(abs(d)-1., 0.3, 1.));
    if (isnan(dot(g,g))) col = vec3(0,0.6,0);

#if DIFF_ORDER == 1
    col *= 1e2 * length(funGrad(xy).xy-funGradN(xy)) / abs(v);
#elif DIFF_ORDER == 2
    mat2 dH = funHess(xy)-funHessN(xy);
    col *= 1e1 * length(vec4(dH[0], dH[1])) / abs(v);
    // col *= 1e1 * length(vec2(dH[0][0], dH[1][1])) / abs(v);
    // col *= 1e1 * abs(dH[1][1]) / abs(v);
#endif

#if {%GRID%}
    col *= grid(xy);
#endif

    fragColor = vec4(clamp(col,0.,1.), 1.0);
}
