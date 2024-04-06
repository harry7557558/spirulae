
#line 3

/* Function Declaration */

#define ZERO 0.0
#define Y_UP 0
#define PI 3.14159265358979


float fun(vec3 p) {  // function
#if Y_UP
    float x=p.x, y=p.z, z=-p.y;
#else
    float x=p.x, y=p.y, z=p.z;
#endif
    return funRaw(x, y, z);
    // return funRaw(x, y, z).w;
}

vec3 funGrad(vec3 p) {  // numerical gradient
    float h = 0.001*pow(dot(p,p), 1.0/6.0);
  #if 0
    return vec3(
        fun(p+vec3(h,0,0)) - fun(p-vec3(h,0,0)),
        fun(p+vec3(0,h,0)) - fun(p-vec3(0,h,0)),
        fun(p+vec3(0,0,h)) - fun(p-vec3(0,0,h))
    ) / (2.0*h);
  #else
    // lower shader compilation time
    vec3 n = vec3(0.0);
    for (float i = ZERO; i < 6.; i++) {
        vec3 e = normalize((1.+2.*cos(2./3.*PI*vec3(i,i+1.,i+2.)))*cos(.6*i));
        n += e * fun(p+e*h);
    }
    return n / (2.0*h);
  #endif
}


#ifdef CUSTOM_COLOR

vec3 aces(vec3 x) {
    x = max(x, 0.0);
    x = x*(2.51*x+0.03)/(x*(2.43*x+0.59)+0.14);
    return clamp(x, 0.0, 1.0);
}
vec3 rgb2rgb(vec3 rgb) {
    // return max(rgb, 0.0);
    return aces(rgb);
    return clamp(rgb, 0.0, 1.0);
}
vec3 hsv2rgb(vec3 hsv) {
    hsv.yz = clamp(hsv.yz, 0.0, 1.0);
    float c = hsv.y * hsv.z;
    float h = mod(hsv.x/(2.0*PI)*6.0, 6.0);
    float x = c * (1.0 - abs(mod(h, 2.0) - 1.0));
    float m = hsv.z - c;
    vec3 rgb;
    if (h < 1.0) rgb = vec3(c, x, 0.0);
    else if (h < 2.0) rgb = vec3(x, c, 0.0);
    else if (h < 3.0) rgb = vec3(0.0, c, x);
    else if (h < 4.0) rgb = vec3(0.0, x, c);
    else if (h < 5.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
}
vec3 hsl2rgb(vec3 hsl) {
    hsl.yz = clamp(hsl.yz, 0.0, 1.0);
    float c = (1.0 - abs(2.0 * hsl.z - 1.0)) * hsl.y;
    float h = mod(hsl.x/(2.0*PI)*6.0, 6.0);
    float x = c * (1.0 - abs(mod(h, 2.0) - 1.0));
    float m = hsl.z - 0.5 * c;
    vec3 rgb;
    if (h < 1.0) rgb = vec3(c, x, 0.0);
    else if (h < 2.0) rgb = vec3(x, c, 0.0);
    else if (h < 3.0) rgb = vec3(0.0, c, x);
    else if (h < 4.0) rgb = vec3(0.0, x, c);
    else if (h < 5.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + vec3(m, m, m);
}

vec4 funColor(vec3 p) {  // function
#if Y_UP
    float x=p.x, y=p.z, z=-p.y;
#else
    float x=p.x, y=p.y, z=p.z;
#endif
    vec4 cw = funRawC(x, y, z);
    return vec4(CUSTOM_COLOR(cw.xyz), cw.w);
}

#else  // CUSTOM_COLOR

vec4 funColor(vec3 p) {
    vec3 n0 = funGrad(p).xyz;
    // n0 = dot(n0,rd)>0. ? -n0 : n0;
    vec3 n = normalize(n0);
#if Y_UP
    n0 = vec3(n0.x, n0.z, -n0.y);
#endif // {%Y_UP%}
#if {%COLOR%} == 0
    return vec3(1.0);
#else // {%COLOR%} == 0
#ifdef CUSTOM_COLOR
    vec3 albedo = funC(p).xyz;
#else  // CUSTOM_COLOR
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
#endif  // CUSTOM_COLOR
    // albedo = pow(albedo, vec3(2.2));
#endif // {%COLOR%} == 0
    if (isnan(dot(albedo, vec3(1))))
        albedo = vec3(0,0.5,0);
    return vec4(albedo,1);
}

#endif  // CUSTOM_COLOR



