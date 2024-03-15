#version 300 es
precision mediump float;
precision mediump int;

uniform sampler2D accumBuffer;

// 3x3 convolution, stride {%STRIDE%}, zero padding {%PADDING%}


#if {%USE_WEIGHT_TEXTURE%}


uniform ivec2 uWeightRow;
uniform sampler2D uWeight;
uniform sampler2D uSrc0;
uniform sampler2D uSrc1;
uniform sampler2D uSrc2;
uniform sampler2D uSrc3;
uniform sampler2D uSrc4;
uniform sampler2D uSrc5;
uniform sampler2D uSrc6;
uniform sampler2D uSrc7;
out vec4 fragColor;

void main() {

    ivec2 iRes = textureSize(uSrc0, 0);
    ivec2 xy0 = ivec2(gl_FragCoord.xy);

    vec4 r = texelFetch(accumBuffer, xy0, 0);
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            ivec2 xy = {%STRIDE%}*xy0-{%PADDING%}+ivec2(i,j);
            if (xy.x<0 || xy.x>=iRes.x || xy.y<0 || xy.y>=iRes.y) continue;

            mat4 R;
            int k = uWeightRow.x;

        #define one_channel(uSrc) \
            for (int _ = 0; _ < 4; _++) \
                R[_] = texelFetch(uWeight, ivec2((3*j+i)*4+_,k), 0); \
            r += R * texelFetch(uSrc, xy, 0); \
            if (++k >= uWeightRow.y) continue;
            
            one_channel(uSrc0)
            one_channel(uSrc1)
            one_channel(uSrc2)
            one_channel(uSrc3)
            one_channel(uSrc4)
            one_channel(uSrc5)
            one_channel(uSrc6)
            one_channel(uSrc7)
        }
    }

    fragColor = r;
}


#else  // {%USE_WEIGHT_TEXTURE%}


uniform mat4 w[9*{%MAX_CHANNEL%}];
uniform sampler2D uSrc0;
uniform sampler2D uSrc1;
uniform sampler2D uSrc2;
uniform sampler2D uSrc3;
// uniform sampler2D uSrc4;
// uniform sampler2D uSrc5;
// uniform sampler2D uSrc6;
// uniform sampler2D uSrc7;
uniform int nChannel;
out vec4 fragColor;

void main() {

    ivec2 iRes = textureSize(uSrc0, 0);
    ivec2 xy0 = ivec2(gl_FragCoord.xy);

    vec4 r = texelFetch(accumBuffer, xy0, 0);
    // r *= 0.0;
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            ivec2 xy = {%STRIDE%}*xy0-{%PADDING%}+ivec2(i,j);
            if (xy.x<0 || xy.x>=iRes.x || xy.y<0 || xy.y>=iRes.y) continue;
            
            mat4 R;
            int k = 0;

        #define one_channel(uSrc) { \
            R = w[9*k+j*3+i]; \
            r += R * texelFetch(uSrc, xy, 0); \
            if (++k >= nChannel) continue; }

            one_channel(uSrc0)
            if ({%MAX_CHANNEL%} > 1) one_channel(uSrc1)
            if ({%MAX_CHANNEL%} > 2) one_channel(uSrc2)
            if ({%MAX_CHANNEL%} > 3) one_channel(uSrc3)
            // if ({%MAX_CHANNEL%} > 4) one_channel(uSrc4)
            // if ({%MAX_CHANNEL%} > 5) one_channel(uSrc5)
            // if ({%MAX_CHANNEL%} > 6) one_channel(uSrc6)
            // if ({%MAX_CHANNEL%} > 7) one_channel(uSrc7)
        }
    }

    fragColor = r;
}


#endif  // {%USE_WEIGHT_TEXTURE%}
