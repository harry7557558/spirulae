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
  #define CASADI_PREFIX(ID) meshgen_loss_trig_ ## ID
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
#define casadi_s0 CASADI_PREFIX(s0)
#define casadi_s1 CASADI_PREFIX(s1)
#define casadi_s2 CASADI_PREFIX(s2)
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
static const casadi_int casadi_s2[21] = {1, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0};

/* meshgen_loss_trig:(i0[9])->(o0,o1[1x9],o2) */
static int casadi_f0(const casadi_real** arg, casadi_real** res, casadi_int* iw, casadi_real* w, int mem) {
  casadi_real a0, a1, a10, a11, a12, a13, a14, a15, a16, a17, a18, a19, a2, a20, a21, a22, a23, a24, a25, a26, a3, a4, a5, a6, a7, a8, a9;
  a0=arg[0]? arg[0][4] : 0;
  a1=arg[0]? arg[0][1] : 0;
  a2=(a0-a1);
  a3=arg[0]? arg[0][0] : 0;
  a4=arg[0]? arg[0][3] : 0;
  a5=(a3+a4);
  a6=arg[0]? arg[0][6] : 0;
  a5=(a5+a6);
  a7=3.;
  a5=(a5/a7);
  a8=(a3-a5);
  a9=casadi_sq(a8);
  a10=(a1+a0);
  a11=arg[0]? arg[0][7] : 0;
  a10=(a10+a11);
  a10=(a10/a7);
  a12=(a1-a10);
  a13=casadi_sq(a12);
  a9=(a9+a13);
  a13=arg[0]? arg[0][2] : 0;
  a14=arg[0]? arg[0][5] : 0;
  a15=(a13+a14);
  a16=arg[0]? arg[0][8] : 0;
  a15=(a15+a16);
  a15=(a15/a7);
  a7=(a13-a15);
  a17=casadi_sq(a7);
  a9=(a9+a17);
  a17=(a4-a5);
  a18=casadi_sq(a17);
  a9=(a9+a18);
  a0=(a0-a10);
  a18=casadi_sq(a0);
  a9=(a9+a18);
  a18=(a14-a15);
  a19=casadi_sq(a18);
  a9=(a9+a19);
  a5=(a6-a5);
  a19=casadi_sq(a5);
  a9=(a9+a19);
  a10=(a11-a10);
  a19=casadi_sq(a10);
  a9=(a9+a19);
  a15=(a16-a15);
  a19=casadi_sq(a15);
  a9=(a9+a19);
  a19=sqrt(a9);
  a2=(a2/a19);
  a16=(a16-a13);
  a16=(a16/a19);
  a20=(a2*a16);
  a14=(a14-a13);
  a14=(a14/a19);
  a11=(a11-a1);
  a11=(a11/a19);
  a1=(a14*a11);
  a20=(a20-a1);
  a1=casadi_sq(a20);
  a6=(a6-a3);
  a6=(a6/a19);
  a13=(a14*a6);
  a4=(a4-a3);
  a4=(a4/a19);
  a3=(a4*a16);
  a13=(a13-a3);
  a3=casadi_sq(a13);
  a1=(a1+a3);
  a3=(a4*a11);
  a21=(a2*a6);
  a3=(a3-a21);
  a21=casadi_sq(a3);
  a1=(a1+a21);
  a21=log(a1);
  a21=(-a21);
  if (res[0]!=0) res[0][0]=a21;
  a21=3.3333333333333331e-01;
  a5=(a5+a5);
  a22=(a4/a19);
  a13=(a13+a13);
  a13=(a13/a1);
  a23=(a16*a13);
  a3=(a3+a3);
  a3=(a3/a1);
  a24=(a11*a3);
  a23=(a23-a24);
  a22=(a22*a23);
  a24=(a6/a19);
  a25=(a2*a3);
  a26=(a14*a13);
  a25=(a25-a26);
  a24=(a24*a25);
  a22=(a22+a24);
  a24=(a11/a19);
  a20=(a20+a20);
  a20=(a20/a1);
  a1=(a14*a20);
  a26=(a4*a3);
  a1=(a1-a26);
  a24=(a24*a1);
  a22=(a22+a24);
  a14=(a14/a19);
  a11=(a11*a20);
  a24=(a6*a13);
  a11=(a11-a24);
  a14=(a14*a11);
  a22=(a22+a14);
  a14=(a16/a19);
  a4=(a4*a13);
  a13=(a2*a20);
  a4=(a4-a13);
  a14=(a14*a4);
  a22=(a22+a14);
  a2=(a2/a19);
  a6=(a6*a3);
  a16=(a16*a20);
  a6=(a6-a16);
  a2=(a2*a6);
  a22=(a22+a2);
  a2=(a19+a19);
  a22=(a22/a2);
  a5=(a5*a22);
  a17=(a17+a17);
  a17=(a17*a22);
  a2=(a5+a17);
  a8=(a8+a8);
  a8=(a8*a22);
  a2=(a2+a8);
  a2=(a21*a2);
  a23=(a23/a19);
  a25=(a25/a19);
  a16=(a23+a25);
  a16=(a16+a8);
  a16=(a2-a16);
  if (res[1]!=0) res[1][0]=a16;
  a10=(a10+a10);
  a10=(a10*a22);
  a0=(a0+a0);
  a0=(a0*a22);
  a16=(a10+a0);
  a12=(a12+a12);
  a12=(a12*a22);
  a16=(a16+a12);
  a16=(a21*a16);
  a1=(a1/a19);
  a12=(a1+a12);
  a12=(a16-a12);
  a6=(a6/a19);
  a12=(a12-a6);
  if (res[1]!=0) res[1][1]=a12;
  a15=(a15+a15);
  a15=(a15*a22);
  a18=(a18+a18);
  a18=(a18*a22);
  a12=(a15+a18);
  a7=(a7+a7);
  a7=(a7*a22);
  a12=(a12+a7);
  a21=(a21*a12);
  a11=(a11/a19);
  a4=(a4/a19);
  a19=(a11+a4);
  a19=(a19+a7);
  a19=(a21-a19);
  if (res[1]!=0) res[1][2]=a19;
  a23=(a23-a17);
  a23=(a23+a2);
  if (res[1]!=0) res[1][3]=a23;
  a0=(a16-a0);
  a0=(a0+a6);
  if (res[1]!=0) res[1][4]=a0;
  a11=(a11-a18);
  a11=(a11+a21);
  if (res[1]!=0) res[1][5]=a11;
  a25=(a25-a5);
  a25=(a25+a2);
  if (res[1]!=0) res[1][6]=a25;
  a1=(a1-a10);
  a1=(a1+a16);
  if (res[1]!=0) res[1][7]=a1;
  a4=(a4-a15);
  a4=(a4+a21);
  if (res[1]!=0) res[1][8]=a4;
  if (res[2]!=0) res[2][0]=a9;
  return 0;
}

