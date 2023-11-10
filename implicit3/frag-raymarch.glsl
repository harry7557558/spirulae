#version 300 es
precision highp float;

in vec2 vXy;
out vec4 fragColor;

uniform sampler2D iChannel0;
uniform mat4 transformMatrix;
uniform vec2 screenCenter;
uniform float uScale;
uniform vec3 uClipBox;
uniform int lAxes;

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
bool isInClip(vec3 p) {
    vec3 b = 0.8*uClipBox;
    return abs(p.x) < b.x && abs(p.y) < b.y && abs(p.z) < b.z;
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
bool isInClip(vec3 p) {
    vec3 q = p / uClipBox;
    return dot(q, q) < 1.0;
}
#else
bool isInClip(vec3 p) {
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
    float h = 0.002*pow(dot(p,p), 1.0/6.0);
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
    // return min(min(a.x,a.y),a.z) / 1.0;
    return ((a.x+1.)*(a.y+1.)*(a.z+1.)-1.)/7.;
}
float getGridScale(vec3 p) {
    return 2.5 / dot(inverse(transpose(transformMatrix))[3], vec4(p, 1));
}
float grid(vec3 p, vec3 n) {
    float scale = getGridScale(p);
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


#if !{%TRANSPARENCY%}

// Without opacity, finds the zero using bisection search
// return rgbd
vec4 render(in vec3 ro, in vec3 rd, float t0, float t1) {
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
            return vec4(BACKGROUND_COLOR*totabs + totemi, 1.0);
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
                return vec4(totemi + col * totabs, t);
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
            dt *= 0.9+0.2*randf();
            dt = max(min(t1-t, dt), 0.01*STEP_SIZE);
            t += dt;
        }
    }
    vec3 col = calcColor(ro, rd, t).xyz;
    return vec4(totemi + col * totabs, t);
}

#else  // !{%TRANSPARENCY%}

vec4 render(in vec3 ro, in vec3 rd, float t0, float t1) {
    float t = t0, dt = STEP_SIZE;
    float t_res = 1.0;
    float v = 0.0, v0 = v, v00 = v, g0 = 0.0, g;
    float dt0 = 0.0, dt00 = 0.0;
    int i = int(ZERO);
    vec3 tcol = vec3(0);
    float mcol = 1.0;
    vec3 totemi = vec3(0.0);
    float totabs = 1.0;
    float prevField; vec3 prevFieldCol;
    for (; i < MAX_STEP && t < t1; t += dt, i++) {
        v = funS(ro+rd*t);
        if (v*v0 < 0.0 && mcol > 0.01) {  // intersection
            if (isnan(g) || g <= 0.0) g = 1.0;
            if (isnan(g0) || g0 <= 0.0) g0 = g;
            float tm = t - dt * (v/g) / ((v/g) - (v0/g0));
            vec4 rgba = calcColor(ro, rd, tm);
            tcol += totabs * mcol * rgba.xyz * rgba.w;
            mcol *= 1.0 - rgba.w;
            t_res = min(t_res, tm);
        }
        if (isnan(dt0) || dt0 <= 0.0) v00 = v, v0 = v, dt0 = dt00 = 0.0;
        g = dt0 > 0.0 ? ( // estimate gradient
            dt00 > 0.0 ? // quadratic fit
                v00*dt0/(dt00*(dt0+dt00))-v0*(dt0+dt00)/(dt0*dt00)+v*(2.*dt0+dt00)/(dt0*(dt0+dt00))
                : (v-v0)/dt0  // finite difference
        ) : 0.;
        if (isnan(g0) || g0 <= 0.0) g0 = g;
        float ddt = abs(v/g);
        dt = (g==0. || isnan(ddt) || isinf(ddt)) ? STEP_SIZE :
            clamp(min(ddt-STEP_SIZE, t1-t0-0.01*STEP_SIZE), 0.05*STEP_SIZE, STEP_SIZE);
        dt *= 0.9+0.2*randf();
        dt00 = dt0, dt0 = dt, v00 = v0, v0 = v, g0 = g;
#if {%FIELD%}
        // field
        float field = {%FIELD%}==1 ? 2.0*v*uScale : log(abs(v))/log(10.);
        vec3 fieldCol = colorField(field);
        if (i > 0) {
            vec3 col; float absorb;
            integrateField(prevField, field, prevFieldCol, fieldCol, col, absorb);
            totabs *= exp(-absorb*dt);
            totemi += col*mcol*absorb*totabs*dt;
        }
        prevField = field, prevFieldCol = fieldCol;
#endif
    }
    return vec4(tcol + totemi + mcol * BACKGROUND_COLOR, t_res);
}

#endif


