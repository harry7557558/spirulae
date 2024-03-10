#version 300 es
precision highp float;

uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
out vec4 fragColor;

uniform bool denoise;
uniform float iSpp;

void main(void) {
    vec4 pixel0 = texelFetch(iChannel0, ivec2(gl_FragCoord.xy), 0);
    vec4 pixel1 = texelFetch(iChannel1, ivec2(gl_FragCoord.xy), 0);
    vec4 pixel = pixel0 + pixel1;
    vec3 col = max(pixel.xyz/pixel.w, 0.0);
    fragColor = denoise ?
        vec4(log(pow(col/min(iSpp,1.0), vec3(1.0/2.2))+1.0), 0.0) :
        vec4(col, 1.0) * pixel.w;
}
