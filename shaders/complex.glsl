// complex-variabled functions

#ifndef PI
#define PI 3.1415926536
#endif

#line 8

#define mc_z() (z)
#define mc_i() vec2(0,1)
vec2 mc_const(float a) { return vec2(a,0); }
vec2 mc_re(vec2 a) { return vec2(a.x, 0); }
vec2 mc_im(vec2 a) { return vec2(a.y, 0); }
vec2 mc_mag(vec2 a) { return vec2(length(a), 0); }
vec2 mc_arg(vec2 a) { return vec2(atan(a.y,a.x), 0); }
vec2 mc_conj(vec2 a) { return vec2(a.x, -a.y); }
vec2 mc_inv(vec2 e) { return (1.0/dot(e,e)) * vec2(e.x, -e.y); }
vec2 mc_add(vec2 a, vec2 b) { return a + b; }
vec2 mc_sub(vec2 a, vec2 b) { return a - b; }
vec2 mc_mul(vec2 a, vec2 b) { return vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x); }
vec2 mc_div(vec2 a, vec2 b) { return (1.0/dot(b,b)) * vec2(a.x*b.x+a.y*b.y, a.y*b.x-a.x*b.y); }
vec2 mc_pow(vec2 e, vec2 t) {
    float a = atan(e.y, e.x);
    float r = 0.5*log(dot(e, e));
    float c = exp(t.x*r-t.y*a);
    float s = t.x*a+t.y*r;
    return c * vec2(cos(s), sin(s));
}
vec2 mc_powint(vec2 e, vec2 t) { return mc_pow(e, t); }
vec2 mc_pow2(vec2 z) { return vec2(z.x*z.x-z.y*z.y, 2.*z.x*z.y); }
vec2 mc_pow3(vec2 z) { return vec2(z.x*(z.x*z.x-3.*z.y*z.y), z.y*(3.*z.x*z.x-z.y*z.y)); }
vec2 mc_pow4(vec2 z) { return vec2(z.x*z.x*z.x*z.x-6.*z.x*z.x*z.y*z.y+z.y*z.y*z.y*z.y, 4.*z.x*z.y*(z.x*z.x-z.y*z.y)); }
vec2 mc_pow5(vec2 z) { return mc_pow(z, vec2(5,0)); }
vec2 mc_pow6(vec2 z) { return mc_pow(z, vec2(6,0)); }
vec2 mc_pow7(vec2 z) { return mc_pow(z, vec2(7,0)); }
vec2 mc_pow8(vec2 z) { return mc_pow(z, vec2(8,0)); }
vec2 mc_pow9(vec2 z) { return mc_pow(z, vec2(9,0)); }
vec2 mc_pow10(vec2 z) { return mc_pow(z, vec2(10,0)); }
vec2 mc_pow11(vec2 z) { return mc_pow(z, vec2(11,0)); }
vec2 mc_pow12(vec2 z) { return mc_pow(z, vec2(12,0)); }
vec2 mc_sqrt(vec2 e) {
    float m = length(e);
    return e.y>0. ? vec2(sqrt(0.5*(m+e.x)), sqrt(0.5*(m-e.x))) :
        vec2(sqrt(0.5*(m+e.x)), -sqrt(0.5*(m-e.x)));
}
vec2 mc_cbrt(vec2 e) { return mc_pow(e, vec2(1./3., 0)); }
vec2 mc_root(vec2 a, vec2 b) { return mc_pow(b, mc_inv(a)); }
vec2 mc_exp(vec2 e) { return exp(e.x)*vec2(cos(e.y),sin(e.y)); }
vec2 mc_ln(vec2 e) { return vec2(0.5*log(dot(e,e)), atan(e.y,e.x)); }
vec2 mc_log(vec2 a, vec2 b) { return mc_div(mc_ln(b), mc_ln(a)); }
vec2 mc_sin(vec2 e) { return vec2(sin(e.x)*cosh(e.y), cos(e.x)*sinh(e.y)); }
vec2 mc_cos(vec2 e) { return vec2(cos(e.x)*cosh(e.y), -sin(e.x)*sinh(e.y)); }
vec2 mc_tan(vec2 e) {
    float a = 2.*e.x, b = 2.*e.y, d = cos(a)+cosh(b);
    return (1./d) * vec2(sin(a), sinh(b));
}
vec2 mc_cot(vec2 e) {
    float a = 2.*e.x, b = 2.*e.y, d = cos(a)-cosh(b);
    return (1./d) * vec2(-sin(a), sinh(b));
}
vec2 mc_sec(vec2 e) {
    float a = e.x, b = e.y, d = 0.5*cosh(2.*b) + 0.5*cos(2.*a);
    return (1./d) * vec2(cos(a)*cosh(b), sin(a)*sinh(b));
}
vec2 mc_csc(vec2 e) {
    float a = e.x, b = e.y, d = 0.5*cosh(2.*b) - 0.5*cos(2.*a);
    return (1./d) * vec2(sin(a)*cosh(b), -cos(a)*sinh(b));
}
vec2 mc_sinh(vec2 e) { return vec2(sinh(e.x)*cos(e.y), cosh(e.x)*sin(e.y)); }
vec2 mc_cosh(vec2 e) { return vec2(cosh(e.x)*cos(e.y), sinh(e.x)*sin(e.y)); }
vec2 mc_tanh(vec2 e) {
    float a = 2.*e.x, b = 2.*e.y, d = cosh(a)+cos(b);
    return (1./d) * vec2(sinh(a), sin(b));
}
vec2 mc_coth(vec2 e) {
    float a = 2.*e.x, b = 2.*e.y, d = cosh(a)-cos(b);
    return (1./d) * vec2(sinh(a), -sin(b));
}
vec2 mc_csch(vec2 e) {
    float d = cos(2.*e.y) - cosh(2.*e.x);
    return (2./d) * vec2(-sinh(e.x)*cos(e.y), cosh(e.x)*sin(e.y));
}
vec2 mc_sech(vec2 e) {
    float d = cos(2.*e.y) + cosh(2.*e.x);
    return (2./d) * vec2(cosh(e.x)*cos(e.y), -sinh(e.x)*sin(e.y));
}
vec2 mc_arcsin(vec2 e) {
    float a = e.x, b = e.y;
    vec2 t1 = mc_sqrt(vec2(b*b-a*a+1., -2.*a*b));
    vec2 t2 = mc_ln(vec2(t1.x-b, t1.y+a));
    return vec2(t2.y, -t2.x);
}
vec2 mc_arccos(vec2 e) {
    float a = e.x, b = e.y;
    vec2 t1 = mc_sqrt(vec2(b*b-a*a+1., -2.*a*b));
    vec2 t2 = mc_ln(vec2(t1.x-b, t1.y+a));
    return vec2(1.570796327-t2.y, t2.x);
}
vec2 mc_arctan(vec2 e) {
    float a = e.x, b = e.y, d = a*a + (1.-b)*(1.-b);
    vec2 t1 = mc_ln(vec2((1.-b*b-a*a)/d, -2.*a/d));
    return vec2(-0.5*t1.y, 0.5*t1.x);
}
vec2 mc_arccot(vec2 e) { return mc_arctan(mc_inv(e)); }
vec2 mc_arcsec(vec2 e) { return mc_arccos(mc_inv(e)); }
vec2 mc_arccsc(vec2 e) { return mc_arcsin(mc_inv(e)); }
vec2 mc_arcsinh(vec2 e) { vec2 r = mc_arcsin(vec2(e.y,-e.x)); return vec2(-r.y,r.x); }
vec2 mc_arccosh(vec2 e) { vec2 r = mc_arccos(e); return r.y<=0.?vec2(-r.y,r.x):vec2(r.y,-r.x); }
vec2 mc_arctanh(vec2 e) {
    float a = e.x, b = e.y;
    float oneMinus = 1.-a, onePlus = 1.+a, d = oneMinus*oneMinus + b*b;
    vec2 x = (1./d) * vec2(onePlus*oneMinus-b*b, b*oneMinus+b*onePlus);
    return 0.5*mc_ln(x);
}
vec2 mc_arccoth(vec2 e) { return mc_arctanh(mc_inv(e)); }
vec2 mc_arccsch(vec2 e) { return mc_arcsinh(mc_inv(e)); }
vec2 mc_arcsech(vec2 e) { return mc_arccosh(mc_inv(e)); }

