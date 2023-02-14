#ifndef PI
#define PI 3.1415926536
#endif


uniform float iTime;


// Functions

#define mf_x() (x)
#define mf_y() (y)
#define mf_z() (z)
float mf_const(float a) { return a; }
float mf_add(float a, float b) { return a + b; }
float mf_sub(float a, float b) { return a - b; }
float mf_mul(float a, float b) { return a * b; }
float mf_div(float a, float b) { return a / b; }
float mf_pow2(float a) { return a*a; }
float mf_pow3(float a) { return a*a*a; }
float mf_pow4(float a) { return a*a*a*a; }
float mf_pow5(float a) { return a*a*a*a*a; }
float mf_pow6(float a) { return a*a*a*a*a*a; }
float mf_pow7(float a) { return a*a*a*a*a*a*a; }
float mf_pow8(float a) { return a*a*a*a*a*a*a*a; }
float mf_pow9(float a) { return a*a*a*a*a*a*a*a*a; }
float mf_pow10(float a) { return a*a*a*a*a*a*a*a*a*a; }
float mf_pow11(float a) { return a*a*a*a*a*a*a*a*a*a*a; }
float mf_pow12(float a) { return a*a*a*a*a*a*a*a*a*a*a*a; }
float mf_powint(float a, float b) { float k=round(b); return (mod(k,2.)==0.?1.:sign(a))*pow(abs(a),k); }

float mf_if(float a1, float a2, float a3) { return a1 > 0. ? a2 : a3; }
float mf_mod(float a1, float a2) { return mod(a1, a2); }
float mf_fract(float a) { return fract(a); }
float mf_floor(float a) { return floor(a); }
float mf_ceil(float a) { return ceil(a); }
float mf_round(float a) { return round(a); }
float mf_abs(float a) { return abs(a); }
float mf_sign(float a) { return sign(a); }
float mf_max(float a, float b) { return max(a, b); }
float mf_min(float a, float b) { return min(a, b); }
float mf_clamp(float a, float b, float c) { return clamp(a, b, c); }
float mf_lerp(float a, float b, float c) { return mix(a, b, c); }
float mf_sqrt(float a) { return sqrt(a); }
float mf_cbrt(float a) { return sign(a)*pow(abs(a), 1./3.); }
float mf_pow(float a, float b) { return pow(a, b); }
float mf_root(float a, float b) { return pow(b, 1.0/a); }
float mf_hypot(float a, float b) { return length(vec2(a, b)); }
float mf_exp(float a) { return exp(a); }
float mf_ln(float a) { return log(a); }
float mf_log(float a, float b) { return log(b) / log(a); }
float mf_sin(float a) { return sin(a); }
float mf_cos(float a) { return cos(a); }
float mf_tan(float a) { return tan(a); }
float mf_csc(float a) { return 1.0/sin(a); }
float mf_sec(float a) { return 1.0/cos(a); }
float mf_cot(float a) { return cos(a)/sin(a); }
float mf_sinh(float a) { return sinh(a); }
float mf_cosh(float a) { return cosh(a); }
float mf_tanh(float a) { return tanh(a); }
float mf_csch(float a) { return 1.0/sinh(a); }
float mf_sech(float a) { return 1.0/cosh(a); }
float mf_coth(float a) { return 1.0/tanh(a); }
float mf_atan2(float a, float b) { return atan(a, b); }
float mf_arcsin(float a) { return asin(a); }
float mf_arccos(float a) { return acos(a); }
float mf_arctan(float a) { return atan(a); }
float mf_arccot(float a) { return 0.5*PI-atan(a); }
float mf_arcsec(float a) { return acos(1.0/a); }
float mf_arccsc(float a) { return asin(1.0/a); }
float mf_arcsinh(float a) { return asinh(a); }
float mf_arccosh(float a) { return acosh(a); }
float mf_arctanh(float a) { return atanh(a); }
float mf_arccoth(float a) { return atanh(1./a); }
float mf_arcsech(float a) { return acosh(1.0/a); }
float mf_arccsch(float a) { return asinh(1.0/a); }
float mf_erf(float x) {
    float t = 1.0 / (1.0 + 0.3275911*abs(x));
    float k = t*(0.254829592+t*(-0.284496736+t*(1.421413741+t*(-1.453152027+t*1.061405429))));
    return sign(x) * (1.0 - k * exp(-x*x));
}
float mf_erfinv(float x) {
    float u = log(1.0-x*x);
    float c = 0.5*u + 2.0/(0.147*PI);
    return sign(x) * sqrt(sqrt(c*c-u/0.147)-c);
}


// Functions with gradient
// xyz: gradient; w: value

