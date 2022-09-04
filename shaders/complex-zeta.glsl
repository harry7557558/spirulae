// https://www.shadertoy.com/view/flcyWn by guil

// Licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
// According to Shadertoy terms - https://www.shadertoy.com/terms


const float pi = 3.1415926535897932;
const float LOG2 = 0.6931471805599453;
const float LOGPI = 1.1447298858494002;

vec2 cadd( vec2 a, float s ) { return vec2( a.x+s, a.y ); }
vec2 cmul( vec2 a, vec2 b )  { return vec2( a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x ); }
vec2 cinv(vec2 z) {return vec2(z.x,-z.y)/dot(z,z);}
vec2 cdiv( vec2 a, vec2 b )  { float d = dot(b,b); return vec2( dot(a,b), a.y*b.x - a.x*b.y ) / d; }
vec2 csqr( vec2 a ) { return vec2(a.x*a.x-a.y*a.y, 2.0*a.x*a.y ); }
vec2 csqrt( vec2 z ) { float m = length(z); return sqrt( 0.5*vec2(m+z.x, m-z.x) ) * vec2( 1.0, sign(z.y) ); }
vec2 conj( vec2 z ) { return vec2(z.x,-z.y); }
vec2 cpow( vec2 z, float n ) { float r = length( z ); float a = atan( z.y, z.x ); return pow( r, n )*vec2( cos(a*n), sin(a*n) ); }
vec2 cpow( float n, vec2 z ) {  return pow( n, z.x )*vec2( cos(z.y*log(n)), sin(z.y*log(n)) ); }
vec2 cexp( vec2 z) {  return exp( z.x )*vec2( cos(z.y), sin(z.y) ); }
vec2 clog( vec2 z) {  return vec2( 0.5*log(z.x*z.x+z.y*z.y), atan(z.y,z.x)); }
vec2 csin( vec2 z) { float r = exp(z.y); return 0.5*vec2((r+1.0/r)*sin(z.x),(r-1.0/r)*cos(z.x));}
vec2 cpow( vec2 a, vec2 b ) {  return cexp(cmul(b,clog(a))) ;}
vec2 ccos( vec2 z) { float r = exp(z.y); return 0.5*vec2((r+1.0/r)*cos(z.x),-(r-1.0/r)*sin(z.x));}
vec2 clogsin(vec2 z) {
  if (abs(z.y)<8.0)return clog(csin(z));  
  if (z.y > 0.) return vec2(z.y - LOG2, mod(1.5*pi-z.x, 2.0*pi) - pi);
  else return vec2(-z.y - LOG2, mod(0.5*pi+z.x, 2.0*pi) - pi);
}

// Spouge's method for loggamma
vec2 logspouge(vec2 z){
    const int N = 16;
    float c = sqrt(2.*pi);
	vec2 s = vec2(c,0.);
    float f = 1.;
	for(int k = 1; k<N ;k++){
		c = exp(float(N-k)) * pow(float(N-k),float(k)-.5)/f;
        f *= -float(k);
        s += c*cinv(z+vec2(float(k),0.));
	}	   
    //s = cmul(s,cmul(cexp(-z-vec2(float(N),0.)),cpow(z+vec2(float(N),0.),z+vec2(.5,0.))));
    //return cdiv(s,z);
    s = clog(s); 
    s += -z - vec2(float(N),0.) + cmul(z+vec2(.5,0.), clog(z+vec2(float(N),0.)));
    return s-clog(z);      
}


// Spouge approximation for loggamma function
vec2 loggamma(vec2 z){
  if(z.x > 0.5) return logspouge(z);
  return vec2(LOGPI,0)-clogsin(pi*z)-logspouge(vec2(1,0)-z);
}


//Basic eta def
vec2 eta1(vec2 z){
  const float N = 200.;
  vec2 sum = vec2(0);
  float s=1.;
  for(float i = 0.; i < N; i++)
    sum += s*cpow(i+1.,-z), s*=-1.;
  return sum;
}

//Knopp and Hasse
vec2 eta2(vec2 z){
  const float N = 50.;
  vec2 sum = vec2(0);
  for(float i = 0.; i < N; i++){
    vec2 term = vec2(0);
    float s = 1.;
    float bnk = 1./pow(2.,i+1.);
    for(float k = 0.; k < i+1.; k++){
       term += s*bnk* cpow(k+1.,-z);
       bnk *= (i-k)/(k+1.);
       s*=-1.;
       }
    sum += term;
    }
  return sum;
}




