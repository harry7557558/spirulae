#version 300 es
precision highp float;

uniform sampler2D iChannel0;
out vec4 fragColor;

void main(void) {
    vec4 pixel = texelFetch(iChannel0, ivec2(gl_FragCoord.xy), 0);
    vec3 col = pow(pixel.xyz/pixel.w, vec3(1.0/2.2));
    fragColor = vec4(col, 1);
}
