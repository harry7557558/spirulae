#version 300 es
precision highp float;

uniform sampler2D iChannel0;
out vec4 fragColor;

void main(void) {

    vec4 x = vec4(0);
    for (float s = 0.; s < 3.; s++) {
        mat2 m = mat2(1);
        for (float r = 0.; r < 4.; r++) {
            for (float l = 0.; l < 2.*s; l++) {
                vec2 p = gl_FragCoord.xy + m * vec2(s, s-l);
                x = texelFetch(iChannel0, ivec2(p)-1, 0);
                if (x.w > 0.0) break;
            }
            if (x.w > 0.0) break;
            m = mat2(1,1,-1,1) * m;
        }
        if (x.w > 0.0) break;
    }
    x /= x.w;

    if (isnan(x.x+x.y+x.z))
        x = vec4(0);

    fragColor = x;
}