// Spouge's method for Gamma function
vec2 mc_gamma(vec2 z) {
    float N = length(z-vec2(-8.,0.))<1. ? 10. : 8.;
    float c = sqrt(2.*PI);
	vec2 s = vec2(c, 0);
    float f = 1.;
	for(float k=1.; k<N; k++) {
		c = exp(N-k)*pow(N-k,k-.5)/f;
        f *= -k;
        s += mc_inv(z+vec2(k,0.))*c;
	}
	s = mc_mul(s,mc_mul(mc_exp(-z-vec2(N,0)),mc_pow(z+vec2(N,0),z+vec2(.5,0))));
    return mc_div(s,z);
}
vec2 mc_lngamma(vec2 z) {
    float N = ZERO + length(z-vec2(-8.,0.))<1. ? 10. : 8.;
    float c = sqrt(2.*PI);
	vec2 s = vec2(c, 0);
    float f = 1.;
	for(float k=1.; k<N; k++) {
		c = exp(N-k)*pow(N-k,k-.5)/f;
        f *= -k;
        s += mc_inv(z+vec2(k,0.))*c;
	}
    s = mc_ln(s);
    s = s + (-z-vec2(N,0)) + mc_mul(z+vec2(.5,0), mc_ln(z+vec2(N,0)));
    s = s - mc_ln(z);
    s.y = mod(s.y+PI, 2.*PI)-PI;
    return s;
}

