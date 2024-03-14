// for inferencing neural nets, especially cnn

// include `render-gl.js`


"use strict";


let Dnn = {

};


Dnn.decodeDnnParameters = function(params, info) {
    if (info.dtype == 'int16') params = new Int16Array(params);
    else if (info.dtype == 'int8') params = new Int8Array(params);
    else throw new Error("Unsupported DNN parameter type");
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
        // this.imgs.push(createRenderTarget(gl, w, h, false, true, false));
        this.imgs.push(createRenderTarget(gl, w, h, false, 'half', true));
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


Dnn.global_mean = function(gl, buffer) {
    const tile = 64;
    if (!Dnn.programGlobalMean) {
        Dnn.programGlobalMean = createShaderProgram(gl, null,
            `#version 300 es
            precision mediump float;

            uniform sampler2D uSrc;
            out vec4 fragColor;
            
            void main() {
                ivec2 ires = textureSize(uSrc, 0);
                ivec2 tile = (ires+${tile}-1) / ${tile};
                vec2 sc = vec2(ires) / float(${tile});
                ivec2 xy = ivec2(gl_FragCoord.xy);
                ivec2 pos0 = xy * tile;
                ivec2 pos1 = min(pos0+tile, ires);
                vec4 total = vec4(0);
                for (int x = pos0.x; x < pos1.x; x++) {
                    vec4 s = vec4(0);
                    for (int y = pos0.y; y < pos1.y; y++)
                        s += texelFetch(uSrc, ivec2(x,y), 0);
                    total += s / sc.y;
                }
                fragColor = total / sc.x;
            }`);
    }
    if (!Dnn.bufferGlobalMean) {
        Dnn.bufferGlobalMean = createRenderTarget(gl, tile, tile, false, true, false);
    }
    let program = Dnn.programGlobalMean;
    gl.useProgram(program);
    gl.viewport(0, 0, buffer.w, buffer.h);
    gl.disable(gl.BLEND);
    var mean = new Array(buffer.n).fill(0.0);
    for (var i = 0; i < buffer.n; i += 4) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, Dnn.bufferGlobalMean.framebuffer);
        setPositionBuffer(gl, program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, buffer.imgs[i/4].texture);
        gl.uniform1i(gl.getUniformLocation(program, "uSrc"), 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        var pixels = new Float32Array(4*tile*tile);
        gl.readPixels(0, 0, tile, tile, gl.RGBA, gl.FLOAT, pixels);
        var total = [0.0, 0.0, 0.0, 0.0];
        for (var _ = 0; _ < 4*tile*tile; _++)
            total[_%4] += pixels[_];
        for (var _ = i; _ < i+4 && _ < buffer.n; _++)
            mean[_] = total[_-i] / (tile*tile);
    }
    return mean;
}


Dnn.global_std = function(gl, buffer) {
    const tile = 64;
    if (!Dnn.programGlobalSquaredMean) {
        Dnn.programGlobalSquaredMean = createShaderProgram(gl, null,
            `#version 300 es
            precision mediump float;

            uniform sampler2D uSrc;
            out vec4 fragColor;
            
            void main() {
                ivec2 ires = textureSize(uSrc, 0);
                ivec2 tile = (ires+${tile}-1) / ${tile};
                vec2 sc = vec2(ires) / float(${tile});
                ivec2 xy = ivec2(gl_FragCoord.xy);
                ivec2 pos0 = xy * tile;
                ivec2 pos1 = min(pos0+tile, ires);
                vec4 total = vec4(0);
                for (int x = pos0.x; x < pos1.x; x++) {
                    vec4 s = vec4(0);
                    for (int y = pos0.y; y < pos1.y; y++) {
                        vec4 c = texelFetch(uSrc, ivec2(x,y), 0);
                        s += c*c;
                    }
                    total += s / sc.y;
                }
                fragColor = total / sc.x;
            }`);
    }
    if (!Dnn.bufferGlobalSquaredMean) {
        Dnn.bufferGlobalSquaredMean = createRenderTarget(gl, tile, tile, false, true, false);
    }
    let program = Dnn.programGlobalSquaredMean;
    gl.useProgram(program);
    gl.viewport(0, 0, buffer.w, buffer.h);
    gl.disable(gl.BLEND);
    var mean2 = new Array(buffer.n).fill(0.0);
    for (var i = 0; i < buffer.n; i += 4) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, Dnn.bufferGlobalSquaredMean.framebuffer);
        setPositionBuffer(gl, program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, buffer.imgs[i/4].texture);
        gl.uniform1i(gl.getUniformLocation(program, "uSrc"), 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        var pixels = new Float32Array(4*tile*tile);
        gl.readPixels(0, 0, tile, tile, gl.RGBA, gl.FLOAT, pixels);
        var total = [0.0, 0.0, 0.0, 0.0];
        for (var _ = 0; _ < 4*tile*tile; _++)
            total[_%4] += pixels[_];
        for (var _ = i; _ < i+4 && _ < buffer.n; _++)
            mean2[_] = total[_-i] / (tile*tile);
    }
    let mean = Dnn.global_mean(gl, buffer);
    var std = new Array(buffer.n).fill(0.0);
    for (var i = 0; i < buffer.n; i++)
        std[i] = Math.sqrt(Math.max(mean2[i] - mean[i]*mean[i], 0.0));
    return std;
}