CASADI_SYMBOL_EXPORT int meshgen_loss_trig(const casadi_real** arg, casadi_real** res, casadi_int* iw, casadi_real* w, int mem){
  return casadi_f0(arg, res, iw, w, mem);
}

CASADI_SYMBOL_EXPORT int meshgen_loss_trig_alloc_mem(void) {
  return 0;
}

CASADI_SYMBOL_EXPORT int meshgen_loss_trig_init_mem(int mem) {
  return 0;
}

CASADI_SYMBOL_EXPORT void meshgen_loss_trig_free_mem(int mem) {
}

CASADI_SYMBOL_EXPORT int meshgen_loss_trig_checkout(void) {
  return 0;
}

CASADI_SYMBOL_EXPORT void meshgen_loss_trig_release(int mem) {
}

CASADI_SYMBOL_EXPORT void meshgen_loss_trig_incref(void) {
}

CASADI_SYMBOL_EXPORT void meshgen_loss_trig_decref(void) {
}

CASADI_SYMBOL_EXPORT casadi_int meshgen_loss_trig_n_in(void) { return 1;}

CASADI_SYMBOL_EXPORT casadi_int meshgen_loss_trig_n_out(void) { return 3;}

CASADI_SYMBOL_EXPORT casadi_real meshgen_loss_trig_default_in(casadi_int i) {
  switch (i) {
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT const char* meshgen_loss_trig_name_in(casadi_int i) {
  switch (i) {
    case 0: return "i0";
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT const char* meshgen_loss_trig_name_out(casadi_int i) {
  switch (i) {
    case 0: return "o0";
    case 1: return "o1";
    case 2: return "o2";
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT const casadi_int* meshgen_loss_trig_sparsity_in(casadi_int i) {
  switch (i) {
    case 0: return casadi_s0;
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT const casadi_int* meshgen_loss_trig_sparsity_out(casadi_int i) {
  switch (i) {
    case 0: return casadi_s1;
    case 1: return casadi_s2;
    case 2: return casadi_s1;
    default: return 0;
  }
}

CASADI_SYMBOL_EXPORT int meshgen_loss_trig_work(casadi_int *sz_arg, casadi_int* sz_res, casadi_int *sz_iw, casadi_int *sz_w) {
  if (sz_arg) *sz_arg = 1;
  if (sz_res) *sz_res = 3;
  if (sz_iw) *sz_iw = 0;
  if (sz_w) *sz_w = 0;
  return 0;
}


#ifdef __cplusplus
} /* extern "C" */
#endif
