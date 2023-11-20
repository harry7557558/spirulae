// for inferencing neural nets, especially cnn

// include `render-gl.js`


"use strict";


let Dnn = {

};


Dnn.decodeDnnParameters = function(params, info) {
    if (info.dtype != 'int16')
        throw new Error("Unsupported DNN parameter type");
    var res = {};
    for (var key in info.state_dict) {
        var param = info.state_dict[key];
        var l = 1;
        for (var i = 0; i < param.shape.length; i++)
            l *= param.shape[i];
        var w = new Float32Array(l);
        for (var i = 0; i < l; i++)
            w[i] = param.m * params[param.offset+i] + param.b;
        res[key] = w;
    }
    return res;
}


Dnn.CNNLayer = function(gl, n, w, h) {
    this.n = n;
    this.w = w, this.h = h;
    this.imgs = [];
    for (var i = 0; i < n; i += 4)
        this.imgs.push(createRenderTarget(gl, w, h, false, true, false));
    this.setData = function(gl, data) {
        var layers = [];
        for (var i = 0; i < this.n; i++)
            layers[i] = data.slice(i*w*h, (i+1)*w*h);
        for (var i = 0; i < this.n; i += 4) {
            var data = new Float32Array(4*w*h);
            for (var j = 0; j < 4 && i+j < this.n; j++)
                for (var k = 0; k < w*h; k++)
                    data[4*k+j] = layers[i+j][k];
            gl.bindTexture(gl.TEXTURE_2D, this.imgs[Math.floor(i/4)].texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
                w, h, 0,
                gl.RGBA, gl.FLOAT,
                data);
        }
    };
}

Dnn.destroyCnnLayer = function(gl, layer) {
    for (var i = 0; i < layer.imgs.length; i++)
        destroyRenderTarget(gl, layer.imgs[i]);
    layer.n = 0;
    layer.imgs = [];
}


Dnn.Conv2d311 = function(
    n_in, n_out, weights, biases = []
) {
    if (weights.length != n_in*n_out*9)
        throw new Error("Incorrect weight size");
    if (biases.length != n_out)
        throw new Error("Incorrect bias size");
    this.n_in = n_in;
    this.n_out = n_out;
    this.weights = weights;
    this.biases = Array.from(biases);
    while (this.biases.length % 4 != 0.0)
        this.biases.push(0.0);

    this.mats = [];
    for (var i = 0; i < this.n_out; i += 4) {
        var mats = [];
        for (var j = 0; j < this.n_in; j += 4) {
            var matsj = [];
            for (var wi = 0; wi < 3; wi++) {
                for (var wj = 0; wj < 3; wj++) {
                    var mat = new Float32Array(16);
                    for (var a = 0; a < 4; a++) {
                        for (var b = 0; b < 4; b++) {
                            var mi = (i+b)*n_in+(j+a);
                            mat[4*a+b] = this.weights[9*mi+(wi*3+wj)];
                        }
                    }
                    matsj.push(mat);
                }
            }
            mats.push(matsj);
        }
        this.mats.push(mats);
    }

    this.forward = function(gl, buffer_in, buffer_out) {
        if (buffer_in.n != this.n_in)
            throw new Error("Incorrect input buffer length ("+buffer_in.n+","+this.n_in+")");
        if (buffer_out.n != this.n_out)
            throw new Error("Incorrect output buffer length ("+buffer_out.n+","+this.n_out+")");
        if (buffer_out.w != buffer_in.w || buffer_out.h != buffer_in.h)
            throw new Error("Input and output buffer dimensions don't match.");
        if (!Dnn.programConv2d311) {
            Dnn.programConv2d311 = createShaderProgram(gl, null,
                getShaderSource('../dnn/conv2d311.glsl'))
        }
        let program = Dnn.programConv2d311;
        gl.useProgram(program);
        gl.viewport(0, 0, buffer_in.w, buffer_in.h);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        for (var i = 0; i < this.n_out; i += 4) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, buffer_out.imgs[Math.floor(i/4)].framebuffer);
            gl.clearColor(this.biases[i], this.biases[i+1], this.biases[i+2], this.biases[i+3]);
            gl.clear(gl.COLOR_BUFFER_BIT);
            for (var j = 0; j < this.n_in; j += 4) {
                for (var li = 0; li < 9; li++) {
                    let uniformLocation = gl.getUniformLocation(program, 'w['+li+']');
                    var mat = this.mats[i/4][j/4][li];
                    gl.uniformMatrix4fv(uniformLocation, false, mat);
                }
                setPositionBuffer(gl, program);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, buffer_in.imgs[Math.floor(j/4)].texture);
                gl.uniform1i(gl.getUniformLocation(program, "uSrc"), 0);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
        }
        var _ = 9*mi+((2-wi)*3+(2-wj));
    }
}


Dnn.relu = function(gl, buffer_in, buffer_out) {
    if (buffer_in.n != buffer_out.n)
        throw new Error("Input and output buffer sizes don't match.");
    if (buffer_out.w != buffer_in.w || buffer_out.h != buffer_in.h)
        throw new Error("Input and output buffer dimensions don't match.");
    if (!Dnn.programReLU) {
        Dnn.programReLU = createShaderProgram(gl, null,
            `#version 300 es
            precision highp float;
            
            uniform sampler2D uSrc;
            out vec4 fragColor;
            
            void main() {
                vec4 c = texelFetch(uSrc, ivec2(gl_FragCoord.xy), 0);
                fragColor = max(c, 0.0);
            }`);
    }
    let program = Dnn.programReLU;
    gl.useProgram(program);
    gl.viewport(0, 0, buffer_in.w, buffer_in.h);
    gl.disable(gl.BLEND);
    for (var i = 0; i < buffer_in.n; i += 4) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffer_out.imgs[Math.floor(i/4)].framebuffer);
        setPositionBuffer(gl, program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, buffer_in.imgs[Math.floor(i/4)].texture);
        gl.uniform1i(gl.getUniformLocation(program, "uSrc"), 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}


Dnn.add = function(gl, buffer_in1, buffer_in2, buffer_out) {
    if (buffer_in1.n != buffer_out.n || buffer_in2.n != buffer_out.n)
        throw new Error("Input and output buffer sizes don't match.");
    if (buffer_in1.w != buffer_out.w || buffer_in1.h != buffer_out.h ||
        buffer_in2.w != buffer_out.w || buffer_in2.h != buffer_out.h)
        throw new Error("Input and output buffer dimensions don't match.");
    if (!Dnn.programAdd) {
        Dnn.programAdd = createShaderProgram(gl, null,
            `#version 300 es
            precision highp float;
            
            uniform sampler2D uSrc1;
            uniform sampler2D uSrc2;
            out vec4 fragColor;
            
            void main() {
                vec4 c1 = texelFetch(uSrc1, ivec2(gl_FragCoord.xy), 0);
                vec4 c2 = texelFetch(uSrc2, ivec2(gl_FragCoord.xy), 0);
                fragColor = c1 + c2;
            }`);
    }
    let program = Dnn.programAdd;
    gl.useProgram(program);
    gl.viewport(0, 0, buffer_out.w, buffer_out.h);
    gl.disable(gl.BLEND);
    for (var i = 0; i < buffer_out.n; i += 4) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffer_out.imgs[Math.floor(i/4)].framebuffer);
        setPositionBuffer(gl, program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, buffer_in1.imgs[Math.floor(i/4)].texture);
        gl.uniform1i(gl.getUniformLocation(program, "uSrc1"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, buffer_in2.imgs[Math.floor(i/4)].texture);
        gl.uniform1i(gl.getUniformLocation(program, "uSrc2"), 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

