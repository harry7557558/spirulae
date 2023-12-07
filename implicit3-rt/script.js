// 3D Implicit Surface Grapher

const NAME = "spirulae.implicit3-rt.";

const builtinFunctions = [
    // ["A6 Heart", "(x^2+9/4*y^2+z^2-1)^3=(x^2+9/80*y^2)*z^3"],
    ["A4 Genus 3", "(x^2-1)^2+(y^2-1)^2+(z^2-1)^2+4(x^2y^2+x^2z^2+y^2z^2)+8xyz-2(x^2+y^2+z^2)"],
    ["A5 Star", "4(x^2+2y^2+z^2-1)^2-z(5x^4-10x^2z^2+z^4)=1"],
    ["A6 Fox", "2(x^2+2y^2+z^2)^3-2(9x^2+y^2)z^3=1"],
    ["A7 Genus 2", "2y(y^2-3x^2)(1-z^2)+(x^2+y^2)^2-(9z^2-1)(1-z^2)"],
    ["A4 Goursat", "2(x^4+y^4+z^4)-3(x^2+y^2+z^2)+2"],
    ["A6 Spiky 1", "(x^2+y^2+z^2-2)^3+2000(x^2y^2+x^2z^2+y^2z^2)=10"],
    ["A6 Spiky 2", "0=z^6-5(x^2+y^2)z^4+5(x^2+y^2)^2z^2+2(5x^4-10x^2y^2+y^4)yz-1.002(x^2+y^2+z^2)^3+0.2"],
    ["A6 Barth", "3(x^2+y^2+z^2-1)^2-4(x^2-y^2)(y^2-z^2)(z^2-x^2)"],
    ["A3 Ding-Dong", "x^2+y^2=(1-z)z^2"],
    ["A3 Bridge", "x^2+y^2z+z^2=0.01"],
    ["A8 Balloons", "(x^2+y^2+z^2)^4=(8xyz)^2"],
    ["Radical Heart", "x^2+4y^2+(1.15z-0.6(2(x^2+.05y^2+.001)^0.7+y^2)^0.3+0.3)^2=1"],
    // ["Ln Wineglass", "x^2+y^2-ln(z+1)^2-0.02"],
    ["Spheres", "(sin(2x)sin(2y)sin(2z)-0.9)e^(x+y)"],
    ["Noisy Sphere", "x^2+y^2+z^2=1+0.1sin(10x)sin(10y)sin(10z)"],
    // ["Noisy Octa", "abs(x)+abs(y)+abs(z)-1+0.7cos(10x)cos(10y)cos(10z)"],
    // ["Noisy Peanut", "1/((x-1)^2+y^2+z^2)+1/((x+1)^2+y^2+z^2)-1.4=0.02(cos(30x)+cos(30y)cos(30z))"],
    ["Bull's Head", "cos(3x)cos(3y)+sin(3y)cos(3z)-asin(sin(3z)cos(3x))+x^2+y^2+z^2-1"],
    // ["Radio Sphere", "f(k)=sin(kx)sin(ky)sin(kz)/k;k=10&#32;#&#32;play&#32;with&#32;this&#32;parameter;s=ln(e^10+e^k);x^2+y^2+z^2-1=f(s(f(k)+f(2k)+f(3k)+f(4k)+f(8k)))"],
    // ["Bracelet", "rho=hypot(x,y)-1;a=atan(y,x);rho1=hypot(rho,z);a1=atan(z,rho);r=0.1(1+0.1asin(0.99sin(2a1-2.5a))^2;f(x,y,z)=hypot(rho,z)-r;4f(0.9x,y,0.5z)"],
    ["Sin Terrace", "z=0.25round(4sin(x)sin(y))"],
    ["Tan Cells", "z=1/((tan(x)tan(y))^2+1)-1/2"],
    ["Arcsin Field", "z=1/2arcsin(cos(2log(x^2+y^2))cos(5atan(y,x)))^2ln(hypot(x,y)+1)"],
    ["Erf Field", "2z=erf(x)-erfc(y)+erfinv(sin(2x)cos(2y))"],
    ["Tan Forest", "z=.2tan(asin(cos(5x)cos(5y)))+.5sin(10z)"],
    ["Sine Field", "z=100sin(x-sqrt(x^2+y^2))^8sin(y+sqrt(x^2+y^2)-z)^8/(x^2+y^2+50)"],
    ["Sine Tower", "4z+6=1/((sin(4x)sin(4y))^2+0.4sqrt(x^2+y^2+0.005z^2))-4sin(8z)"],
    ["Atan2 Drill", "max(cos(atan(y,x)-20e^((z-1)/4)),x^2+y^2+z/2-1)"],
    // ["Atan2 Donut", "(x^2+y^2+z^2+0.9)^2-4(x^2+z^2)=0.1asin(0.9sin(5atan(z,x)+40y))"],
    ["Atan2 Flower", "a=atan2(z,x)+pi/2;(x^2+z^2)^2+16y^2=2(x^2+z^2)(sin(2.5a)^2+0.5sin(10a)^2)"],
    ["Log2 Spheres", "m=max(|x|,|y|,|z|);k=3/2-m;n=ceil(log(2,k))-2;(3*2^n-k)^2+(x^2+y^2+z^2-m^2)=4^n"],
    ["nCr", "#&#32;suffers&#32;from&#32;numerical&#32;inaccuracy;e^z=nCr(round(x),round(y))"],
    ["Bouquet", "r=hypot(x,y,z);theta=atan2(y,x);phi=atan2(hypot(x,y),z)^1.5;r(1-0.5cos(phi))=(1-sin(min(5phi,pi/2))sin(2.5theta-20e^-5phi)^2)cos(5phi)"],
    ["Eyes 1", "n=3ln((x^2+z^2)/(|x|+0.01));sqrt(x^2+z^2)sin(n)^2=10y^2+x^2+0.5z^2-0.3z"],
    ["Eyes 2", "a=3(z+x+1);b=3(z-x+1);sin(min(a*sin(b),b*sin(a)))-cos(max(a*cos(b),b*cos(a)))=(3-2z)/9+((2x^2+z^2)/6)^3+100y^2"],
    ["Spiral 1", "k=0.14;r=1/k*ln(hypot(x,y));10((k(xcos(r)+ysin(r))-0.5^2(x^2+y^2))^2+z^2)=x^2+y^2"],
    ["Spiral 2", "k=0.2;r=1/k*ln(hypot(x,y));(k*(xcos(r)+ysin(r)))^2+z^2=0.09tanh(x^2+y^2)-0.02(x^2+y^2)"],
    // ["Spiral 3", "k=0.14;r=hypot(x,y,0.01);r1=1/k*ln(r);10((k(xcos(r1)+ysin(r1))-(0.5r)^2)^2+((z+0.5r-0.5)(r^2+0.1))^2)=r^2"],
    ["Spiral 3", "g(x)=10atan(x);r=hypot(x,y);s=xsin(g(r))-ycos(g(r);t(x,y,z)=8z^2(r^2+0.1)^-0.6+0.015r^2-tanh(s);0.25t(4z+2,4x,4y)"],
    ["Spiral 4", "g(x)=20root(4,x);r=hypot(x,y);s(x,y,z)=((2(z+0.1sin(10r)))^4)+0.1r^2-xsin(g(r))+ycos(g(r));0.25s(-4z,4x,4y)"],
    ["Atan2 Spirula", "k=0.15&#32;#&#32;r=e^kt;#&#32;polar&#32;coordinates;r=2hypot(x,y);a=atan(y,x);#&#32;index&#32;of&#32;spiral&#32;layer;n=min((log(r)/k-a)/(2pi),1);#&#32;distance&#32;to&#32;logarithmic&#32;spiral;d(n)=abs(e^(k*(2pin+a))-r);d1=min(d(floor(n)),d(ceil(n)));sqrt(d1^2+4z^2)=0.4r^0.7(1+0.01sin(40a))"],
    ["Spiky Spirula", "r1=hypot(x,y);r2=r1*(1+0.5e^(-r1^6)(2/pi*asin(0.99sin(10atan(y,x))))^5exp(-(8z)^2/r1));d(x,y,z)=xcos(3ln(r2))+ysin(3ln(r2))-(x^2+y^2+10z^2/r1);-3d(-0.3x,0.3z-0.2,0.3y)"],
    ["Spiral Cliff", "r=hypot(x,y);g=15atan(2r);s=xsin(g)-ycos(g);ze^(10z)=tanh(tanh(r)s)"],
    ["FCC Cell", "s=max(|x|,|y|,|z|);s1=(|x|-1)^2+(|y|-1)^2+(|z|-1)^2-1/2;s2=(s-1)^2+(x^2+y^2+z^2-s^2)-1/2;min(4max(s1,s-1),2max(s2,s-1))"],
    ["Atomic Orbitals", "r=hypot(x,y,z);x1=x/r;y1=y/r;z1=z/r;d(r0)=r0^2-r^2;r00(x,y,z)=d(0.28);r10(x,y,z)=d(-0.49y1);r11(x,y,z)=d(0.49z1);r12(x,y,z)=d(-0.49x1);r20(x,y,z)=d(1.09x1y1);r21(x,y,z)=d(-1.09y1z1);r22(x,y,z)=d(0.32(3z1^2-1));r23(x,y,z)=d(-1.09x1z1);r24(x,y,z)=d(0.55(x1^2-y1^2));-max(r00(x,y,z-1.5),r10(x+1,y,z-0.4),r11(x,y,z-0.4),r12(x-1,y,z-0.4),r20(x+2,y,z+1),r21(x+1,y,z+1),r22(x,y,z+1),r23(x-1,y,z+1),r24(x-2,y,z+1))"],
    ["Terrain", "h(x,y)=fract(126sin(12x+33y+98))-0.5;s(x)=3x^2-2x^3;v00=h(floor(x),floor(y));v01=h(floor(x),floor(y)+1);v10=h(floor(x)+1,floor(y));v11=h(floor(x)+1,floor(y)+1);f(x,y)=mix(mix(v00,v01,s(fract(y))),mix(v10,v11,s(fract(y))),s(fract(x)));v(x,y)=f(x,y)+f(2x,2y)/2+f(4x,4y)/4+f(8x,8y)/8+f(16x,16y)/16;z=ln(1+exp(40(v(x,y)-(0.05(x^2+y^2))^2)))/40"],
    ["Fractal Roots", "u(x,y)=x^2-y^2+z;v(x,y)=2xy;u1(x,y)=u(u(x,y)+x,v(x,y)+y);v1(x,y)=v(u(x,y)+x,v(x,y)+y);u2(x,y)=u(u1(x,y)+x,v1(x,y)+y);v2(x,y)=v(u1(x,y)+x,v1(x,y)+y);log(u2(x,y)^2+v2(x,y)^2)=0"],
    ["Spiky Fractal", "u(x,y,z)=yz;v(x,y,z)=xz;w(x,y,z)=xy;u1(x,y,z)=u(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);v1(x,y,z)=v(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);w1(x,y,z)=w(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);u2(x,y,z)=u(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);v2(x,y,z)=v(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);w2(x,y,z)=w(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);u3(x,y,z)=u(u2(x,y,z)+x,v2(x,y,z)+y,w2(x,y,z)+z);v3(x,y,z)=v(u2(x,y,z)+x,v2(x,y,z)+y,w2(x,y,z)+z);w3(x,y,z)=w(u2(x,y,z)+x,v2(x,y,z)+y,w2(x,y,z)+z);log(u3(x,y,z)^2+v3(x,y,z)^2+w3(x,y,z)^2)=log(0.01)"],
    ["Mandelbrot", "u(x,y)=x^2-y^2;v(x,y)=2xy;u1(x,y)=u(u(x,y)+x,v(x,y)+y);v1(x,y)=v(u(x,y)+x,v(x,y)+y);u2(x,y)=u(u1(x,y)+x,v1(x,y)+y);v2(x,y)=v(u1(x,y)+x,v1(x,y)+y);u3(x,y)=u(u2(x,y)+x,v2(x,y)+y);v3(x,y)=v(u2(x,y)+x,v2(x,y)+y);u4(x,y)=u(u3(x,y)+x,v3(x,y)+y);v4(x,y)=v(u3(x,y)+x,v3(x,y)+y;u5(x,y)=u(u4(x,y)+x,v4(x,y)+y);v5(x,y)=v(u4(x,y)+x,v4(x,y)+y);u6(x,y)=u(u5(x,y)+x,v5(x,y)+y);v6(x,y)=v(u5(x,y)+x,v5(x,y)+y);log(u6(x-1/2,hypot(y,z))^2+v6(x-1/2,hypot(y,z))^2)=0"],
    ["Burning Ship", "u(x,y)=x^2-y^2;v(x,y)=2abs(xy);u1(x,y)=u(u(x,y)+x,v(x,y)+y);v1(x,y)=v(u(x,y)+x,v(x,y)+y);u2(x,y)=u(u1(x,y)+x,v1(x,y)+y);v2(x,y)=v(u1(x,y)+x,v1(x,y)+y);u3(x,y)=u(u2(x,y)+x,v2(x,y)+y);v3(x,y)=v(u2(x,y)+x,v2(x,y)+y);u4(x,y)=u(u3(x,y)+x,v3(x,y)+y);v4(x,y)=v(u3(x,y)+x,v3(x,y)+y;u5(x,y)=u(u4(x,y)+x,v4(x,y)+y);v5(x,y)=v(u4(x,y)+x,v4(x,y)+y);u6(x,y)=u(u5(x,y)+x,v5(x,y)+y);v6(x,y)=v(u5(x,y)+x,v5(x,y)+y);z=0.8(u6(-x-1/4,-y-1/2)^2+v6(-x-1/4,-y-1/2)^2)^-0.1-1"],
    ["MandelTorus", "k=6;m=6;n=6;R=1.5;r=hypot(hypot(x,y)-R,z);a=atan(y,x);b=atan(hypot(x,y)-R,z);u(x,y,z)=cos(ma)(R+r^ksin(nb));v(x,y,z)=sin(ma)(R+r^ksin(nb));w(x,y,z)=r^kcos(nb);u1(x,y,z)=u(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);v1(x,y,z)=v(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);w1(x,y,z)=w(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);u2(x,y,z)=u(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);v2(x,y,z)=v(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);w2(x,y,z)=w(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);T(x,y,z)=log(hypot(u2(x,y,z),v2(x,y,z),w2(x,y,z)));T(0.6x(R+1),0.6z(R+1),0.6y(R+1))=R*(e^-k+k-1)/(1+e^-k)"],
    // ["Slicing Fruit", "#&#32;spherical&#32;coordinates;r=sqrt(x^2+y^2+z^2);theta=atan2(y,x);phi=atan2(hypot(x,y),z);#&#32;function;t1=0.1sin(2theta)sin(3phi)+0.3sin(12theta)sin(12phi-0.5sin(3theta));r1=0.2+0.8sin(phi)^0.5+rsin(phi)t1;f(x,y,z)=e^(-0.1z)(x^2+y^2+0.5z^2+0.7z);s1=cos(4(x+y+2z+0.3sin(2x-y)))-0.3;max(f(x,y,z)-r1,0.6r1-f(x,y,z),s1)=0"],
    ["Pumpkin", "#&#32;polar&#32;coordinates;r=hypot(x,y);a=atan2(y,x);#&#32;body&#32;of&#32;the&#32;pumpkin;r1=r/(1+0.05sqrt(r)e^(0.7sin(8a));b=hypot(r1,z)-1+0.4/(5r^2+1)+0.1sin(2z)+0.005r1(sin(12a)+0.5sin(37a));#&#32;tip&#32;of&#32;the&#32;pumpkin;t(x,y,z)=max(r-0.07exp(0.5sin(z)),-z,z+0.1cos(3x)-1);ln(e^(-20b)+e^(-30t(x-0.2sin(z-0.6),y,z)))"],
    ["Amogus", "#&#32;smoothed&#32;union;s_min(x,y,k)=-ln(e^(-kx)+e^(-ky))/k;#&#32;body&#32;parts&#32;(L^p&#32;ellipsoids);s_body=(1.5|y|)^3+|x|^3+(z/1.4)^4-1+0.1z;s_leg=(1.9|y|)^3+(2.5abs(|x|-0.5))^3.5+(z+1)^2-1;s_eyes=(4(y-0.8))^4+(1.5x)^2+(2(z-0.3))^4-1;s_back=(3(y+0.8))^4+(1.3x)^2+(1.2(z+0.1))^4-1;#&#32;put&#32;them&#32;together;s_min(s_min(s_min(s_body,s_leg,2),s_eyes,2),s_back,2)"],
    ["Nut SDF", "s_max(a,b,k)=max(a,b)+max(k-|a-b|,0)/2;b=0.35;r_c=0.5;h0=hypot(x,y)-sec(1/3asin(sin(3atan(y,x)));h1=max(h0,hypot(z,0.02)-b);c1=r_c-hypot(x,y)+0.02arcsin(sin(zround(4pi/b)-atan(y,x)))*max(1-z^2/b^2,0);h2=s_max(h1,c1,0.1);b1=hypot(b,0.1);max(h2,(hypot(x,y,z/b1)-0.99hypot(1,b/b1))/hypot(2,b1))"],
    // ["Spacecraft", "s(x,y,z)=x^2+y^2+z^2-(1+|yz|^2+e^(10(0.5+x-y^2-z^2))sin(1000xyz));t(x,y,z)=s(x+z-0.8((x-z)^2+y^2),1.4y,asin(sin(x-z));t(x-y+1,y+x,2z+1)"],
    ["Ice Cream", "#&#32;cylindrical&#32;coordinates;r=hypot(x,y);a=atan(y,x);#&#32;ice&#32;cream;n1=0.2r*asin(sin(5a+5z));c(x,y,z)=r^2+(z+r)^2-1.1+n1;#&#32;holder;p(z)=min(max(z,0.15z),0.1z+0.15);n2=0.01min(r^4,1)*min(sin(40a),sin(40z));h(x,y,z)=max(|max(r-1-p(z-0.8),-1-z)|-0.05,z-1.5)+n2;#&#32;union;u(x,y,z)=min(c(x,y,z-2),5h(x,y,z+0.8));1/1.5&#32;u(1.5x,1.5y,1.5z+0.3)=0"],
    ["Vine Strand", "#&#32;polar&#32;repetition;r=hypot(x,y);a0=atan(y,x);a=asin(sin(1.5a0))/1.5;w=0.1+0.5ln(ln(e^-z+e));#&#32;cross&#32;section&#32;of&#32;a&#32;single&#32;vine;x1=rcos(a)-w^2;y1=rsin(a);w_t=w*(1+0.1sin(3(atan(y1,x1)));d(x,y,z)=hypot(x1,y1)-(0.5w_t^1.3-0.1);#&#32;twist&#32;the&#32;strands;r_z=5asinh(z-2);1.5d(xcos(r_z)-ysin(r_z),xsin(r_z)+ycos(r_z),z-3)"],
    ["DNA Strands", "#&#32;polar&#32;coordinates;r=hypot(x,y);a=atan(y,x)+0.8z;#&#32;strand;s0=hypot(sin(a),sin(pi-a),r-1)-0.25;s=s0-0.15sin(10x)sin(10y)sin(10z);#&#32;cross&#32;line;c=hypot(sin(3z),rsin(a))-0.2;#&#32;double&#32;helix;s_max(a,b,k)=1/k*ln(e^(ka)+e^(kb));h(x,y,z)=s_max(-s,-s_max(c,r-1,10),10)+0.05;#&#32;repetition;h_r=h(mod(x-sin(0.4y),8)-4,mod(y,6)-3,z+0.1sin(x)sin(y));#&#32;bubbles;b=(1.01+sin(0.9x+1.2y))(sin(2x)sin(2y)sin(2z-sin(2x)sin(y))-e^(-0.05sin(x)cos(y)));#&#32;put&#32;together;g(x,y,z)=max(h_r,b);-0.5g(2x,2y,2z)=0"],
    ["Hexa Snails", "f1(x,y,z)=xcos(6ln(hypot(x,y)))+ysin(6ln(hypot(x,y)))+4(z+0.8hypot(x,y))^2-hypot(x,y)+0.2(x^2+y^2+z^2)^2-0.5;a1=asin(cos(-3atan(y,x))/3);s1=f1(hypot(x,y)cos(a1)-5,hypot(x,y)sin(a1),z);f2(x,y,z)=hypot(x-1,10y,ze^(z+0.1x^2)-4)(1+0.05ln(e^z+1)sin(15x)sin(20y)sin(10z))-4;a2=asin(sin(-3atan(y,x))/3);s2=f2(hypot(x,y)cos(a2),hypot(x,y)sin(a2),z+1.5-e^-hypot(x,y,0.5));s(x,y,z)=min(s1,s2);1/2s(2x,2y,2z-1)"],
    ["Nautilus Shell", "#&#32;catesian&#32;to&#32;cylindrical;s_s(x)=3clamp(x,0,1)^2-2clamp(x,0,1)^3&#32;&#32;#&#32;smoothstep;r=hypot(x,y);a=0.45s_s(0.5(r-0.6))&#32;&#32;#&#32;rotate&#32;this&#32;angle;x1=cos(a)x+sin(a)y;y1=cos(a)y-sin(a)x;t=atan2(y1,x1)&#32;&#32;#&#32;polar&#32;angle;;#&#32;shell&#32;opening,&#32;kill&#32;discontinuities&#32;of&#32;the&#32;spiral;b=0.17&#32;&#32;#&#32;r&#32;=&#32;e^(b&#32;\\theta);r_o=e^(bpi)&#32;&#32;#&#32;center&#32;of&#32;the&#32;\"ring\";d_o=hypot(hypot(x1+r_o,z)-r_o,y1)&#32;&#32;#&#32;distance&#32;to&#32;the&#32;\"ring\";;#&#32;spiral;#&#32;r(n)&#32;=&#32;exp(b*(2.*PI*n+t)),&#32;(x-r)^2+y^2=r^2,&#32;solve&#32;for&#32;n;n=min((log((r^2+z^2)/(2r))/b-t)/(2pi),0)&#32;&#32;#&#32;decimal&#32;n,&#32;clamped&#32;to&#32;opening;r0=exp(b(2pifloor(n)+t))&#32;&#32;#&#32;choose&#32;the&#32;closest&#32;side;r1=exp(b(2piceil(n)+t));d0=abs(hypot(r-r0,z)-r0);d1=abs(hypot(r-r1,z)-r1);d_s=min(d_o,d0,d1);u=2pi*if(d1-d0,floor(n),ceil(n))+t;;#&#32;septa/chambers;f=2.4&#32;&#32;#&#32;\"frequency\"&#32;of&#32;chambers;s0=t+2pi(floor(n)+0.5)&#32;&#32;#&#32;longitude&#32;parameter;v=fract(n)&#32;&#32;#&#32;0-1,&#32;distance&#32;from&#32;inner&#32;circle;s1=fs0+sqrt(0.25-(v-0.5)^2)+0.5v&#32;&#32;#&#32;curve&#32;of&#32;septa;s=s1+(min(1/(40hypot(v-0.5,z)+1),0.5)^2&#32;&#32;#&#32;hole&#32;on&#32;septa;s_f=if(s0+1.8,abs(s+3.25),min(fract(s),1-fract(s)))&#32;&#32;#&#32;outermost&#32;and&#32;inner&#32;septa;w=if(s0-0.06sin(2.5r)+1.78,abs(s+3.25),min(fract(s),1-fract(s)))*(exp(b(s0+pi))/f)&#32;&#32;#&#32;adjust&#32;distance&#32;field;d_sc=if(hypot(x,y,1.5z)-3,d_s,min(d_s,0.5w+0.012))&#32;&#32;#&#32;union&#32;with&#32;discontinuity&#32;clamping;;#&#32;put&#32;them&#32;together;d3=d_sc+0.00012rsin(200u)&#32;&#32;#&#32;geometric&#32;texture;d(x,y,z)=abs(d3)-0.8max(0.02r^0.4,0.02)&#32;&#32;#&#32;thickness&#32;of&#32;shell;max(d(-1.5x-0.8,1.5z+0.2,1.5y)-0.005,|y|-0.1)&#32;&#32;#&#32;rotate&#32;+&#32;cut&#32;open"],
    ["Conch Shell", "a_o=0.16pi&#32;#&#32;half&#32;of&#32;opening&#32;angle;b=0.6&#32;#&#32;r=e^bt;s_min(a,b,k)=-1/k*ln(e^-ka+e^-kb)&#32;#&#32;smoothed&#32;minimum;;#&#32;Cross&#32;section;C_m(u,v)=1-(1-0.01e^sin(12pi(u+2v)))e^-(5v)^2&#32;&#32;#&#32;mid&#32;rod;C_s(u,v)=(sqrt((u-e^-16v)^2+(v(1-0.2exp(-4sqrt(u^2+0.1^2)))-0.5+0.5e^(-v)sin(4u)+0.2cos(2u)e^-v)^2)-0.55)tanh(5sqrt(2u^2+(v-1.2)^2))+0.01sin(40u)sin(40v)exp(-(u^2+v^2));C0(u,v)=abs(C_s(u,v))C_m(u,v)&#32;#&#32;single&#32;layer;n1(u,v)=log(hypot(u,v))/b+2&#32;#&#32;index&#32;of&#32;layer;a1(u,v)=atan(v,u)/a_o&#32;#&#32;opening&#32;angle,&#32;0-1;d1(u,v,s_d)=0.5sqrt(u^2+v^2)*C0(if(n1(u,v),n1(u,v)-s_d,fract(n1(u,v))-s_d),a1(u,v));C(u,v)=min(d1(u,v,0.5),d1(u,v,1.5))&#32;#&#32;cross&#32;section;;#&#32;Spiral;l_p(x,y)=exp(b*atan(y,x)/(2pi))&#32;#&#32;a&#32;multiplying&#32;factor;U(x,y,z)=exp(log(-z)+b*atan(y,x)/(2pi))&#32;#&#32;xyz&#32;to&#32;cross&#32;section&#32;u;V(x,y,z)=sqrt(x^2+y^2)*l_p(x,y)&#32;#&#32;xyz&#32;to&#32;cross&#32;section&#32;v;S_s(x,y,z)=C(U(x,y,z),V(x,y,z))/l_p(x,y)&#32;#&#32;body;S_o(x,y,z)=sqrt((C(exp(log(-z)-b/2),-x*exp(-b/2))*exp(b/2))^2+y^2)&#32;#&#32;opening;S_t(x,y,z)=d1(-z,hypot(x,y),0.5)&#32;#&#32;tip;S_a(x,y,z)=if(-z,min(S_s(x,y,z),S_o(x,y,z)),S_t(x,y,z))&#32;#&#32;body+tip;S0(x,y,z)=S_a(x,y,z)-0.01-0.01(x^2+y^2+z^2)^0.4-0.02sqrt(x^2+y^2)exp(cos(8atan(y,x)))-0.007*(0.5-0.5tanh(10(z+1+8sqrt(3x^2+y^2))))&#32;#&#32;subtract&#32;thickness;S(x,y,z)=-s_min(-S0(x,y,z),z+1.7,10)&#32;#&#32;clip&#32;bottom;r_a=-0.05sin(3z)tanh(2(x^2+y^2-z-1.5))&#32;#&#32;distortion;S(0.4(x-r_a*y),0.4(y+r_a*x),0.4z-0.7)=0"],
];