Dnn.batch_norm_2d = function(
    gl, buffer_in, buffer_out,
    beta, gamma, mean=null, std=null, eps=1e-5
) {
    if (buffer_in.n != buffer_out.n)
        throw new Error("Input and output buffer sizes don't match.");
    if (buffer_out.w != buffer_in.w || buffer_out.h != buffer_in.h)
        throw new Error("Input and output buffer dimensions don't match.");
    if (!Dnn.programBatchNorm2d) {
        Dnn.programBatchNorm2d = createShaderProgram(gl, null,
            `#version 300 es
            precision mediump float;

            uniform sampler2D uSrc;
            out vec4 fragColor;

            uniform vec4 slope;
            uniform vec4 intercept;

            void main() {
                vec4 c = texelFetch(uSrc, ivec2(gl_FragCoord.xy), 0);
                fragColor = slope * c + intercept;
            }`);
    }
    if (mean === null)
        mean = Dnn.global_mean(mean);
    if (std === null)
        std = Dnn.global_std(std);
    let n = buffer_in.n;
    if (typeof beta === 'number')
        beta = new Array(n).fill(beta);
    if (typeof gamma === 'number')
        gamma = new Array(n).fill(gamma);
    var slope = new Array(n);
    var intercept = new Array(n);
    for (var i = 0; i < n; i++) {
        var m = 1.0 / Math.sqrt(std[i]*std[i]+eps);
        slope[i] = m * gamma[i];
        intercept[i] = beta[i] - m * mean[i];
    }
    while (n % 4) {
        slope.push(0.0);
        intercept.push(0.0);
        n++;
    }
    let program = Dnn.programBatchNorm2d;
    gl.useProgram(program);
    gl.viewport(0, 0, buffer_in.w, buffer_in.h);
    gl.disable(gl.BLEND);
    for (var i = 0; i < n; i += 4) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffer_out.imgs[i/4].framebuffer);
        setPositionBuffer(gl, program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, buffer_in.imgs[i/4].texture);
        gl.uniform1i(gl.getUniformLocation(program, "uSrc"), 0);
        gl.uniform4f(gl.getUniformLocation(program, "slope"),
            slope[i], slope[i+1], slope[i+2], slope[i+3]);
        gl.uniform4f(gl.getUniformLocation(program, "intercept"),
            intercept[i], intercept[i+1], intercept[i+2], intercept[i+3]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
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
    this.m_in = Math.ceil(this.n_in/4);
    this.m_out = Math.ceil(this.n_out/4);
    this.weightTextureData = new Float32Array(144*this.m_in*this.m_out);
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
                            mat[4*a+b] = (i+b >= n_out || j+a >= n_in) ?
                                0.0 : this.weights[9*mi+(wi*3+wj)];
                        }
                    }
                    this.weightTextureData.set(mat,
                        ((i/4)*this.m_in+(j/4))*144 + (wi*3+wj)*16);
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

        let maxChannel = Math.min(4, Math.floor(
            gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) / 36 - 1));
        if (!Dnn.programConv2d311 || !Dnn.programConv2d311wt) {
            let src = getShaderSource('../shaders/dnn-conv2d311.glsl');
            src = src.replaceAll("{%MAX_CHANNEL%}", maxChannel);
            Dnn.programConv2d311 = createShaderProgram(gl, null,
                src.replaceAll("{%USE_WEIGHT_TEXTURE%}", 0) );
            Dnn.programConv2d311wt = createShaderProgram(gl, null,
                src.replaceAll("{%USE_WEIGHT_TEXTURE%}", 1) );
        }
        if (!this.weightTexture) {
            this.weightTexture = createSampleTexture(gl, 36, this.m_in*this.m_out, true);
            gl.bindTexture(gl.TEXTURE_2D, this.weightTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
                36, this.m_in*this.m_out, 0,
                gl.RGBA, gl.FLOAT,
                this.weightTextureData);
        }

        let useWeightTexture = (buffer_in.w*buffer_in.h < 1e+4);
        let program = useWeightTexture ?
            Dnn.programConv2d311wt : Dnn.programConv2d311;
        gl.useProgram(program);
        gl.viewport(0, 0, buffer_in.w, buffer_in.h);
        gl.disable(gl.BLEND);
        for (var i = 0; i < this.n_out; i += 4) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, buffer_out.imgs[i/4].framebuffer);
            gl.clearColor(this.biases[i], this.biases[i+1], this.biases[i+2], this.biases[i+3]);
            gl.clear(gl.COLOR_BUFFER_BIT);
            // weight texture
            if (useWeightTexture) for (var j = 0; j < this.n_in; j += 32) {
                // setup accumulation buffer
                gl.bindTexture(gl.TEXTURE_2D, buffer_out.imgs[i/4].sampler);
                gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 0, 0, buffer_out.w, buffer_out.h, 0);
                gl.activeTexture(gl.TEXTURE10);
                gl.bindTexture(gl.TEXTURE_2D, buffer_out.imgs[i/4].sampler);
                gl.uniform1i(gl.getUniformLocation(program, "accumBuffer"), 10);
                // draw
                gl.activeTexture(gl.TEXTURE9);
                gl.bindTexture(gl.TEXTURE_2D, this.weightTexture);
                gl.uniform1i(gl.getUniformLocation(program, "uWeight"), 9);
                gl.uniform2i(gl.getUniformLocation(program, "uWeightRow"),
                    i/4*this.m_in+j/4, i/4*this.m_in+Math.min(j/4+8, this.m_in));
                for (var dj = 0; dj < 32; dj += 4) {
                    if (j+dj >= this.n_in) {
                        gl.uniform1i(gl.getUniformLocation(program, "uSrc"+(dj/4)), 15);
                        continue;
                    }
                    gl.activeTexture(gl['TEXTURE'+(dj/4)]);
                    gl.bindTexture(gl.TEXTURE_2D, buffer_in.imgs[(j+dj)/4].texture);
                    gl.uniform1i(gl.getUniformLocation(program, "uSrc"+(dj/4)), dj/4);
                }
                setPositionBuffer(gl, program);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
            // uniform
            else for (var j = 0; j < this.n_in; j += 4*maxChannel) {
                // setup accumulation buffer
                gl.bindTexture(gl.TEXTURE_2D, buffer_out.imgs[i/4].sampler);
                gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 0, 0, buffer_out.w, buffer_out.h, 0);
                gl.activeTexture(gl.TEXTURE10);
                gl.bindTexture(gl.TEXTURE_2D, buffer_out.imgs[i/4].sampler);
                gl.uniform1i(gl.getUniformLocation(program, "accumBuffer"), 10);
                // draw
                gl.uniform1i(gl.getUniformLocation(program, "nChannel"),
                    Math.min(maxChannel, this.m_in-(j/4)));
                for (var dj = 0; dj < 4*maxChannel; dj += 4) {
                    if (j+dj >= this.n_in) {
                        gl.uniform1i(gl.getUniformLocation(program, "uSrc"+(dj/4)), 15);
                        continue;
                    }
                    for (var li = 0; li < 9; li++) {
                        let uniformLocation = gl.getUniformLocation(program, 'w['+(9*(dj/4)+li)+']');
                        var mat = this.mats[i/4][(j+dj)/4][li];
                        // mat = this.weightTextureData.slice((i/4*this.m_in+j/4)*144+li*16, (i/4*this.m_in+j/4)*144+(li+1)*16);
                        gl.uniformMatrix4fv(uniformLocation, false, mat);
                    }
                    gl.activeTexture(gl['TEXTURE'+(dj/4)]);
                    gl.bindTexture(gl.TEXTURE_2D, buffer_in.imgs[(j+dj)/4].texture);
                    gl.uniform1i(gl.getUniformLocation(program, "uSrc"+(dj/4)), dj/4);
                }
                setPositionBuffer(gl, program);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
        }
    }
}


