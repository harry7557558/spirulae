#version 300 es
precision highp float;

uniform sampler2D iChannel0;
out vec4 fragColor;

uniform float sc;

void main(void) {
    if (sc == 0.0) {
        fragColor = vec4(0.0);
        return;
    }
    vec4 c = texelFetch(iChannel0, ivec2(gl_FragCoord.xy), 0);
    fragColor = sc * c;
}
