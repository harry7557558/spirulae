#version 300 es
precision highp float;

// 3x3 convolution, stride 1, zero padding 1

uniform mat4 w[9];
uniform sampler2D uSrc;
out vec4 fragColor;

void main() {

    ivec2 iRes = textureSize(uSrc, 0);
    ivec2 xy0 = ivec2(gl_FragCoord.xy);

    vec4 r = vec4(0);
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            ivec2 xy = xy0-1+ivec2(i,j);
            if (xy.x<0 || xy.x>=iRes.x || xy.y<0 || xy.y>=iRes.y) continue;
            mat4 R = w[j*3+i];
            r += R * texelFetch(uSrc, xy, 0);
        }
    }

    fragColor = r;
}