Dnn.Conv2d110 = function(
    n_in, n_out, weights, biases = []
) {
    if (weights.length != n_in*n_out)
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
    this.m_in = Math.ceil(this.n_in/4);
    this.m_out = Math.ceil(this.n_out/4);
    this.weightTextureData = new Float32Array(16*this.m_in*this.m_out);
    for (var i = 0; i < this.n_out; i += 4) {
        var mats = [];
        for (var j = 0; j < this.n_in; j += 4) {
            var mat = new Float32Array(16);
            for (var a = 0; a < 4; a++) {
                for (var b = 0; b < 4; b++) {
                    var mi = (i+b)*n_in+(j+a);
                    mat[4*a+b] = (i+b >= n_out || j+a >= n_in) ?
                        0.0 : this.weights[mi];
                }
            }
            this.weightTextureData.set(mat, ((i/4)*this.m_in+(j/4))*16);
            mats.push(mat);
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

        let maxChannel = Math.min(8, Math.floor(
            gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) / 4 - 1));
        maxChannel = 4;
        if (!Dnn.programConv2d110 || !Dnn.programConv2d110wt) {
            let src = getShaderSource('../shaders/dnn-conv2d110.glsl');
            src = src.replaceAll("{%MAX_CHANNEL%}", maxChannel);
            Dnn.programConv2d110 = createShaderProgram(gl, null,
                src.replaceAll("{%USE_WEIGHT_TEXTURE%}", 0) );
            Dnn.programConv2d110wt = createShaderProgram(gl, null,
                src.replaceAll("{%USE_WEIGHT_TEXTURE%}", 1) );
        }
        if (!this.weightTexture) {
            this.weightTexture = createSampleTexture(gl, 4, this.m_in*this.m_out, true);
            gl.bindTexture(gl.TEXTURE_2D, this.weightTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
                4, this.m_in*this.m_out, 0,
                gl.RGBA, gl.FLOAT,
                this.weightTextureData);
        }

        let useWeightTexture = (buffer_in.w*buffer_in.h < 1e+4);
        let program = useWeightTexture ?
            Dnn.programConv2d110wt : Dnn.programConv2d110;
        gl.useProgram(program);
        gl.viewport(0, 0, buffer_in.w, buffer_in.h);
        gl.disable(gl.BLEND);
        for (var i = 0; i < this.n_out; i += 4) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, buffer_out.imgs[i/4].framebuffer);
            gl.clearColor(this.biases[i], this.biases[i+1], this.biases[i+2], this.biases[i+3]);
            gl.clear(gl.COLOR_BUFFER_BIT);
            // weight texture
            if (useWeightTexture) for (var j = 0; j < this.n_in; j += 32) {
                // setup accumulation buffer
                gl.bindTexture(gl.TEXTURE_2D, buffer_out.imgs[i/4].sampler);
                gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 0, 0, buffer_out.w, buffer_out.h, 0);
                gl.activeTexture(gl.TEXTURE10);
                gl.bindTexture(gl.TEXTURE_2D, buffer_out.imgs[i/4].sampler);
                gl.uniform1i(gl.getUniformLocation(program, "accumBuffer"), 10);
                // draw
                gl.activeTexture(gl.TEXTURE9);
                gl.bindTexture(gl.TEXTURE_2D, this.weightTexture);
                gl.uniform1i(gl.getUniformLocation(program, "uWeight"), 9);
                gl.uniform2i(gl.getUniformLocation(program, "uWeightRow"),
                    i/4*this.m_in+j/4, i/4*this.m_in+Math.min(j/4+8, this.m_in));
                for (var dj = 0; dj < 32; dj += 4) {
                    if (j+dj >= this.n_in) {
                        gl.uniform1i(gl.getUniformLocation(program, "uSrc"+(dj/4)), 15);
                        continue;
                    }
                    gl.activeTexture(gl['TEXTURE'+(dj/4)]);
                    gl.bindTexture(gl.TEXTURE_2D, buffer_in.imgs[(j+dj)/4].texture);
                    gl.uniform1i(gl.getUniformLocation(program, "uSrc"+(dj/4)), dj/4);
                }
                setPositionBuffer(gl, program);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
            // uniform
            else for (var j = 0; j < this.n_in; j += 4*maxChannel) {
                // setup accumulation buffer
                gl.bindTexture(gl.TEXTURE_2D, buffer_out.imgs[i/4].sampler);
                gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 0, 0, buffer_out.w, buffer_out.h, 0);
                gl.activeTexture(gl.TEXTURE10);
                gl.bindTexture(gl.TEXTURE_2D, buffer_out.imgs[i/4].sampler);
                gl.uniform1i(gl.getUniformLocation(program, "accumBuffer"), 10);
                // draw
                gl.uniform1i(gl.getUniformLocation(program, "nChannel"),
                    Math.min(maxChannel, this.m_in-(j/4)));
                for (var dj = 0; dj < 4*maxChannel; dj += 4) {
                    if (j+dj >= this.n_in) {
                        gl.uniform1i(gl.getUniformLocation(program, "uSrc"+(dj/4)), 15);
                        continue;
                    }
                    let uniformLocation = gl.getUniformLocation(program, 'w['+(dj/4)+']');
                    var mat = this.mats[i/4][(j+dj)/4];
                    gl.uniformMatrix4fv(uniformLocation, false, mat);
                    gl.activeTexture(gl['TEXTURE'+(dj/4)]);
                    gl.bindTexture(gl.TEXTURE_2D, buffer_in.imgs[(j+dj)/4].texture);
                    gl.uniform1i(gl.getUniformLocation(program, "uSrc"+(dj/4)), dj/4);
                }
                setPositionBuffer(gl, program);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
        }
    }
}


