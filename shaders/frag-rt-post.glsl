#version 300 es
precision highp float;

uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
out vec4 fragColor;

void main(void) {
    vec4 pixel0 = texelFetch(iChannel0, ivec2(gl_FragCoord.xy), 0);
    vec4 pixel1 = texelFetch(iChannel1, ivec2(gl_FragCoord.xy), 0);
    vec4 pixel = pixel0 + pixel1;
    vec3 col = pow(pixel.xyz/pixel.w, vec3(1.0/2.2));
    // vec3 col = pow(pixel.xyz, vec3(1.0/2.2));
    fragColor = vec4(col, 1);
}
