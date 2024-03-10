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

    vec4 x = vec4(0);
    for (float s = 0.; s < 16.; s++) {
        mat2 m = mat2(1);
        for (float r = 0.; r < 4.; r++) {
            for (float l = 0.; l < 2.*s; l++) {
                vec2 p = gl_FragCoord.xy + m * vec2(s, s-l);
                x = texelFetch(iChannel0, ivec2(p), 0);
                if (x.w > 0.0) break;
            }
            if (x.w > 0.0) break;
            m = mat2(1,1,-1,1) * m;
        }
        if (x.w > 0.0) break;
    }
    x /= x.w;

    x.xyz = tonemap{%TONEMAP%}(x.xyz);

    if (isnan(x.x+x.y+x.z))
        x.xyz = vec3(1,0,0);

    fragColor = vec4(x.xyz,1);
}