void main(void) {
    seed = hash31(vec3(gl_FragCoord.xy,0));

    vec3 ro_s = vec3(vXy-(-1.0+2.0*screenCenter),0);
    // ro_s.xy += 2.*(vec2(randf(),randf())-0.5f) / vec2(4*textureSize(iChannel0,0));
    vec3 rd_s = vec3(0,0,1);
    // vec4 tt = texelFetch(iChannel0, ivec2(vec2(textureSize(iChannel0, 0))*(0.5+0.5*vXy)), 0);
    vec4 tt = texture(iChannel0, 0.5+0.5*vXy);
    float pad1 = max(STEP_SIZE, 1./255.);
    float pad0 = pad1 + randf()/255.;
    vec3 col = BACKGROUND_COLOR;
    vec4 colt;
    vec3 ro_w = screenToWorld(ro_s);
    vec3 rd_w = screenToWorld(ro_s+rd_s)-ro_w;
#if {%CLIP%}
    float t0w, t1w;
    if (clipIntersection(ro_w, rd_w, t0w, t1w)) {
        float t0 = dot(worldToScreen(ro_w+t0w*rd_w)-ro_s, rd_s);
        vec3 p1 = worldToScreen(ro_w+t1w*rd_w);
        float t1 = p1==vec3(-1) ? 1.0 : dot(p1-ro_s, rd_s);
        tt.z = max(t0, 0.0); tt.w = min(t1, 1.0);
        colt = render(ro_s, rd_s,
            tt.z>=254./255.?1.: max(tt.x-pad0, max(tt.z, 0.0)),
            min(tt.y+pad1, min(tt.w, 1.0))
        );
        col = colt.xyz;
    }
    else {
        col = clamp(mix(col, vec3(0.5), -0.2), 0.0, 1.0);
        colt = vec4(col, 1.0);
    }
#else
    colt = render(ro_s, rd_s,
        tt.z>=254./255.?1.: max(tt.x-pad0, max(tt.z, 0.0)),
        min(tt.y+pad1, min(tt.w, 1.0))
    );
    col = colt.xyz;
#endif

    // axes and grid
    if (lAxes > 0) {
        const vec3 X_COL = pow(vec3(0.98, 0.2, 0.31), vec3(2.2));
        const vec3 Y_COL = pow(vec3(0.55, 0.86, 0.), vec3(2.2));
        const vec3 Z_COL = pow(vec3(0.16, 0.55, 0.98), vec3(2.2));
        rd_w = normalize(rd_w);
        float tw = -ro_w.z / rd_w.z;
        float tmaxw = dot(screenToWorld(ro_s+colt.w*rd_s)-ro_w, rd_w);
        if (tw > 0.0 && tw < tmaxw) {
            float ts = dot(worldToScreen(ro_w+tw*rd_w)-ro_s, normalize(rd_s));
            vec3 p1 = ro_w + tw * rd_w;
            if (isInClip(p1/1.25)) {
                float grid_alpha = smoothstep(0.65, 0.85, grid(p1, vec3(0,0,1)));
                grid_alpha = pow(grid_alpha, 2.0);
                grid_alpha = 1.0 - clamp(grid_alpha, 0.4, 0.7);
                float lightmode = dot(BACKGROUND_COLOR,vec3(1./3.));
                grid_alpha *= 0.5 + 0.5*lightmode;
                vec3 grid_col = 0.4-0.3*BACKGROUND_COLOR;
                float scale = getGridScale(p1);
                vec3 axis_col = vec3(0.8-0.2*BACKGROUND_COLOR);
                if (lAxes == 1 || lAxes == 2) {
                vec3 paxis = abs(p1)*scale / 0.022;
                    if (paxis.y < 1.0 && paxis.y < paxis.x && (lAxes == 1 || p1.x > 0.0)) {
                        axis_col *= X_COL;
                        grid_alpha = 1.0;
                    }
                    if (paxis.x < 1.0 && paxis.x < paxis.y && (lAxes == 1 || p1.y > 0.0)) {
                        axis_col *= bool({%Y_UP%}) ? Z_COL : Y_COL;
                        grid_alpha = 1.0;
                    }
                }
                if (grid_alpha == 1.0)
                    grid_col = axis_col,
                    grid_alpha = 0.6+0.35*lightmode;
                else if (!isInClip(p1))
                    grid_alpha = 0.0;
                grid_col = mix(grid_col, BACKGROUND_COLOR, 1.0-fade(ts));
                col = mix(col, grid_col, grid_alpha);
            }
        }
    }

    col = pow(col, vec3(1./2.2));
    col -= vec3(1.5/255.)*randf();  // reduce "stripes"
    // col = vec3(callCount) / 255.0;
    // col *= vec3(tt.x);
    fragColor = vec4(clamp(col,0.,1.), 1.0);
}
