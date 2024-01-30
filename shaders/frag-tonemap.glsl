#version 300 es
precision highp float;

uniform sampler2D iChannel0;
out vec4 fragColor;

// https://www.desmos.com/calculator/kggx9ds91h

vec3 tonemapNone(vec3 x) {
    return pow(x, vec3(1.0/2.2));
}

vec3 tonemapAces(vec3 x) {
    x = x*(2.51*x+0.03)/(x*(2.43*x+0.59)+0.14);
    return pow(clamp(x,0.0,1.0), vec3(1.0/2.2));
}

vec3 tonemapFilmic(vec3 x) {
    return x*(6.2*x+0.5)/(x*(6.2*x+1.7)+0.06);
}

vec3 tonemapReinhard(vec3 x) {
    return pow(x/(1.0+x), vec3(1.0/2.2));
}

vec3 tonemapUncharted2(vec3 x) {
    x = 2.0*x;
    x = (x*(0.15*x+0.05)+0.004)/(x*(0.15*x+0.5)+0.06)-1.0/15.0;
    return pow(clamp(1.379*x,0.0,1.0), vec3(1.0/2.2));
}

void main(void) {
    vec3 x = texelFetch(iChannel0, ivec2(gl_FragCoord.xy), 0).xyz;

    x = tonemap{%TONEMAP%}(x);

    if (isnan(x.x+x.y+x.z))
        x = vec3(1,0,0);

    fragColor = vec4(x,1);
}
