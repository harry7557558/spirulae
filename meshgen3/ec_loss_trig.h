/* This file was automatically generated by CasADi 3.6.3.
 *  It consists of: 
 *   1) content generated by CasADi runtime: not copyrighted
 *   2) template code copied from CasADi source: permissively licensed (MIT-0)
 *   3) user code: owned by the user
 *
 */
#ifdef __cplusplus
extern "C" {
#endif

/* How to prefix internal symbols */
#ifdef CASADI_CODEGEN_PREFIX
  #define CASADI_NAMESPACE_CONCAT(NS, ID) _CASADI_NAMESPACE_CONCAT(NS, ID)
  #define _CASADI_NAMESPACE_CONCAT(NS, ID) NS ## ID
  #define CASADI_PREFIX(ID) CASADI_NAMESPACE_CONCAT(CODEGEN_PREFIX, ID)
#else
  #define CASADI_PREFIX(ID) ec_loss_trig_ ## ID
#endif

#include <math.h>

#ifndef casadi_real
#define casadi_real float
#endif

#ifndef casadi_int
#define casadi_int long long int
#endif

/* Add prefix to internal symbols */
#define casadi_f0 CASADI_PREFIX(f0)
#define casadi_f1 CASADI_PREFIX(f1)
#define casadi_s0 CASADI_PREFIX(s0)
#define casadi_s1 CASADI_PREFIX(s1)
#define casadi_s2 CASADI_PREFIX(s2)
#define casadi_s3 CASADI_PREFIX(s3)
#define casadi_sq CASADI_PREFIX(sq)

/* Symbol visibility in DLLs */
#ifndef CASADI_SYMBOL_EXPORT
  #if defined(_WIN32) || defined(__WIN32__) || defined(__CYGWIN__)
    #if defined(STATIC_LINKED)
      #define CASADI_SYMBOL_EXPORT
    #else
      #define CASADI_SYMBOL_EXPORT __declspec(dllexport)
    #endif
  #elif defined(__GNUC__) && defined(GCC_HASCLASSVISIBILITY)
    #define CASADI_SYMBOL_EXPORT __attribute__ ((visibility ("default")))
  #else
    #define CASADI_SYMBOL_EXPORT
  #endif
#endif

casadi_real casadi_sq(casadi_real x) { return x*x;}

static const casadi_int casadi_s0[13] = {9, 1, 0, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8};
static const casadi_int casadi_s1[5] = {1, 1, 0, 1, 0};
static const casadi_int casadi_s2[9] = {1, 3, 0, 1, 2, 3, 0, 0, 0};
static const casadi_int casadi_s3[15] = {3, 3, 0, 3, 6, 9, 0, 1, 2, 0, 1, 2, 0, 1, 2};

/* ec_loss_trig:(i0[9])->(o0) */
static int casadi_f0(const casadi_real** arg, casadi_real** res, casadi_int* iw, casadi_real* w, int mem) {
  casadi_real a0, a1, a10, a11, a12, a13, a14, a15, a16, a17, a18, a2, a3, a4, a5, a6, a7, a8, a9;
  a0=arg[0]? arg[0][4] : 0;
  a1=arg[0]? arg[0][1] : 0;
  a2=(a0-a1);
  a3=arg[0]? arg[0][8] : 0;
  a4=arg[0]? arg[0][2] : 0;
  a5=(a3-a4);
  a6=(a2*a5);
  a7=arg[0]? arg[0][5] : 0;
  a8=(a7-a4);
  a9=arg[0]? arg[0][7] : 0;
  a10=(a9-a1);
  a11=(a8*a10);
  a6=(a6-a11);
  a6=casadi_sq(a6);
  a11=arg[0]? arg[0][6] : 0;
  a12=arg[0]? arg[0][0] : 0;
  a13=(a11-a12);
  a14=(a8*a13);
  a15=arg[0]? arg[0][3] : 0;
  a16=(a15-a12);
  a17=(a16*a5);
  a14=(a14-a17);
  a14=casadi_sq(a14);
  a6=(a6+a14);
  a14=(a16*a10);
  a17=(a2*a13);
  a14=(a14-a17);
  a14=casadi_sq(a14);
  a6=(a6+a14);
  a16=casadi_sq(a16);
  a2=casadi_sq(a2);
  a16=(a16+a2);
  a8=casadi_sq(a8);
  a16=(a16+a8);
  a13=casadi_sq(a13);
  a10=casadi_sq(a10);
  a13=(a13+a10);
  a5=casadi_sq(a5);
  a13=(a13+a5);
  a16=(a16*a13);
  a6=(a6/a16);
  a6=log(a6);
  a16=(a9-a0);
  a13=(a4-a7);
  a5=(a16*a13);
  a10=(a3-a7);
  a8=(a1-a0);
  a2=(a10*a8);
  a5=(a5-a2);
  a5=casadi_sq(a5);
  a2=(a12-a15);
  a14=(a10*a2);
  a17=(a11-a15);
  a18=(a17*a13);
  a14=(a14-a18);
  a14=casadi_sq(a14);
  a5=(a5+a14);
  a14=(a17*a8);
  a18=(a16*a2);
  a14=(a14-a18);
  a14=casadi_sq(a14);
  a5=(a5+a14);
  a17=casadi_sq(a17);
  a16=casadi_sq(a16);
  a17=(a17+a16);
  a10=casadi_sq(a10);
  a17=(a17+a10);
  a2=casadi_sq(a2);
  a8=casadi_sq(a8);
  a2=(a2+a8);
  a13=casadi_sq(a13);
  a2=(a2+a13);
  a17=(a17*a2);
  a5=(a5/a17);
  a5=log(a5);
  a6=(a6+a5);
  a1=(a1-a9);
  a7=(a7-a3);
  a5=(a1*a7);
  a4=(a4-a3);
  a0=(a0-a9);
  a9=(a4*a0);
  a5=(a5-a9);
  a5=casadi_sq(a5);
  a15=(a15-a11);
  a9=(a4*a15);
  a12=(a12-a11);
  a11=(a12*a7);
  a9=(a9-a11);
  a9=casadi_sq(a9);
  a5=(a5+a9);
  a9=(a12*a0);
  a11=(a1*a15);
  a9=(a9-a11);
  a9=casadi_sq(a9);
  a5=(a5+a9);
  a12=casadi_sq(a12);
  a1=casadi_sq(a1);
  a12=(a12+a1);
  a4=casadi_sq(a4);
  a12=(a12+a4);
  a15=casadi_sq(a15);
  a0=casadi_sq(a0);
  a15=(a15+a0);
  a7=casadi_sq(a7);
  a15=(a15+a7);
  a12=(a12*a15);
  a5=(a5/a12);
  a5=log(a5);
  a6=(a6+a5);
  a5=6.;
  a6=(a6/a5);
  a6=(-a6);
  if (res[0]!=0) res[0][0]=a6;
  return 0;
}

CASADI_SYMBOL_EXPORT int ec_loss_trig(const casadi_real** arg, casadi_real** res, casadi_int* iw, casadi_real* w, int mem){
  return casadi_f0(arg, res, iw, w, mem);
}

CASADI_SYMBOL_EXPORT int ec_loss_trig_alloc_mem(void) {
  return 0;
}

CASADI_SYMBOL_EXPORT int ec_loss_trig_init_mem(int mem) {
  return 0;
}

CASADI_SYMBOL_EXPORT void ec_loss_trig_free_mem(int mem) {
}

CASADI_SYMBOL_EXPORT int ec_loss_trig_checkout(void) {
  return 0;
}

CASADI_SYMBOL_EXPORT void ec_loss_trig_release(int mem) {
}

CASADI_SYMBOL_EXPORT void ec_loss_trig_incref(void) {
}

CASADI_SYMBOL_EXPORT void ec_loss_trig_decref(void) {
}

CASADI_SYMBOL_EXPORT casadi_int ec_loss_trig_n_in(void) { return 1;}

CASADI_SYMBOL_EXPORT casadi_int ec_loss_trig_n_out(void) { return 1;}

CASADI_SYMBOL_EXPORT casadi_real ec_loss_trig_default_in(casadi_int i) {
  switch (i) {
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT const char* ec_loss_trig_name_in(casadi_int i) {
  switch (i) {
    case 0: return "i0";
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT const char* ec_loss_trig_name_out(casadi_int i) {
  switch (i) {
    case 0: return "o0";
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT const casadi_int* ec_loss_trig_sparsity_in(casadi_int i) {
  switch (i) {
    case 0: return casadi_s0;
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT const casadi_int* ec_loss_trig_sparsity_out(casadi_int i) {
  switch (i) {
    case 0: return casadi_s1;
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT int ec_loss_trig_work(casadi_int *sz_arg, casadi_int* sz_res, casadi_int *sz_iw, casadi_int *sz_w) {
  if (sz_arg) *sz_arg = 1;
  if (sz_res) *sz_res = 1;
  if (sz_iw) *sz_iw = 0;
  if (sz_w) *sz_w = 0;
  return 0;
}

/* ec_loss_trig_gh:(i0[9])->(o0[1x3],o1[3x3]) */
static int casadi_f1(const casadi_real** arg, casadi_real** res, casadi_int* iw, casadi_real* w, int mem) {
  casadi_real a0, a1, a10, a100, a101, a102, a11, a12, a13, a14, a15, a16, a17, a18, a19, a2, a20, a21, a22, a23, a24, a25, a26, a27, a28, a29, a3, a30, a31, a32, a33, a34, a35, a36, a37, a38, a39, a4, a40, a41, a42, a43, a44, a45, a46, a47, a48, a49, a5, a50, a51, a52, a53, a54, a55, a56, a57, a58, a59, a6, a60, a61, a62, a63, a64, a65, a66, a67, a68, a69, a7, a70, a71, a72, a73, a74, a75, a76, a77, a78, a79, a8, a80, a81, a82, a83, a84, a85, a86, a87, a88, a89, a9, a90, a91, a92, a93, a94, a95, a96, a97, a98, a99;
  a0=arg[0]? arg[0][4] : 0;
  a1=arg[0]? arg[0][7] : 0;
  a2=(a0-a1);
  a3=arg[0]? arg[0][0] : 0;
  a4=arg[0]? arg[0][6] : 0;
  a5=(a3-a4);
  a6=(a5*a2);
  a7=arg[0]? arg[0][1] : 0;
  a8=(a7-a1);
  a9=arg[0]? arg[0][3] : 0;
  a10=(a9-a4);
  a11=(a8*a10);
  a6=(a6-a11);
  a11=(a6+a6);
  a12=-1.6666666666666666e-01;
  a13=arg[0]? arg[0][5] : 0;
  a14=arg[0]? arg[0][8] : 0;
  a15=(a13-a14);
  a16=(a8*a15);
  a17=arg[0]? arg[0][2] : 0;
  a18=(a17-a14);
  a19=(a18*a2);
  a16=(a16-a19);
  a19=casadi_sq(a16);
  a20=(a18*a10);
  a21=(a5*a15);
  a20=(a20-a21);
  a21=casadi_sq(a20);
  a19=(a19+a21);
  a21=casadi_sq(a6);
  a19=(a19+a21);
  a21=casadi_sq(a5);
  a22=casadi_sq(a8);
  a21=(a21+a22);
  a22=casadi_sq(a18);
  a21=(a21+a22);
  a22=casadi_sq(a10);
  a23=casadi_sq(a2);
  a22=(a22+a23);
  a23=casadi_sq(a15);
  a22=(a22+a23);
  a21=(a21*a22);
  a19=(a19/a21);
  a23=(a12/a19);
  a24=(a23/a21);
  a25=(a11*a24);
  a26=(a2*a25);
  a27=(a5+a5);
  a28=(a19/a21);
  a29=(a28*a23);
  a29=(a22*a29);
  a30=(a27*a29);
  a26=(a26-a30);
  a30=(a20+a20);
  a31=(a30*a24);
  a32=(a15*a31);
  a26=(a26-a32);
  a32=(a14-a13);
  a33=(a3-a9);
  a34=(a32*a33);
  a35=(a4-a9);
  a36=(a17-a13);
  a37=(a35*a36);
  a34=(a34-a37);
  a37=(a34+a34);
  a38=(a1-a0);
  a39=(a38*a36);
  a40=(a7-a0);
  a41=(a32*a40);
  a39=(a39-a41);
  a41=casadi_sq(a39);
  a42=casadi_sq(a34);
  a41=(a41+a42);
  a42=(a35*a40);
  a43=(a38*a33);
  a42=(a42-a43);
  a43=casadi_sq(a42);
  a41=(a41+a43);
  a43=casadi_sq(a35);
  a44=casadi_sq(a38);
  a43=(a43+a44);
  a44=casadi_sq(a32);
  a43=(a43+a44);
  a44=casadi_sq(a33);
  a45=casadi_sq(a40);
  a44=(a44+a45);
  a45=casadi_sq(a36);
  a44=(a44+a45);
  a44=(a43*a44);
  a41=(a41/a44);
  a45=(a12/a41);
  a46=(a45/a44);
  a47=(a37*a46);
  a48=(a32*a47);
  a49=(a33+a33);
  a50=(a41/a44);
  a51=(a50*a45);
  a51=(a43*a51);
  a52=(a49*a51);
  a53=(a42+a42);
  a54=(a53*a46);
  a55=(a38*a54);
  a52=(a52+a55);
  a48=(a48-a52);
  a26=(a26+a48);
  a1=(a1-a7);
  a9=(a9-a3);
  a48=(a9*a1);
  a0=(a0-a7);
  a4=(a4-a3);
  a3=(a0*a4);
  a48=(a48-a3);
  a3=(a48+a48);
  a14=(a14-a17);
  a7=(a0*a14);
  a13=(a13-a17);
  a17=(a13*a1);
  a7=(a7-a17);
  a17=casadi_sq(a7);
  a52=(a13*a4);
  a55=(a9*a14);
  a52=(a52-a55);
  a55=casadi_sq(a52);
  a17=(a17+a55);
  a55=casadi_sq(a48);
  a17=(a17+a55);
  a55=casadi_sq(a9);
  a56=casadi_sq(a0);
  a55=(a55+a56);
  a56=casadi_sq(a13);
  a55=(a55+a56);
  a56=casadi_sq(a4);
  a57=casadi_sq(a1);
  a56=(a56+a57);
  a57=casadi_sq(a14);
  a56=(a56+a57);
  a57=(a55*a56);
  a17=(a17/a57);
  a12=(a12/a17);
  a58=(a12/a57);
  a59=(a3*a58);
  a60=(a1*a59);
  a61=(a9+a9);
  a62=(a17/a57);
  a63=(a62*a12);
  a64=(a56*a63);
  a65=(a61*a64);
  a60=(a60-a65);
  a65=(a52+a52);
  a66=(a65*a58);
  a67=(a14*a66);
  a60=(a60-a67);
  a26=(a26-a60);
  a60=(a13*a66);
  a67=(a4+a4);
  a68=(a55*a63);
  a69=(a67*a68);
  a70=(a0*a59);
  a69=(a69+a70);
  a60=(a60-a69);
  a26=(a26-a60);
  if (res[0]!=0) res[0][0]=a26;
  a26=(a16+a16);
  a60=(a26*a24);
  a69=(a15*a60);
  a70=(a8+a8);
  a71=(a70*a29);
  a25=(a10*a25);
  a71=(a71+a25);
  a69=(a69-a71);
  a54=(a35*a54);
  a71=(a40+a40);
  a25=(a71*a51);
  a54=(a54-a25);
  a25=(a39+a39);
  a72=(a25*a46);
  a73=(a32*a72);
  a54=(a54-a73);
  a69=(a69+a54);
  a54=(a9*a59);
  a73=(a1+a1);
  a74=(a73*a68);
  a54=(a54-a74);
  a74=(a7+a7);
  a75=(a74*a58);
  a76=(a13*a75);
  a54=(a54-a76);
  a69=(a69-a54);
  a54=(a14*a75);
  a76=(a0+a0);
  a77=(a76*a64);
  a78=(a4*a59);
  a77=(a77+a78);
  a54=(a54-a77);
  a69=(a69-a54);
  if (res[0]!=0) res[0][1]=a69;
  a31=(a10*a31);
  a69=(a18+a18);
  a54=(a69*a29);
  a31=(a31-a54);
  a60=(a2*a60);
  a31=(a31-a60);
  a72=(a38*a72);
  a60=(a36+a36);
  a54=(a60*a51);
  a47=(a35*a47);
  a54=(a54+a47);
  a72=(a72-a54);
  a31=(a31+a72);
  a72=(a4*a66);
  a54=(a13+a13);
  a47=(a54*a64);
  a72=(a72-a47);
  a47=(a1*a75);
  a72=(a72-a47);
  a31=(a31-a72);
  a72=(a0*a75);
  a47=(a14+a14);
  a77=(a47*a68);
  a78=(a9*a66);
  a77=(a77+a78);
  a72=(a72-a77);
  a31=(a31-a72);
  if (res[0]!=0) res[0][2]=a31;
  a31=(a2+a2);
  a31=(a24*a31);
  a72=(a23/a19);
  a6=(a6+a6);
  a77=(a6*a2);
  a20=(a20+a20);
  a78=(a20*a15);
  a77=(a77-a78);
  a77=(a77/a21);
  a19=(a19/a21);
  a5=(a5+a5);
  a5=(a22*a5);
  a78=(a19*a5);
  a77=(a77-a78);
  a78=(a72*a77);
  a79=(a78/a21);
  a80=(a24/a21);
  a81=(a80*a5);
  a79=(a79+a81);
  a81=(a11*a79);
  a31=(a31-a81);
  a81=(a2*a31);
  a82=2.;
  a83=(a82*a29);
  a77=(a77/a21);
  a84=(a28/a21);
  a5=(a84*a5);
  a77=(a77-a5);
  a77=(a23*a77);
  a78=(a28*a78);
  a77=(a77-a78);
  a77=(a22*a77);
  a78=(a27*a77);
  a83=(a83+a78);
  a81=(a81-a83);
  a83=(a15+a15);
  a83=(a24*a83);
  a78=(a30*a79);
  a83=(a83+a78);
  a78=(a15*a83);
  a81=(a81+a78);
  a78=(a32+a32);
  a78=(a46*a78);
  a5=(a45/a41);
  a34=(a34+a34);
  a85=(a34*a32);
  a42=(a42+a42);
  a86=(a42*a38);
  a85=(a85-a86);
  a85=(a85/a44);
  a41=(a41/a44);
  a33=(a33+a33);
  a33=(a43*a33);
  a86=(a41*a33);
  a85=(a85-a86);
  a86=(a5*a85);
  a87=(a86/a44);
  a88=(a46/a44);
  a89=(a88*a33);
  a87=(a87+a89);
  a89=(a37*a87);
  a78=(a78-a89);
  a89=(a32*a78);
  a90=(a82*a51);
  a85=(a85/a44);
  a91=(a50/a44);
  a33=(a91*a33);
  a85=(a85-a33);
  a85=(a45*a85);
  a86=(a50*a86);
  a85=(a85-a86);
  a85=(a43*a85);
  a86=(a49*a85);
  a90=(a90+a86);
  a86=(a38+a38);
  a86=(a46*a86);
  a33=(a53*a87);
  a86=(a86+a33);
  a33=(a38*a86);
  a90=(a90-a33);
  a89=(a89-a90);
  a81=(a81+a89);
  a89=(a0-a1);
  a90=(a89+a89);
  a90=(a58*a90);
  a33=(a58/a57);
  a92=(a9+a9);
  a93=(a56*a92);
  a94=(a4+a4);
  a95=(a55*a94);
  a93=(a93+a95);
  a95=(a33*a93);
  a96=(a12/a17);
  a52=(a52+a52);
  a97=(a14-a13);
  a98=(a52*a97);
  a48=(a48+a48);
  a89=(a48*a89);
  a98=(a98+a89);
  a98=(a98/a57);
  a17=(a17/a57);
  a89=(a17*a93);
  a98=(a98+a89);
  a89=(a96*a98);
  a99=(a89/a57);
  a95=(a95-a99);
  a99=(a3*a95);
  a90=(a90+a99);
  a99=(a1*a90);
  a100=-2.;
  a101=(a100*a64);
  a98=(a98/a57);
  a102=(a62/a57);
  a93=(a102*a93);
  a98=(a98+a93);
  a98=(a12*a98);
  a89=(a62*a89);
  a98=(a98-a89);
  a89=(a56*a98);
  a94=(a63*a94);
  a89=(a89-a94);
  a94=(a61*a89);
  a101=(a101+a94);
  a99=(a99-a101);
  a97=(a97+a97);
  a97=(a58*a97);
  a101=(a65*a95);
  a97=(a97+a101);
  a101=(a14*a97);
  a99=(a99-a101);
  a81=(a81-a99);
  a99=(a13*a97);
  a101=(a100*a68);
  a98=(a55*a98);
  a92=(a63*a92);
  a98=(a98-a92);
  a92=(a67*a98);
  a101=(a101+a92);
  a92=(a0*a90);
  a101=(a101+a92);
  a99=(a99-a101);
  a81=(a81-a99);
  if (res[1]!=0) res[1][0]=a81;
  a87=(a25*a87);
  a81=(a32*a87);
  a86=(a35*a86);
  a99=(a71*a85);
  a86=(a86+a99);
  a81=(a81-a86);
  a79=(a26*a79);
  a86=(a15*a79);
  a99=(a70*a77);
  a31=(a10*a31);
  a99=(a99+a31);
  a86=(a86+a99);
  a81=(a81-a86);
  a86=(a9*a90);
  a86=(a86-a59);
  a99=(a73*a98);
  a86=(a86-a99);
  a95=(a74*a95);
  a99=(a13*a95);
  a86=(a86-a99);
  a81=(a81-a86);
  a86=(a14*a95);
  a99=(a76*a89);
  a90=(a4*a90);
  a90=(a90-a59);
  a99=(a99+a90);
  a86=(a86-a99);
  a81=(a81-a86);
  if (res[1]!=0) res[1][1]=a81;
  a79=(a2*a79);
  a83=(a10*a83);
  a77=(a69*a77);
  a83=(a83+a77);
  a79=(a79-a83);
  a87=(a38*a87);
  a85=(a60*a85);
  a78=(a35*a78);
  a85=(a85+a78);
  a87=(a87+a85);
  a79=(a79-a87);
  a87=(a4*a97);
  a87=(a87-a66);
  a89=(a54*a89);
  a87=(a87-a89);
  a89=(a1*a95);
  a87=(a87-a89);
  a79=(a79-a87);
  a95=(a0*a95);
  a98=(a47*a98);
  a97=(a9*a97);
  a97=(a97-a66);
  a98=(a98+a97);
  a95=(a95-a98);
  a79=(a79-a95);
  if (res[1]!=0) res[1][2]=a79;
  a16=(a16+a16);
  a79=(a16*a15);
  a6=(a6*a10);
  a79=(a79-a6);
  a79=(a79/a21);
  a8=(a8+a8);
  a8=(a22*a8);
  a6=(a19*a8);
  a79=(a79-a6);
  a6=(a72*a79);
  a95=(a6/a21);
  a98=(a80*a8);
  a95=(a95+a98);
  a98=(a30*a95);
  a97=(a15*a98);
  a87=(a10+a10);
  a87=(a24*a87);
  a89=(a11*a95);
  a87=(a87+a89);
  a89=(a2*a87);
  a79=(a79/a21);
  a8=(a84*a8);
  a79=(a79-a8);
  a79=(a23*a79);
  a6=(a28*a6);
  a79=(a79-a6);
  a79=(a22*a79);
  a6=(a27*a79);
  a89=(a89+a6);
  a97=(a97-a89);
  a42=(a42*a35);
  a39=(a39+a39);
  a89=(a39*a32);
  a42=(a42-a89);
  a42=(a42/a44);
  a40=(a40+a40);
  a40=(a43*a40);
  a89=(a41*a40);
  a42=(a42-a89);
  a89=(a5*a42);
  a6=(a89/a44);
  a8=(a88*a40);
  a6=(a6+a8);
  a8=(a37*a6);
  a85=(a32*a8);
  a42=(a42/a44);
  a40=(a91*a40);
  a42=(a42-a40);
  a42=(a45*a42);
  a89=(a50*a89);
  a42=(a42-a89);
  a42=(a43*a42);
  a89=(a49*a42);
  a40=(a35+a35);
  a40=(a46*a40);
  a78=(a53*a6);
  a40=(a40-a78);
  a78=(a38*a40);
  a89=(a89+a78);
  a85=(a85+a89);
  a97=(a97-a85);
  a85=(a4-a9);
  a89=(a85+a85);
  a89=(a58*a89);
  a78=(a0+a0);
  a83=(a56*a78);
  a77=(a1+a1);
  a81=(a55*a77);
  a83=(a83+a81);
  a81=(a33*a83);
  a7=(a7+a7);
  a86=(a13-a14);
  a99=(a7*a86);
  a48=(a48*a85);
  a99=(a99+a48);
  a99=(a99/a57);
  a48=(a17*a83);
  a99=(a99+a48);
  a48=(a96*a99);
  a85=(a48/a57);
  a81=(a81-a85);
  a85=(a3*a81);
  a89=(a89+a85);
  a85=(a1*a89);
  a85=(a85-a59);
  a99=(a99/a57);
  a83=(a102*a83);
  a99=(a99+a83);
  a99=(a12*a99);
  a48=(a62*a48);
  a99=(a99-a48);
  a48=(a56*a99);
  a77=(a63*a77);
  a48=(a48-a77);
  a77=(a61*a48);
  a85=(a85-a77);
  a77=(a65*a81);
  a83=(a14*a77);
  a85=(a85-a83);
  a97=(a97-a85);
  a85=(a13*a77);
  a99=(a55*a99);
  a78=(a63*a78);
  a99=(a99-a78);
  a78=(a67*a99);
  a83=(a0*a89);
  a83=(a83-a59);
  a78=(a78+a83);
  a85=(a85-a78);
  a97=(a97-a85);
  if (res[1]!=0) res[1][3]=a97;
  a97=(a15+a15);
  a97=(a24*a97);
  a95=(a26*a95);
  a97=(a97-a95);
  a95=(a15*a97);
  a85=(a82*a29);
  a78=(a70*a79);
  a85=(a85+a78);
  a87=(a10*a87);
  a85=(a85-a87);
  a95=(a95-a85);
  a40=(a35*a40);
  a85=(a82*a51);
  a87=(a71*a42);
  a85=(a85+a87);
  a40=(a40-a85);
  a85=(a32+a32);
  a85=(a46*a85);
  a6=(a25*a6);
  a85=(a85+a6);
  a6=(a32*a85);
  a40=(a40+a6);
  a95=(a95+a40);
  a40=(a9*a89);
  a6=(a100*a68);
  a87=(a73*a99);
  a6=(a6+a87);
  a40=(a40-a6);
  a86=(a86+a86);
  a86=(a58*a86);
  a81=(a74*a81);
  a86=(a86+a81);
  a81=(a13*a86);
  a40=(a40-a81);
  a95=(a95-a40);
  a40=(a14*a86);
  a81=(a100*a64);
  a6=(a76*a48);
  a81=(a81+a6);
  a89=(a4*a89);
  a81=(a81+a89);
  a40=(a40-a81);
  a95=(a95-a40);
  if (res[1]!=0) res[1][4]=a95;
  a98=(a10*a98);
  a79=(a69*a79);
  a98=(a98+a79);
  a97=(a2*a97);
  a98=(a98+a97);
  a85=(a38*a85);
  a42=(a60*a42);
  a8=(a35*a8);
  a42=(a42-a8);
  a85=(a85+a42);
  a98=(a98+a85);
  a85=(a4*a77);
  a48=(a54*a48);
  a85=(a85-a48);
  a48=(a1*a86);
  a48=(a48-a75);
  a85=(a85-a48);
  a98=(a98+a85);
  a86=(a0*a86);
  a86=(a86-a75);
  a99=(a47*a99);
  a77=(a9*a77);
  a99=(a99+a77);
  a86=(a86-a99);
  a98=(a98+a86);
  a98=(-a98);
  if (res[1]!=0) res[1][5]=a98;
  a20=(a20*a10);
  a16=(a16*a2);
  a20=(a20-a16);
  a20=(a20/a21);
  a18=(a18+a18);
  a18=(a22*a18);
  a19=(a19*a18);
  a20=(a20-a19);
  a72=(a72*a20);
  a19=(a72/a21);
  a80=(a80*a18);
  a19=(a19+a80);
  a11=(a11*a19);
  a80=(a2*a11);
  a20=(a20/a21);
  a84=(a84*a18);
  a20=(a20-a84);
  a23=(a23*a20);
  a28=(a28*a72);
  a23=(a23-a28);
  a22=(a22*a23);
  a27=(a27*a22);
  a80=(a80+a27);
  a27=(a10+a10);
  a27=(a24*a27);
  a30=(a30*a19);
  a27=(a27-a30);
  a30=(a15*a27);
  a80=(a80+a30);
  a30=(a35+a35);
  a30=(a46*a30);
  a39=(a39*a38);
  a34=(a34*a35);
  a39=(a39-a34);
  a39=(a39/a44);
  a36=(a36+a36);
  a36=(a43*a36);
  a41=(a41*a36);
  a39=(a39-a41);
  a5=(a5*a39);
  a41=(a5/a44);
  a88=(a88*a36);
  a41=(a41+a88);
  a37=(a37*a41);
  a30=(a30+a37);
  a37=(a32*a30);
  a39=(a39/a44);
  a91=(a91*a36);
  a39=(a39-a91);
  a45=(a45*a39);
  a50=(a50*a5);
  a45=(a45-a50);
  a43=(a43*a45);
  a49=(a49*a43);
  a53=(a53*a41);
  a45=(a38*a53);
  a49=(a49-a45);
  a37=(a37+a49);
  a80=(a80+a37);
  a37=(a13+a13);
  a49=(a56*a37);
  a45=(a14+a14);
  a50=(a55*a45);
  a49=(a49+a50);
  a33=(a33*a49);
  a50=(a1-a0);
  a7=(a7*a50);
  a5=(a9-a4);
  a52=(a52*a5);
  a7=(a7+a52);
  a7=(a7/a57);
  a17=(a17*a49);
  a7=(a7+a17);
  a96=(a96*a7);
  a17=(a96/a57);
  a33=(a33-a17);
  a3=(a3*a33);
  a17=(a1*a3);
  a7=(a7/a57);
  a102=(a102*a49);
  a7=(a7+a102);
  a12=(a12*a7);
  a62=(a62*a96);
  a12=(a12-a62);
  a56=(a56*a12);
  a45=(a63*a45);
  a56=(a56-a45);
  a61=(a61*a56);
  a17=(a17-a61);
  a5=(a5+a5);
  a5=(a58*a5);
  a65=(a65*a33);
  a5=(a5+a65);
  a65=(a14*a5);
  a65=(a65-a66);
  a17=(a17-a65);
  a80=(a80+a17);
  a17=(a13*a5);
  a17=(a17-a66);
  a55=(a55*a12);
  a63=(a63*a37);
  a55=(a55-a63);
  a67=(a67*a55);
  a63=(a0*a3);
  a67=(a67+a63);
  a17=(a17-a67);
  a80=(a80+a17);
  a80=(-a80);
  if (res[1]!=0) res[1][6]=a80;
  a80=(a2+a2);
  a24=(a24*a80);
  a26=(a26*a19);
  a24=(a24+a26);
  a15=(a15*a24);
  a70=(a70*a22);
  a11=(a10*a11);
  a70=(a70-a11);
  a15=(a15+a70);
  a53=(a35*a53);
  a71=(a71*a43);
  a53=(a53+a71);
  a71=(a38+a38);
  a46=(a46*a71);
  a25=(a25*a41);
  a46=(a46-a25);
  a32=(a32*a46);
  a53=(a53+a32);
  a15=(a15+a53);
  a53=(a9*a3);
  a73=(a73*a55);
  a53=(a53-a73);
  a50=(a50+a50);
  a58=(a58*a50);
  a74=(a74*a33);
  a58=(a58+a74);
  a13=(a13*a58);
  a13=(a13-a75);
  a53=(a53-a13);
  a15=(a15+a53);
  a14=(a14*a58);
  a14=(a14-a75);
  a76=(a76*a56);
  a3=(a4*a3);
  a76=(a76+a3);
  a14=(a14-a76);
  a15=(a15+a14);
  a15=(-a15);
  if (res[1]!=0) res[1][7]=a15;
  a10=(a10*a27);
  a29=(a82*a29);
  a69=(a69*a22);
  a29=(a29+a69);
  a10=(a10-a29);
  a2=(a2*a24);
  a10=(a10+a2);
  a38=(a38*a46);
  a82=(a82*a51);
  a60=(a60*a43);
  a82=(a82+a60);
  a35=(a35*a30);
  a82=(a82-a35);
  a38=(a38-a82);
  a10=(a10+a38);
  a4=(a4*a5);
  a64=(a100*a64);
  a54=(a54*a56);
  a64=(a64+a54);
  a4=(a4-a64);
  a1=(a1*a58);
  a4=(a4-a1);
  a10=(a10-a4);
  a0=(a0*a58);
  a100=(a100*a68);
  a47=(a47*a55);
  a100=(a100+a47);
  a9=(a9*a5);
  a100=(a100+a9);
  a0=(a0-a100);
  a10=(a10-a0);
  if (res[1]!=0) res[1][8]=a10;
  return 0;
}

CASADI_SYMBOL_EXPORT int ec_loss_trig_gh(const casadi_real** arg, casadi_real** res, casadi_int* iw, casadi_real* w, int mem){
  return casadi_f1(arg, res, iw, w, mem);
}

CASADI_SYMBOL_EXPORT int ec_loss_trig_gh_alloc_mem(void) {
  return 0;
}

CASADI_SYMBOL_EXPORT int ec_loss_trig_gh_init_mem(int mem) {
  return 0;
}

CASADI_SYMBOL_EXPORT void ec_loss_trig_gh_free_mem(int mem) {
}

CASADI_SYMBOL_EXPORT int ec_loss_trig_gh_checkout(void) {
  return 0;
}

CASADI_SYMBOL_EXPORT void ec_loss_trig_gh_release(int mem) {
}

CASADI_SYMBOL_EXPORT void ec_loss_trig_gh_incref(void) {
}

CASADI_SYMBOL_EXPORT void ec_loss_trig_gh_decref(void) {
}

CASADI_SYMBOL_EXPORT casadi_int ec_loss_trig_gh_n_in(void) { return 1;}

CASADI_SYMBOL_EXPORT casadi_int ec_loss_trig_gh_n_out(void) { return 2;}

CASADI_SYMBOL_EXPORT casadi_real ec_loss_trig_gh_default_in(casadi_int i) {
  switch (i) {
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT const char* ec_loss_trig_gh_name_in(casadi_int i) {
  switch (i) {
    case 0: return "i0";
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT const char* ec_loss_trig_gh_name_out(casadi_int i) {
  switch (i) {
    case 0: return "o0";
    case 1: return "o1";
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT const casadi_int* ec_loss_trig_gh_sparsity_in(casadi_int i) {
  switch (i) {
    case 0: return casadi_s0;
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT const casadi_int* ec_loss_trig_gh_sparsity_out(casadi_int i) {
  switch (i) {
    case 0: return casadi_s2;
    case 1: return casadi_s3;
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT int ec_loss_trig_gh_work(casadi_int *sz_arg, casadi_int* sz_res, casadi_int *sz_iw, casadi_int *sz_w) {
  if (sz_arg) *sz_arg = 1;
  if (sz_res) *sz_res = 2;
  if (sz_iw) *sz_iw = 0;
  if (sz_w) *sz_w = 0;
  return 0;
}


#ifdef __cplusplus
} /* extern "C" */
#endif