// Riemann zeta function
#include "../shaders/complex-zeta.glsl"
vec2 mc_lnzeta(vec2 z) {
    vec2 s = logzeta(z);
    s.y = mod(s.y+PI, 2.*PI)-PI;
    return s;
}
vec2 mc_zeta(vec2 z) {
    vec2 z1 = cexp(logkhi(z)+clog(eta4(vec2(1.,0.)-z))-clog(vec2(1,0)-cpow(2.,z)));
    vec2 z2 = cexp(clog(eta4(z))-clog(vec2(1,0)-cpow(2.,vec2(1,0)-z)));
    if (z.x < 0.4) return z1;
    if (z.x > 0.5) return z2;
    return mix(z1, z2, smoothstep(0.4,0.5,z.x));
}

// Faster but less accurate version for 3D
// Based on "Zeta in a box" by guil - https://www.shadertoy.com/view/7ltcW8
#line 168
vec2 zeta3(vec2 s) {
    float N = 8. + ZERO;
    vec2 sum1 = vec2(0);
    float a = 1.0;
    for(float i = 1.; i <= N; i++) {
        sum1 += a*(mc_pow(vec2(i,0), -s));
        a = -a;
    }
    vec2 sum2 = vec2(0);
    a = -1.0;
    float bk= exp2(-N);
    float ek= bk;
    for(float i = -ZERO; i < N; i++) {
        sum2 += a*ek*(mc_pow(vec2(2.*N-i,0),-s));
        bk *= (N-i)/(i+1.);
        ek += bk;
        a = -a;
    }
    return cdiv(sum1+sum2, vec2(1,0) - cpow(2., vec2(1,0) - s));
}
vec2 mc_zeta_fast(vec2 z) {
    float t = smoothstep(40., 55., abs(z.y));
    if (t >= 1. || z.x >= .5) return zeta3(z);
    vec2 a = mc_pow(vec2(2.*PI,0),z)/PI;
    vec2 b = mc_sin(PI*z/2.);
    vec2 c = mc_gamma(vec2(1.,0.)-z);
    vec2 khi = mc_mul(mc_mul(a,b),c);
    vec2 zeta = mc_mul(khi, zeta3(vec2(1.,0.)-z));
    if (t <= 0.) return zeta;
    return mix(zeta, zeta3(z), t);
}
vec2 mc_lnzeta_fast(vec2 z) {
    float t = smoothstep(20., 24., abs(z.y));
    if (t >= 1. || z.x >= .5) return mc_ln(zeta3(z));
    vec2 ln_a = mc_mul(z, mc_ln(vec2(2.*PI,0))) - mc_ln(vec2(PI,0));
    vec2 ln_b = mc_ln( mc_sin(PI*z/2.) );
    vec2 z1 = mc_mul(mc_i(), 0.5*PI*z);
    ln_b = mc_ln(mc_exp(z1)-mc_exp(-z1))-mc_ln(2.*mc_i());
    vec2 ln_c = mc_lngamma(vec2(1.,0.)-z);
    vec2 ln_khi = ln_a + ln_b + ln_c;
    vec2 ln_zeta = ln_khi + mc_ln(zeta3(vec2(1.,0.)-z));
    if (t > 0.) ln_zeta = mc_ln(mix(mc_exp(ln_zeta), zeta3(z), t));
    ln_zeta.y = mod(ln_zeta.y+PI, 2.*PI)-PI;
    return ln_zeta;
}