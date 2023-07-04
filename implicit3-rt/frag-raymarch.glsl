#version 300 es
precision highp float;

in vec2 vXy;
out vec4 fragColor;

uniform mat4 transformMatrix;
uniform vec2 screenCenter;
uniform float uScale;
uniform vec3 uClipBox;

uniform float ZERO;  // used in loops to reduce compilation time
#define PI 3.1415926

#if {%LIGHT_THEME%} && {%FIELD%}==0
#define BACKGROUND_COLOR vec3(0.82,0.8,0.78)
#else
#define BACKGROUND_COLOR vec3(4e-4, 5e-4, 6e-4)
#endif

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

{%FUN%}
#line 62

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

vec3 funGrad(vec3 p) {  // numerical gradient
    float h = 0.002*length(p);
    return vec3(
        fun(p+vec3(h,0,0)) - fun(p-vec3(h,0,0)),
        fun(p+vec3(0,h,0)) - fun(p-vec3(0,h,0)),
        fun(p+vec3(0,0,h)) - fun(p-vec3(0,0,h))
    ) / (2.0*h);
}

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
    // vec3 ncalc = funRaw(p.x,p.y,p.z).xyz;
    // vec3 ndiff = vec3(1) * length(n0-ncalc);
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
    // albedo = vec3(1) * ndiff;
    vec3 amb = (0.1+0.2*BACKGROUND_COLOR) * albedo;
    vec3 dif = 0.6*max(dot(n,LDIR),0.0) * albedo;
    vec3 spc = min(1.2*pow(max(dot(reflect(rd,n),LDIR),0.0),100.0),1.) * vec3(20.);
    vec3 rfl = mix(vec3(1.), vec3(4.), clamp(5.*dot(reflect(rd,n),LDIR),0.,1.));
    // spc *= albedo, rfl *= albedo;
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


float intersectObjectS(in vec3 ro, in vec3 rd, float t0, float t1) {
    // screen space
    // raymarching - https://www.desmos.com/calculator/mhxwoieyph
    float t = t0, dt = STEP_SIZE;
    float v = 0.0, v0 = v, v00 = v, v1;
    float dt0 = 0.0, dt00 = 0.0;
    float dvdt, old_dvdt;  // discontinuity checking
    bool isBisecting = false;
    int i = int(ZERO);
    vec3 totemi = vec3(0.0);
    float totabs = 1.0;
    float prevField = 0.0; vec3 prevFieldCol;
    while (true) {
        if (++i >= MAX_STEP || t > t1) {
            return -1.0;
        }
        v = funS(ro+rd*t);
        if (isBisecting) {  // bisection search
            // if (t1-t0 <= STEP_SIZE/64.) break;
            if (t1-t0 <= 1e-4) break;
            if (v*v0 < 0.0) t1 = t, v1 = v;
            else t0 = t, v0 = v;
            t = 0.5*(t0+t1);
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
            dt = (g==0. || isnan(ddt) || isinf(ddt)) ? STEP_SIZE :
                clamp(min(ddt-STEP_SIZE, t1-t0-0.01*STEP_SIZE), 0.05*STEP_SIZE, STEP_SIZE);
            t += dt;
        }
    }
    return t;
    // vec3 col = calcColor(ro, rd, t).xyz;
    // return totemi + col * totabs;
}

float intersectObject(in vec3 ro, in vec3 rd, float t0, float t1) {
    rd = normalize(rd);
#if {%CLIP%}
    float t0_, t1_;
    if (!clipIntersection(ro, rd, t0_, t1_))
        return -1.0;
    t0 = max(t0, t0_), t1 = min(t1, t1_);
    if (t1 < t0) return -1.0;
#endif
    vec3 ro_s = worldToScreen(ro);
    vec3 rd_s = normalize(worldToScreen(ro+rd)-ro_s);
    t0 = dot(worldToScreen(ro+t0*rd)-ro_s, rd_s);
    vec3 p1 = worldToScreen(ro+t1*rd);
    t1 = p1==vec3(-1) ? 1.0 : dot(p1-ro_s, rd_s);
    float t = intersectObjectS(ro_s, rd_s, t0, t1);
    if (t < 0.) return -1.;
    t = dot(screenToWorld(ro_s+rd_s*t)-ro, rd);
    return t;
}


// define materials
const int MAT_NONE = -1;
const int MAT_BACKGROUND = 0;
const int MAT_PLANE = 1;
const int MAT_OBJECT = 2;


vec3 mainRender(vec3 ro, vec3 rd) {
    vec3 m_col = vec3(1.0), t_col = vec3(0.0), col;
    bool is_inside = false;

    for (int iter = int(ZERO); iter < 10; iter++) {
        ro += 1e-3 * rd;
        vec3 n, min_n;
        float t, min_t = 1e12;
        vec3 min_ro = ro, min_rd = rd;
        int material = MAT_BACKGROUND;

        // plane
        t = -ro.z / rd.z;
        if (t > 0.0) {
            min_t = t, min_n = vec3(0,0,1);
            min_ro = ro+rd*t, min_rd = rd;
            col = vec3(0.8, 0.9, 1);
            material = MAT_PLANE;
        }

        // object
        t = intersectObject(ro, rd, 0.0, min_t);
        if (t > 0.0 && t < min_t) {
            min_t = t;
            min_n = normalize(funGrad(ro+rd*t));
            min_ro = ro+rd*t, min_rd = rd;
            col = vec3(1,0.5,0.2);
            material = MAT_OBJECT;
        }

        // update ray
        if (material == MAT_BACKGROUND) {
            col = vec3(max(rd.z, 0.0));
            return m_col * col + t_col;
        }
        ro = min_ro, rd = min_rd;
        min_n = dot(rd,min_n) < 0. ? min_n : -min_n;
        rd -= 2.0*dot(rd, min_n) * min_n;
        m_col = m_col * col;
        if (dot(rd, min_n) < 0.)
            is_inside = !is_inside;
        if (is_inside) return vec3(1,0,0);

    }
    return m_col + t_col;
}


void main(void) {
    vec3 ro_s = vec3(vXy-(-1.0+2.0*screenCenter),0);
    vec3 rd_s = vec3(0,0,1);
    vec3 ro = screenToWorld(ro_s);
    vec3 rd = normalize(screenToWorld(ro_s+rd_s)-ro);
    vec3 col = mainRender(ro, rd);
    col = pow(col, vec3(1./2.2));
    fragColor = vec4(col, 1.0);
}