document.body.onload = function (event) {
    console.log("onload");

    // init built-in functions
    initBuiltInFunctions(builtinFunctions);

    // init parser
    BuiltInMathFunctions.initMathFunctions(
        BuiltInMathFunctions.rawMathFunctionsShared
            .concat(BuiltInMathFunctions.rawMathFunctionsR)
    );
    MathParser.IndependentVariables = {
        'x': "x",
        'y': "y",
        'z': "z"
    };

    CodeGenerator.langs.glsl.config = CodeGenerator.langs.glsl.presets.implicit3_compact;

    // init parameters
    initParameters([
        new GraphingParameter("sStep", "select-step"),
        new GraphingParameter("bLight", "checkbox-light"),
        new GraphingParameter("bYup", "checkbox-yup"),
        new GraphingParameter("sSpp", "select-spp"),
        new GraphingParameter("sClip", "select-clip"),
        // new GraphingParameter("bClipFixed", "checkbox-clip-fixed"),
        new GraphingParameter("cClosed", "checkbox-closed"),
        new GraphingParameter("sField", "select-field"),
        new GraphingParameter("bGrid", "checkbox-grid"),
        new GraphingParameter("sColor", "select-color"),
        // new GraphingParameter("bTransparency", "checkbox-transparency"),
        new GraphingParameter("bDiscontinuity", "checkbox-discontinuity"),
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
        new UniformSlider("rScale1", "slider-scale1", 0.01, 0.99, 0.5),
        new UniformSlider("rScale2", "slider-scale2", 0.01, 0.99, 0.5),
        new UniformSlider("rOpacity", "slider-opacity", 0, 1, 0.0),
        new UniformSlider("rIor", "slider-ior", 0, 3, 1.7),
        new UniformSlider("rRoughness1", "slider-roughness1", 0, 1, 0.2),
        new UniformSlider("rRoughness2", "slider-roughness2", 0, 1, 0.3),
        new UniformSlider("rEmission1", "slider-emission1", 0, 1, 0.0),
        new UniformSlider("rEmission2", "slider-emission2", 0, 1, 0.0),
        new UniformSlider("rAbsorb1", "slider-absorb1", 0, 0.99, 0.5),
        new UniformSlider("rAbsorb2", "slider-absorb2", 0, 0.99, 0.0),
        new UniformSlider("rScatter1", "slider-scatter1", 0, 0.99, 0.0),
        new UniformSlider("rScatter2", "slider-scatter2", 0, 0.99, 0.0),
        new UniformSlider("rVDecayAbs", "slider-vdecay-abs", 0.1, 0.98, 0.5),
        new UniformSlider("rVDecaySca", "slider-vdecay-sca", 0.01, 0.98, 0.5),
        new UniformSlider("rVAbsorbHue", "slider-vabsorb-hue", 0, 1, 0.55),
        new UniformSlider("rVAbsorbChr", "slider-vabsorb-chr", 0, 1, 0.4),
        new UniformSlider("rVAbsorbBri", "slider-vabsorb-bri", 0, 1, 0.97),
        new UniformSlider("rTheta", "slider-theta", -0.5 * Math.PI, 1.5 * Math.PI, 1.0 * Math.PI),
        new UniformSlider("rPhi", "slider-phi", 0, Math.PI, 0.75 * Math.PI),
        new UniformSlider("rLightIntensity", "slider-light-intensity", 0, 1, 0.5),
        new UniformSlider("rLightAmbient", "slider-light-ambient", 0, 1, 0.0),
        new UniformSlider("rLightSoftness", "slider-light-softness", 0.001, 1, 0.8),
        new UniformSlider("rLightHardness", "slider-light-hardness", 0, 1, 0.0),
        new GraphingParameter("sDenoise", "select-denoise"),
    ]);
    UpdateFunctionInputConfig.complexMode = false;
    UpdateFunctionInputConfig.implicitMode = true;
    UpdateFunctionInputConfig.warnNaN = true;

    // denoise
    let selectDenoise = document.getElementById("select-denoise");
    useDenoiser(selectDenoise.value);
    selectDenoise.addEventListener("input",
        () => useDenoiser(selectDenoise.value));

    // init viewport
    resetState({
        rz: -0.95 * Math.PI,
        rx: -0.48 * Math.PI,
        scale: 0.3,
        clipSize: [2.0, 2.0, 2.0]
    }, false);

    // main
    initMain([
        "frag-render.glsl",
        "../shaders/frag-copy.glsl",
        "../shaders/frag-rt-post.glsl",
        "../shaders/dnn-conv2d311.glsl",
        "../shaders/dnn-conv2d110.glsl",
        "../shaders/dnn-convtranspose2d421.glsl",
    ]);
};



