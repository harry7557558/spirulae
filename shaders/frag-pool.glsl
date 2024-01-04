#version 300 es
precision highp float;

uniform sampler2D iChannel0;
out vec4 fragColor;

uniform ivec2 iResolution;

#define R 1

void main(void) {
    ivec2 p0 = ivec2(gl_FragCoord.xy);
    vec2 mt01 = vec2(1.0, 0.0);
    for (int x = -R; x <= R; x++)
    for (int y = -R; y <= R; y++) if (x*x+y*y<=R*R) {
        ivec2 p = clamp(p0 + ivec2(x, y), ivec2(0), iResolution - 1);
        vec2 t01 = texelFetch(iChannel0, p, 0).xy;
        if (t01.x >= 254./255.) continue;
        mt01.x = min(mt01.x, t01.x);
        mt01.y = max(mt01.y, t01.y);
    }
    fragColor = vec4(mt01, 0, 1);
}