Dnn.ConvTranspose2D421 = function(
    n_in, n_out, weights, biases = []
) {
    if (weights.length != n_in*n_out*16)
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
            for (var wi = 0; wi < 4; wi++) {
                for (var wj = 0; wj < 4; wj++) {
                    var mat = new Float32Array(16);
                    for (var a = 0; a < 4; a++) {
                        for (var b = 0; b < 4; b++) {
                            var mi = (j+a)*n_out+(i+b);
                            mat[4*a+b] = this.weights[16*mi+((3-wi)*4+(3-wj))];
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
        if (!Dnn.programConvTranspose2d421) {
            Dnn.programConvTranspose2d421 = createShaderProgram(gl, null,
                getShaderSource('../shaders/dnn-convtranspose2d421.glsl'))
        }
        let program = Dnn.programConvTranspose2d421;
        gl.useProgram(program);
        gl.viewport(0, 0, buffer_out.w, buffer_out.h);
        gl.disable(gl.BLEND);
        for (var i = 0; i < this.n_out; i += 4) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, buffer_out.imgs[i/4].framebuffer);
            gl.clearColor(this.biases[i], this.biases[i+1], this.biases[i+2], this.biases[i+3]);
            gl.clear(gl.COLOR_BUFFER_BIT);
            for (var j = 0; j < this.n_in; j += 4) {
                // setup accumulation buffer
                gl.bindTexture(gl.TEXTURE_2D, buffer_out.imgs[i/4].sampler);
                gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 0, 0, buffer_out.w, buffer_out.h, 0);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, buffer_out.imgs[i/4].sampler);
                gl.uniform1i(gl.getUniformLocation(program, "accumBuffer"), 0);
                // draw
                for (var li = 0; li < 16; li++) {
                    let uniformLocation = gl.getUniformLocation(program, 'w['+li+']');
                    var mat = this.mats[i/4][j/4][li];
                    gl.uniformMatrix4fv(uniformLocation, false, mat);
                }
                setPositionBuffer(gl, program);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, buffer_in.imgs[Math.floor(j/4)].texture);
                gl.uniform1i(gl.getUniformLocation(program, "uSrc"), 1);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
        }
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
            precision mediump float;
            
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
            precision mediump float;
            
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


Dnn.maxpool2d2 = function(gl, buffer_in, buffer_out) {
    if (buffer_in.n != buffer_out.n)
        throw new Error("Input and output buffer sizes don't match.");
    if (2*buffer_out.w != buffer_in.w || 2*buffer_out.h != buffer_in.h)
        throw new Error("Input and output buffer dimensions don't match.");
    if (!Dnn.programMaxPool2d2) {
        Dnn.programMaxPool2d2 = createShaderProgram(gl, null,
            `#version 300 es
            precision mediump float;
            
            uniform sampler2D uSrc;
            out vec4 fragColor;
            
            void main() {
                ivec2 xy = 2*ivec2(gl_FragCoord.xy);
                vec4 c00 = texelFetch(uSrc, xy+ivec2(0,0), 0);
                vec4 c10 = texelFetch(uSrc, xy+ivec2(1,0), 0);
                vec4 c01 = texelFetch(uSrc, xy+ivec2(0,1), 0);
                vec4 c11 = texelFetch(uSrc, xy+ivec2(1,1), 0);
                fragColor = max(max(c00, c10), max(c01, c11));
            }`);
    }
    let program = Dnn.programMaxPool2d2;
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


Dnn.shallowConcat = function(buffer1, buffer2) {
    if (buffer1.n % 4 != 0)
        throw new Error("First channel size must be a multiple of 4.");
    if (buffer1.w != buffer2.w || buffer1.h != buffer2.h)
        throw new Error("Input and output buffer dimensions don't match.");
    return {
        n: buffer1.n + buffer2.n,
        w: buffer1.w,
        h: buffer1.h,
        imgs: buffer1.imgs.concat(buffer2.imgs)
    };
}
