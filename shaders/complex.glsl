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