#define mfg_x() vec4(1,0,0,x)
#define mfg_y() vec4(0,1,0,y)
#define mfg_z() vec4(0,0,1,z)
vec4 mfg_const(float a) { return vec4(0, 0, 0, a); }
vec4 mfg_add(vec4 a, vec4 b) { return a + b; }
vec4 mfg_sub(vec4 a, vec4 b) { return a - b; }
vec4 mfg_mul(vec4 a, vec4 b) { return vec4(a.xyz*b.w+b.xyz*a.w, a.w*b.w); }
vec4 mfg_div(vec4 a, vec4 b) { return vec4((a.xyz*b.w-b.xyz*a.w)/(b.w*b.w), a.w/b.w); }
vec4 mfg_pow2(vec4 a) { return vec4(2.*a.xyz,a.w)*a.w; }
vec4 mfg_pow3(vec4 a) { return vec4(3.*a.xyz,a.w)*a.w*a.w; }
vec4 mfg_pow4(vec4 a) { return vec4(4.*a.xyz,a.w)*a.w*a.w*a.w; }
vec4 mfg_pow5(vec4 a) { return vec4(5.*a.xyz,a.w)*a.w*a.w*a.w*a.w; }
vec4 mfg_pow6(vec4 a) { return vec4(6.*a.xyz,a.w)*a.w*a.w*a.w*a.w*a.w; }
vec4 mfg_pow7(vec4 a) { return vec4(7.*a.xyz,a.w)*a.w*a.w*a.w*a.w*a.w*a.w; }
vec4 mfg_pow8(vec4 a) { return vec4(8.*a.xyz,a.w)*a.w*a.w*a.w*a.w*a.w*a.w*a.w; }
vec4 mfg_pow9(vec4 a) { return vec4(9.*a.xyz,a.w)*a.w*a.w*a.w*a.w*a.w*a.w*a.w*a.w; }
vec4 mfg_pow10(vec4 a) { return vec4(10.*a.xyz,a.w)*a.w*a.w*a.w*a.w*a.w*a.w*a.w*a.w*a.w; }
vec4 mfg_pow11(vec4 a) { return vec4(11.*a.xyz,a.w)*a.w*a.w*a.w*a.w*a.w*a.w*a.w*a.w*a.w*a.w; }
vec4 mfg_pow12(vec4 a) { return vec4(12.*a.xyz,a.w)*a.w*a.w*a.w*a.w*a.w*a.w*a.w*a.w*a.w*a.w*a.w; }
vec4 mfg_powint(vec4 a, vec4 b) { float k=round(b.w)-1.; return vec4(k*a.xyz,a.w)*(mod(k,2.)==0.?1.:sign(a.w))*pow(abs(a.w),k); }