// for local testing

function exportAllFunctions(lang, grad = false) {
    let langpack = CodeGenerator.langs[lang];
    let oldConfig = langpack.config;
    langpack.config = langpack.presets[grad ? 'implicit3g_compact' : 'implicit3_compact'];
    var funs = builtinFunctions;
    var names = [], exprs = [];
    for (var i = 0; i < funs.length; i++) {
        var name = 'fun' + funs[i][0].replace(/[^\w]/g, '');
        console.log(name);
        var str = funs[i][1].replaceAll("&#32;", ' ')
        var expr = MathParser.parseInput(str);
        names.push(name);
        exprs.push({ val: expr.val[0] });
    }
    var res = CodeGenerator.postfixToSource(exprs, names, lang);
    console.log(res.source);
    langpack.config = oldConfig;
}

function exportCurrentFunction(lang, grad = false) {
    let langpack = CodeGenerator.langs[lang];
    let oldConfig = langpack.config;
    langpack.config = langpack.presets[grad ? 'implicit3g' : 'implicit3'];
    var str = document.getElementById("equation-input").value;
    var expr = MathParser.parseInput(str).val[0];
    var res = CodeGenerator.postfixToSource(
        [{ val: expr }], ["fun"], lang);
    console.log(res.source);
    langpack.config = oldConfig;
}
