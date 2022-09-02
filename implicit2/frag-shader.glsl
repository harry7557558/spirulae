#version 300 es
precision highp float;

in vec2 vXy;
out vec4 fragColor;

uniform vec2 iResolution;
uniform vec2 xyMin;
uniform vec2 xyMax;


#include "../shaders/functions.glsl"

// function
float fun(vec2 p) {
    float x = p.x, y = p.y;
    {%FUN%}
}

// numerical gradient
vec2 funGradN(vec2 p) {
    float h = 0.002*length(p);
    return vec2(
        fun(p+vec2(h,0)) - fun(p-vec2(h,0)),
        fun(p+vec2(0,h)) - fun(p-vec2(0,h))
    ) / (2.0*h);
}

// analytical gradient
vec4 funGrad(vec2 p) {
    float x = p.x, y = p.y;
    {%FUNGRAD%}
}


void main(void) {
    vec2 xy = mix(xyMin, xyMax, 0.5+0.5*vXy);

    vec4 gv = funGrad(xy);
    vec2 g = gv.xy;
    float v = gv.w;

    g = (xyMax-xyMin)/iResolution * g;
    float d = v / length(g);

    vec3 col = d < 0. ? vec3(0.6,0.7,1) : vec3(1,0.7,0.6);
    col = mix(vec3(0), col, clamp(abs(d)-1., 0.3, 1.));

    fragColor = vec4(clamp(col,0.,1.), 1.0);
}
