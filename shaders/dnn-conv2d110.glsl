#version 300 es
precision mediump float;
precision mediump int;

// 1x1 convolution, stride 1, padding 0


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

    ivec2 xy = ivec2(gl_FragCoord.xy);

    fragColor = vec4(0);

    mat4 R;
    int k = uWeightRow.x;

  #define one_channel(uSrc) \
    for (int _ = 0; _ < 4; _++) \
        R[_] = texelFetch(uWeight, ivec2(_,k), 0); \
    fragColor += R * texelFetch(uSrc, xy, 0); \
    if (++k >= uWeightRow.y) return;

    one_channel(uSrc0)
    one_channel(uSrc1)
    one_channel(uSrc2)
    one_channel(uSrc3)
    one_channel(uSrc4)
    one_channel(uSrc5)
    one_channel(uSrc6)
    one_channel(uSrc7)

}


#else  // {%USE_WEIGHT_TEXTURE%}


uniform mat4 w[{%MAX_CHANNEL%}];
uniform sampler2D uSrc0;
uniform sampler2D uSrc1;
uniform sampler2D uSrc2;
uniform sampler2D uSrc3;
uniform sampler2D uSrc4;
uniform sampler2D uSrc5;
uniform sampler2D uSrc6;
uniform sampler2D uSrc7;
uniform int nChannel;
out vec4 fragColor;

void main() {

    ivec2 xy = ivec2(gl_FragCoord.xy);

    fragColor = vec4(0);

    mat4 R;
    int k = 0;

  #define one_channel(uSrc) { \
    R = w[k]; \
    fragColor += R * texelFetch(uSrc, xy, 0); \
    if (++k >= nChannel) return; }

    one_channel(uSrc0)
    if ({%MAX_CHANNEL%} > 1) one_channel(uSrc1)
    if ({%MAX_CHANNEL%} > 2) one_channel(uSrc2)
    if ({%MAX_CHANNEL%} > 3) one_channel(uSrc3)
    if ({%MAX_CHANNEL%} > 4) one_channel(uSrc4)
    if ({%MAX_CHANNEL%} > 5) one_channel(uSrc5)
    if ({%MAX_CHANNEL%} > 6) one_channel(uSrc6)
    if ({%MAX_CHANNEL%} > 7) one_channel(uSrc7)
}


#endif  // {%USE_WEIGHT_TEXTURE%}
