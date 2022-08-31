#version 300 es
precision highp float;

uniform sampler2D iChannel0;
out vec4 fragColor;

#define s(p) texelFetch(iChannel0, p, 0).xyz

void main(void) {
    ivec2 p0 = ivec2(gl_FragCoord.xy);
    vec3 sx1 = s(p0+ivec2(1, 0)), sx0 = s(p0-ivec2(1, 0));
    vec3 sy1 = s(p0+ivec2(0, 1)), sy0 = s(p0-ivec2(0, 1));
    vec3 su1 = s(p0+ivec2(1, 1)), su0 = s(p0-ivec2(1, 1));
    vec3 sv1 = s(p0+ivec2(1,-1)), sv0 = s(p0-ivec2(1,-1));
    vec3 dx=sx1-sx0, dy=sy1-sy0, du=su1-su0, dv=sv1-sv0;
    vec3 g = 0.25*(dx*dx+dy*dy+du*du+dv*dv);
    vec3 m = 0.125*(sx1+sx0+sy1+sy0+su1+su0+sv1+sv0);
    fragColor = vec4(dot(g,vec3(1./3.)), m);
}