vec4 mfg_if(vec4 a1, vec4 a2, vec4 a3) { return a1.w > 0. ? a2 : a3; }
vec4 mfg_mod(vec4 a1, vec4 a2) { return a1; }
vec4 mfg_fract(vec4 a) { return a; }
vec4 mfg_floor(vec4 a) { return vec4(vec3(0), floor(a.w)); }
vec4 mfg_ceil(vec4 a) { return vec4(vec3(0), ceil(a.w)); }
vec4 mfg_round(vec4 a) { return vec4(vec3(0), round(a.w)); }
vec4 mfg_abs(vec4 a) { return vec4(sign(a.w)*a.xyz, abs(a.w)); }
vec4 mfg_sign(vec4 a) { return vec4(vec3(0), sign(a.w)); }
vec4 mfg_max(vec4 a, vec4 b) { return a.w>b.w ? a : b; }
vec4 mfg_min(vec4 a, vec4 b) { return a.w<b.w ? a : b; }
vec4 mfg_clamp(vec4 a, vec4 b, vec4 c) { return a.w>c.w ? c : a.w>b.w ? a : b; }
vec4 mfg_lerp(vec4 a, vec4 b, vec4 c) { return vec4((1.-c.w)*a.xyz+(b.w-a.w)*c.xyz+c.w*b.xyz, mix(a,b,c)); }
vec4 mfg_sqrt(vec4 a) { return vec4(.5*a.xyz/sqrt(a.w), sqrt(a.w)); }
vec4 mfg_cbrt(vec4 a) { return vec4(a.xyz/(3.*pow(abs(a.w),2./3.)), sign(a.w)*pow(abs(a.w),1./3.)); }
vec4 mfg_pow(vec4 a, vec4 b) { return vec4(a.xyz*(b.w*pow(a.w,b.w-1.))+b.xyz*(pow(a.w,b.w)*log(a.w)), pow(a.w,b.w)); }
vec4 mfg_root(vec4 a, vec4 b) { return mfg_pow(b, mfg_div(vec4(0,0,0,1), a)); }
vec4 mfg_hypot(vec4 a, vec4 b) { return vec4((a.xyz*a.w+b.xyz*b.w)/sqrt(a.w*a.w+b.w*b.w), sqrt(a.w*a.w+b.w*b.w)); }
vec4 mfg_exp(vec4 a) { return vec4(a.xyz,1)*exp(a.w); }
vec4 mfg_ln(vec4 a) { return vec4(a.xyz/a.w, log(a.w)); }
vec4 mfg_log(vec4 a, vec4 b) { return vec4(((log(a.w)*b.xyz/b.w-log(b.w)*a.xyz/a.w)/(log(a.w)*log(a.w))), log(b.w)/log(a.w)); }
vec4 mfg_sin(vec4 a) { return vec4(a.xyz*cos(a.w), sin(a.w)); }
vec4 mfg_cos(vec4 a) { return vec4(a.xyz*sin(-a.w), cos(a.w)); }
vec4 mfg_tan(vec4 a) { return vec4(a.xyz/(.5+.5*cos(2.*a.w)), tan(a.w)); }
vec4 mfg_csc(vec4 a) { return vec4(-a.xyz/tan(a.w),1)/sin(a.w); }
vec4 mfg_sec(vec4 a) { return vec4(a.xyz*tan(a.w),1)/cos(a.w); }
vec4 mfg_cot(vec4 a) { return vec4(-a.xyz/sin(a.w),cos(a.w))/sin(a.w); }
vec4 mfg_sinh(vec4 a) { return vec4(a.xyz*cosh(a.w), sinh(a.w)); }
vec4 mfg_cosh(vec4 a) { return vec4(a.xyz*sinh(a.w), cosh(a.w)); }
vec4 mfg_tanh(vec4 a) { return vec4(a.xyz/cosh(a.w),sinh(a.w))/cosh(a.w); }
vec4 mfg_csch(vec4 a) { return vec4(-a.xyz/tanh(a.w),1)/sinh(a.w); }
vec4 mfg_sech(vec4 a) { return vec4(-a.xyz*tanh(a.w),1)/cosh(a.w); }
vec4 mfg_coth(vec4 a) { return vec4(-a.xyz/sinh(a.w),cosh(a.w))/sinh(a.w); }
vec4 mfg_atan2(vec4 a, vec4 b) { return vec4((b.w*a.xyz-a.w*b.xyz)/(a.w*a.w+b.w*b.w), atan(a.w,b.w)); }
vec4 mfg_arcsin(vec4 a) { return vec4(a.xyz/sqrt(1.-a.w*a.w), asin(a.w)); }
vec4 mfg_arccos(vec4 a) { return vec4(-a.xyz/sqrt(1.-a.w*a.w), acos(a.w)); }
vec4 mfg_arctan(vec4 a) { return vec4(a.xyz/(1.+a.w*a.w), atan(a.w)); }
vec4 mfg_arccot(vec4 a) { return vec4(-a.xyz/(1.+a.w*a.w), 0.5*PI-atan(a.w)); }
vec4 mfg_arcsec(vec4 a) { return vec4(a.xyz/(abs(a.w)*sqrt(a.w*a.w-1.)), acos(1.0/a.w)); }
vec4 mfg_arccsc(vec4 a) { return vec4(-a.xyz/(abs(a.w)*sqrt(a.w*a.w-1.)), asin(1.0/a.w)); }
vec4 mfg_arcsinh(vec4 a) { return vec4(a.xyz/sqrt(a.w*a.w+1.), asinh(a.w)); }
vec4 mfg_arccosh(vec4 a) { return vec4(a.xyz/sqrt(a.w*a.w-1.), acosh(a.w)); }
vec4 mfg_arctanh(vec4 a) { return vec4(a.xyz/(1.-a.w*a.w), atanh(a.w)); }
vec4 mfg_arccoth(vec4 a) { return vec4(a.xyz/(1.-a.w*a.w), atanh(1./a.w)); }
vec4 mfg_arcsech(vec4 a) { return vec4(-a.xyz/(abs(a.w)*sqrt(1.-a.w*a.w)), acosh(1.0/a.w)); }
vec4 mfg_arccsch(vec4 a) { return vec4(-a.xyz/(abs(a.w)*sqrt(1.+a.w*a.w)), asinh(1.0/a.w)); }
vec4 mfg_erf(vec4 a) { return vec4(2.0/sqrt(PI)*exp(-a.w*a.w)*a.xyz, mf_erf(a.w)); }
vec4 mfg_erfinv(vec4 a) {
    float inv = mf_erfinv(a.w);
    float einv = 2.0/sqrt(PI)*exp(-inv*inv);
    return vec4(a.xyz/einv, inv);
}