//Same algorithm as in mia shader but extended to N = 40
//ek coeff are calculated on the fly
//http://numbers.computation.free.fr/Constants/Miscellaneous/zetaevaluations.pdf
vec2 eta3(vec2 s) {
  const int N = 120;  

  vec2 sum1 = vec2(0);
  float a = 1.0;
  for(int i = 1; i <= N; i++) {
    sum1 += a*(cpow(float(i), -s));
    a = -a;
  }
  vec2 sum2 = vec2(0);
  a = -1.0;
  float bk= 1.0/pow(2.,float(N));
  float ek= bk;
  for(int i = 0 ; i <  N; i++) {
    sum2 += a*ek*(cpow(float(2*N-i),-s));
    bk *= float(N-i)/float(i+1);
    ek += bk;    
    a = -a;
  }

  return sum1 + sum2;
}

//Borwein method, valid for z.x > 0 
//http://numbers.computation.free.fr/Constants/Miscellaneous/zetaevaluations.pdf
vec2 eta4(vec2 z){
        
    int n1=100;
    int n2=45;
    
	float a=1.;
    vec2  sum1 = vec2(0.);
    for (int i = 1; i <= n1 ; i++) {
        sum1 += cpow(float(i),-z)*a;
        a=-a;
        }
    
    float dni = 1.;
    float dnn = dni;
    float val = dni;
	for(int i = 1; i<=n2 ;i++){
		val *= 2.*float((n2+i-1)*(n2-i+1))/float((2*i-1)*i);
		dnn+= val;		
	}
    dni = 1./dnn;
    val = dni;
    vec2  sum2 = vec2(0.);
    for (int i = 1; i <= n2 ; i++) {
        float ci = 1.- dni;
        sum2 += a*ci*cpow(float(i+n1),-z);
        a *= -1.;
        val *= 2.*float((n2+i-1)*(n2-i+1))/float((2*i-1)*i);
        dni +=val;
        }
    return sum1+sum2;
}


vec2 logkhi(vec2 z){
    return z*log(2.*pi)-vec2(log(pi),0)+clogsin(pi*z/2.)+loggamma(vec2(1.,0.)-z);
}  

//Henri Cohen, Fernando Rodriguez Villegas, and Don Zagier
//https://people.mpim-bonn.mpg.de/zagier/files/exp-math-9/fulltext.pdf
vec2 eta5(vec2 z){
  const float N1 = 300.;
  const float N2 = 48.;
  
  vec2 s1 = vec2(0);
  float a = 1.0;
  for(float i = 0.; i < N1; i++) {
    s1 += a*(cpow(i+1., -z));
    a = -a;
  }
  
  float d= pow((3. + sqrt(8.)),N2);
  d=(d+1./d)/2.;
  float b=-1.,c=-d;
  vec2 s2 = vec2(0);
  for(float k = 0.; k < N2; k++)
    c = b-c,
    s2 += c*cpow(k+N1+1.,-z),
    b *= (k+N2)/(k+0.5)*(k-N2)/(k+1.);
    
  return s1+s2/d;
}



//Riemann-Siegel formula
//Valid for 0<z.x<1 and abs(z.y) very large
//http://numbers.computation.free.fr/Constants/Miscellaneous/zetaevaluations.pdf
vec2 zeta6(vec2 z){
  const float N = 300.;
  float m = sqrt(abs(z.y)/(2.*pi));
  vec2 sum1 = vec2(0);
  vec2 sum2 = vec2(0);
  for(float i = 0.; i < N; i++){
    if(i>m)break;
    sum1 += cpow(i+1.,-z); 
    sum2 += cpow(i+1.,z-vec2(1,0));
    
}    
  return sum1 + cexp(logkhi(z)+clog(sum2));
}

//Dirichlet lambda = (eta+zeta)/2 = sum (2*i+1)**-z for i in N
//zeta = lambda /(1-2**-z)
//not very accurate near 0 but very accurate for large Im(z)
vec2 lambda(vec2 z){
  const float N = 300.;
  vec2 sum = vec2(0);
  
  for(float i = 0.; i < N; i++)
    sum += cpow(2.*i+1.,-z);
  return sum;
}


vec2 logzeta(vec2 z){
    if(z.x<.5)return logkhi(z)+clog(eta4(vec2(1.,0.)-z))-clog(vec2(1,0)-cpow(2.,z));
    return clog(eta4(z))-clog(vec2(1,0)-cpow(2.,vec2(1,0)-z));
}

vec2 zeta(vec2 z){    
    return cexp(logzeta(z));
}

vec2 zetabrot(vec2 z){
    for(int i = 0; i < 12; i++){
        z=zeta(z);
        if (dot(z,z)<.7)break;
        }
    return z;
}
