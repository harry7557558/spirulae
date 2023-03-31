#version 300 es
precision highp float;

in vec2 vUv;
in vec3 vXyz;
out vec4 fragColor;


uniform mat4 transformMatrix;
uniform vec2 screenCenter;
uniform float uScale;

uniform float ZERO;  // used in loops to reduce compilation time
#define PI 3.1415926



{%FUN%}
#line 20


vec3 F(float u, float v) {
    vec3 p = funRaw(u, v);
#if {%Y_UP%}
    return vec3(p.x, -p.z, p.y);
#endif
    return p;
}
vec3 dFdu(float u, float v) {
    float h = 1e-3;
    return (F(u+h,v)-F(u-h,v))/(2.0*h);
}
vec3 dFdv(float u, float v) {
    float h = 1e-3;
    return (F(u,v+h)-F(u,v-h))/(2.0*h);
}

// u, v => f
// https://en.wikipedia.org/wiki/Parametric_surface#Local_differential_geometry
// https://en.wikipedia.org/wiki/First_fundamental_form
// https://en.wikipedia.org/wiki/Second_fundamental_form
void dF(float u, float v,
    out vec3 f, out vec3 fu, out vec3 fv, out mat2 I1, out mat2 I2
) {
    float h = 0.005;
    vec3 f00 = F(u-h, v-h);
    vec3 f01 = F(u-h, v);
    vec3 f02 = F(u-h, v+h);
    vec3 f10 = F(u, v-h);
    vec3 f11 = F(u, v);
    vec3 f12 = F(u, v+h);
    vec3 f20 = F(u+h, v-h);
    vec3 f21 = F(u+h, v);
    vec3 f22 = F(u+h, v+h);
    f = f11;
    // fu = (f21-f01)/(2.0*h);
    // fv = (f12-f10)/(2.0*h);
    fu = dFdu(u, v), fv = dFdv(u, v);
    I1 = mat2(dot(fu,fu), dot(fu,fv), dot(fu,fv), dot(fv,fv));
    vec3 n = normalize(cross(fu, fv));
    vec3 ruu = (f21+f01-2.0*f11)/(h*h);
    vec3 rvv = (f12+f10-2.0*f11)/(h*h);
    vec3 ruv = (f00+f22-f02-f20)/(4.0*h*h);
    I2 = mat2(dot(ruu,n), dot(ruv,n), dot(ruv,n), dot(rvv,n));
}



vec3 screenToWorld(vec3 p) {
    vec4 q = inverse(transformMatrix) * vec4(p, 1);
    return q.xyz / q.w;
}



#if {%LIGHT_THEME%}
#define BACKGROUND_COLOR vec3(0.82,0.8,0.78)
#else
#define BACKGROUND_COLOR vec3(4e-4, 5e-4, 6e-4)
#endif

uniform vec3 LDIR;

// calculate the color at one point, parameters are in screen space
float grid1(vec3 p, vec3 n, float w) {
    vec3 a = 1.0 - abs(1.0-2.0*fract(p));
    a = clamp(2.*a/w-sqrt(1.-n*n), 0., 1.);
    // return min(min(a.x,a.y),a.z);
    return ((a.x+1.)*(a.y+1.)*(a.z+1.)-1.)/7.;
}
vec2 grid1(vec2 uv, vec2 w) {
    vec2 a = 1.0-abs(1.0-2.0*fract(uv));
    a = clamp(2.*a/w-0.1, 0.0, 1.0);
    return a;
}
float gridXyz(vec3 p, vec3 n) {
    float scale = 4.0 / dot(transpose(transformMatrix)[3], vec4(p, 1));
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
float gridUv(vec2 uv, vec3 fu, vec3 fv, vec3 p, vec3 n0) {
    vec2 luv = vec2(length(fu), length(fv));
    vec2 scale = 8.0 * luv / dot(transpose(transformMatrix)[3], vec4(p, 1));
    vec2 ls = log(scale) / log(10.);
    vec2 fs = pow(ls - floor(ls), vec2(1.0));
    vec2 es = pow(vec2(10.), floor(ls));
    vec2 q0 = es*uv;
    vec2 q1 = 10.*q0;
    vec2 q2 = 10.*q1;
    vec2 w0 = 0.2*es/scale;
    vec2 w1 = mix(vec2(1.),vec2(10.),fs)*w0;
    vec2 g0 = grid1(q0, w0);
    vec2 g1 = grid1(q1, w1);
    vec2 g2 = grid1(q2, w1);
    vec2 g = min(min(
        vec2(mix(vec2(0.65), vec2(1.0), g0)),
        mix(mix(vec2(0.8),vec2(0.65),fs), vec2(1.0), g1)),
        mix(mix(vec2(1.0),vec2(0.8),fs), vec2(1.0), g2)
    );
    return clamp(1.2*min(g.x,g.y)-0.1, 0.8, 0.95);
}
float fade(float t) {
    t = smoothstep(0.7, 1., t);
    t = t/(1.-t);
    t = mix(pow(0.8*t, 0.8), pow(0.2*t, 1.5),
        smoothstep(0., 0.8, dot(BACKGROUND_COLOR,vec3(1./3.))));
    t = pow(t, 1.2);
    t *= bool({%XRAY%}) ? 1.0/2.2 : 1.0;
    return exp(-t);
}
vec3 colormap(float t) {
    t = 0.5-0.5*cos(PI*log(t)/log(10.));
    return vec3(.372,.888,1.182) + vec3(.707,-2.123,-.943)*t
        + vec3(.265,1.556,.195)*cos(vec3(5.2,2.48,8.03)*t-vec3(2.52,1.96,-2.88));
}
vec4 calcColor(vec3 p, vec3 rd, float t, vec3 n0,
    float u, float v, vec3 fu, vec3 fv, mat2 I1, mat2 I2
) {
    n0 = dot(n0,rd)>0. ? -n0 : n0;
    vec3 n = normalize(n0);
#if {%Y_UP%}
    n0 = vec3(n0.x, n0.z, -n0.y);
#endif // {%Y_UP%}

    // grid
    float g = 1.0;
#if {%GRID%} == 1
    g = 1.2*gridUv(vec2(u,v), fu, fv, p, n0);
#elif {%GRID%} == 2
    g = 1.1*gridXyz(p, n);
#endif // {%GRID%}
#if {%XRAY%}&&!{%LIGHT_THEME%}
    g = 1.8 * exp(-0.5*smoothstep(0.95, 1.15, g));
#endif

#if {%COLOR%} == 0

    // default color
    vec3 albedo = g * mix(vec3(0.7), normalize(n0), 0.1);
#if {%XRAY%}
    vec3 col = albedo;
#else // {%XRAY%}
    // porcelain-like shading
    vec3 amb = (0.1+0.2*BACKGROUND_COLOR) * albedo;
    vec3 dif = 0.6*max(dot(n,LDIR),0.0) * albedo;
    vec3 spc = min(1.2*pow(max(dot(reflect(rd,n),LDIR),0.0),100.0),1.) * vec3(20.);
    vec3 rfl = mix(vec3(1.), vec3(4.), clamp(5.*dot(reflect(rd,n),LDIR),0.,1.));
    vec3 col = mix(amb+dif, rfl+spc, mix(.01,.2,pow(clamp(1.+dot(rd,n),.0,.8),5.)));
#endif // {%XRAY%}

#else // {%COLOR%} == 0

    // colors
#if {%COLOR%} == 1
    vec3 albedo = vec3(u, v, 0.5);
    const vec3 ak = vec3(0.7);
    // albedo = pow(albedo, ak) / (pow(albedo, ak) + pow(1.0-albedo, ak));
    // albedo = pow(albedo, vec3(0.8));
    albedo = 0.2 + 0.8 * albedo;
#elif {%COLOR%} == 2
    // color based on normal
    vec3 albedo = mix(vec3(1.0), normalize(n0), 0.45);
    albedo /= 1.2*pow(dot(albedo, vec3(0.299,0.587,0.114)), 0.4);
#elif {%COLOR%} == 3
    // heatmap color based on gradient magnitude
    vec3 albedo = colormap(length(n0));
#elif {%COLOR%} == 4
    // heatmap color based on curvature
    float k = determinant(I2)/determinant(I1);
    vec3 albedo = k>0. ? colormap(sqrt(k)) : colormap(sqrt(-k));
#endif // {%COLOR%} == 1
    albedo *= g;
#if {%XRAY%}
    vec3 col = albedo;
#else // {%XRAY%}
    // phong shading
    albedo = pow(albedo, vec3(2.2));
    vec3 amb = (0.05+0.2*BACKGROUND_COLOR) * albedo;
    vec3 dif = 0.6*pow(max(dot(n,LDIR),0.0),1.5) * albedo;
    vec3 spc = pow(max(dot(reflect(rd,n),LDIR),0.0),40.0) * vec3(0.06) * pow(albedo,vec3(0.2));
    vec3 col = amb + dif + spc;
#endif // {%XRAY%}

#endif // {%COLOR%} == 0

    if (isnan(dot(col, vec3(1))))
        return vec4(mix(BACKGROUND_COLOR, vec3(0,0.5,0)*g, fade(t)), 1.0);
    return vec4(
        mix(BACKGROUND_COLOR, col, fade(t)),
        1.0-pow(0.9,abs(1.0/dot(rd,n)))
    );
}


void main() {
    float u = vUv.x, v = vUv.y;
    vec3 p, fu, fv; mat2 I1, I2;
    dF(u, v, p, fu, fv, I1, I2);
    vec3 n0 = cross(fu, fv);
    vec4 pt_ = transformMatrix * vec4(p,1);
    vec3 pt = pt_.xyz / pt_.w;
    vec3 rd = normalize(screenToWorld(pt+vec3(0,0,0.001))-screenToWorld(pt));
    float t = clamp(pt.z, 0., 1.);
    vec4 col0 = calcColor(p, rd, t, n0, u, v, fu, fv, I1, I2);
#if {%XRAY%}
#if {%LIGHT_THEME%}
    vec3 col = col0.xyz * (1.0-0.5*pow(col0.w,1.0));
    col = 0.9 * pow(col, vec3(0.4));
#else
    vec3 col = col0.xyz * col0.w;
#endif
#else // {%XRAY%}
    vec3 col = col0.xyz;
    col = pow(col, vec3(1./2.2));
#endif // {%XRAY%}
    col -= vec3(1.5/255.)*fract(0.13*gl_FragCoord.x*gl_FragCoord.y);  // reduce "stripes"
    fragColor = vec4(clamp(col,0.,1.), 1.0);
}

