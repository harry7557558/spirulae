"use strict";

function initDenoiserModel_resnet1(params) {
    if (!renderer.gl) {
        setTimeout(function() {
            initDenoiserModel_resnet1(params);
        }, 1);
        return;
    }
    let gl = renderer.gl;

    let convi = new Dnn.Conv2d311(3, 16, params['convi.weight'], params['convi.bias']);
    let conv11 = new Dnn.Conv2d311(16, 16, params['conv11.weight'], params['conv11.bias']);
    let conv12 = new Dnn.Conv2d311(16, 16, params['conv12.weight'], params['conv12.bias']);
    let conv21 = new Dnn.Conv2d311(16, 16, params['conv21.weight'], params['conv21.bias']);
    let conv22 = new Dnn.Conv2d311(16, 16, params['conv22.weight'], params['conv22.bias']);
    let conv31 = new Dnn.Conv2d311(16, 16, params['conv31.weight'], params['conv31.bias']);
    let conv32 = new Dnn.Conv2d311(16, 16, params['conv32.weight'], params['conv32.bias']);
    let conv41 = new Dnn.Conv2d311(16, 16, params['conv41.weight'], params['conv41.bias']);
    let conv42 = new Dnn.Conv2d311(16, 16, params['conv42.weight'], params['conv42.bias']);
    let convo = new Dnn.Conv2d311(16, 3, params['convo.weight'], params['convo.bias']);

    let layers = {};

    function updateLayer(key, n) {
        var oldLayer = layers[key];
        layers[key] = new Dnn.CNNLayer(gl, n, state.width, state.height);
        if (oldLayer) Dnn.destroyCnnLayer(gl, oldLayer);
    }
    function updateLayers() {
        updateLayer("input", 3);
        updateLayer("ci", 16);
        updateLayer("xi", 16);
        updateLayer("c11", 16);
        updateLayer("r11", 16);
        updateLayer("c12", 16);
        updateLayer("x1", 16);
        updateLayer("c21", 16);
        updateLayer("r21", 16);
        updateLayer("c22", 16);
        updateLayer("x2", 16);
        updateLayer("c31", 16);
        updateLayer("r31", 16);
        updateLayer("c32", 16);
        updateLayer("x3", 16);
        updateLayer("c41", 16);
        updateLayer("r41", 16);
        updateLayer("c42", 16);
        updateLayer("x4", 16);
        updateLayer("co", 3);
    }
    window.addEventListener("resize", function (event) {
        setTimeout(updateLayers, 20);
    });
    updateLayers();

    let programOutput = createShaderProgram(gl, null,
        `#version 300 es
        precision highp float;
        
        uniform sampler2D uSrc;
        
        out vec4 fragColor;
        void main() {
            ivec2 coord = ivec2(gl_FragCoord.xy);
            vec3 c = texelFetch(uSrc, coord, 0).xyz;
            c = pow(max(exp(c)-1.0, 0.0), vec3(2.2));
            fragColor = vec4(c.xyz, 1.0);
        }`);

    renderer.denoiser = function(inputs, framebuffer) {
        if (inputs.pixel !== 'framebuffer')
            throw new Error("Unsupported NN input");
        gl.bindTexture(gl.TEXTURE_2D, layers.input.imgs[0].texture);
        gl.copyTexImage2D(gl.TEXTURE_2D,
            0, gl.RGBA32F, 0, 0, state.width, state.height, 0);

        convi.forward(gl, layers.input, layers.ci);
        Dnn.relu(gl, layers.ci, layers.xi);
        conv11.forward(gl, layers.xi, layers.c11);
        Dnn.relu(gl, layers.c11, layers.r11);
        conv12.forward(gl, layers.r11, layers.c12);
        Dnn.add(gl, layers.xi, layers.c12, layers.x1);
        conv21.forward(gl, layers.x1, layers.c21);
        Dnn.relu(gl, layers.c21, layers.r21);
        conv22.forward(gl, layers.r21, layers.c22);
        Dnn.add(gl, layers.x1, layers.c22, layers.x2);
        conv31.forward(gl, layers.x2, layers.c31);
        Dnn.relu(gl, layers.c31, layers.r31);
        conv32.forward(gl, layers.r31, layers.c32);
        Dnn.add(gl, layers.x2, layers.c32, layers.x3);
        conv41.forward(gl, layers.x3, layers.c41);
        Dnn.relu(gl, layers.c41, layers.r41);
        conv42.forward(gl, layers.r41, layers.c42);
        Dnn.add(gl, layers.x3, layers.c42, layers.x4);
        convo.forward(gl, layers.x4, layers.co);

        // var pixel = new Float32Array(4);
        // gl.bindFramebuffer(gl.FRAMEBUFFER, layers.c42.imgs[0].framebuffer);
        // gl.readPixels(64, 64, 1, 1, gl.RGBA, gl.FLOAT, pixel);
        // console.log(pixel);

        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.useProgram(programOutput);
        setPositionBuffer(gl, programOutput);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, layers.co.imgs[0].texture);
        gl.uniform1i(gl.getUniformLocation(programOutput, "uSrc"), 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    useDenoiser.denoisers['resnet1'] = renderer.denoiser;
}


function UNet1(nin, n0, n1, n2, n3, params) {
    let gl = renderer.gl;
    let econv0a = new Dnn.Conv2d311(nin, n0, params['econv0a.weight'], params['econv0a.bias']);
    let econv0b = new Dnn.Conv2d311(n0, n0, params['econv0b.weight'], params['econv0b.bias']);
    let econv1 = new Dnn.Conv2d311(n0, n1, params['econv1.weight'], params['econv1.bias']);
    let econv2 = new Dnn.Conv2d311(n1, n2, params['econv2.weight'], params['econv2.bias']);
    let mconv1 = new Dnn.Conv2d311(n2, n3, params['mconv1.weight'], params['mconv1.bias']);
    let mconv2 = new Dnn.Conv2d311(n3, n3, params['mconv2.weight'], params['mconv2.bias']);
    let dconv2a = new Dnn.ConvTranspose2D421(n3, n2, params['dconv2a.weight'], params['dconv2a.bias']);
    let dconv2b = new Dnn.Conv2d311(n2+n2, n2, params['dconv2b.weight'], params['dconv2b.bias']);
    let dconv1a = new Dnn.ConvTranspose2D421(n2, n1, params['dconv1a.weight'], params['dconv1a.bias']);
    let dconv1b = new Dnn.Conv2d311(n1+n1, n1, params['dconv1b.weight'], params['dconv1b.bias']);
    let dconv0a = new Dnn.ConvTranspose2D421(n1, n0, params['dconv0a.weight'], params['dconv0a.bias']);
    let dconv0b = new Dnn.Conv2d311(n0+n0, n0, params['dconv0b.weight'], params['dconv0b.bias']);
    let dconv0 = new Dnn.Conv2d311(n0, 3, params['dconv0.weight'], params['dconv0.bias']);

    let layers = {};
    function updateLayer(key, n, scale) {
        var w = Math.ceil(state.width/16)*16;
        var h = Math.ceil(state.height/16)*16;
        var oldLayer = layers[key];
        layers[key] = new Dnn.CNNLayer(gl, n, w/scale, h/scale);
        if (oldLayer) Dnn.destroyCnnLayer(gl, oldLayer);
    };
    this.layers = layers;
    this.updateLayers = function() {
        updateLayer("input", nin, 1);
        updateLayer("e0a", n0, 1);
        updateLayer("e0ar", n0, 1);
        updateLayer("e0b", n0, 1);
        updateLayer("e0bp", n0, 2);
        updateLayer("e1", n1, 2);
        updateLayer("e1p", n1, 4);
        updateLayer("e2", n2, 4);
        updateLayer("e2p", n2, 8);
        updateLayer("m1", n3, 8);
        updateLayer("m1r", n3, 8);
        updateLayer("m2", n3, 8);
        updateLayer("m2r", n3, 8);
        updateLayer("d2a", n2, 4);
        updateLayer("d2ar", n2, 4);
        updateLayer("d2b", n2, 4);
        updateLayer("d2br", n2, 4);
        updateLayer("d1a", n1, 2);
        updateLayer("d1ar", n1, 2);
        updateLayer("d1b", n1, 2);
        updateLayer("d1br", n1, 2);
        updateLayer("d0a", n0, 1);
        updateLayer("d0ar", n0, 1);
        updateLayer("d0b", n0, 1);
        updateLayer("d0br", n0, 1);
        updateLayer("output", 3, 1);
    }
    this.updateLayers();

    this.forward = function() {
        econv0a.forward(gl, layers.input, layers.e0a);
        Dnn.relu(gl, layers.e0a, layers.e0ar);
        econv0b.forward(gl, layers.e0ar, layers.e0b);
        Dnn.maxpool2d2(gl, layers.e0b, layers.e0bp);
        econv1.forward(gl, layers.e0bp, layers.e1);
        Dnn.maxpool2d2(gl, layers.e1, layers.e1p);
        econv2.forward(gl, layers.e1p, layers.e2);
        Dnn.maxpool2d2(gl, layers.e2, layers.e2p);
        mconv1.forward(gl, layers.e2p, layers.m1);
        Dnn.relu(gl, layers.m1, layers.m1r);
        mconv2.forward(gl, layers.m1r, layers.m2);
        Dnn.relu(gl, layers.m2, layers.m2r);
        dconv2a.forward(gl, layers.m2r, layers.d2a);
        Dnn.relu(gl, layers.d2a, layers.d2ar);
        dconv2b.forward(gl, Dnn.shallowConcat(layers.d2ar, layers.e2), layers.d2b);
        Dnn.relu(gl, layers.d2b, layers.d2br);
        dconv1a.forward(gl, layers.d2br, layers.d1a);
        Dnn.relu(gl, layers.d1a, layers.d1ar);
        dconv1b.forward(gl, Dnn.shallowConcat(layers.d1ar, layers.e1), layers.d1b);
        Dnn.relu(gl, layers.d1b, layers.d1br);
        dconv0a.forward(gl, layers.d1br, layers.d0a);
        Dnn.relu(gl, layers.d0a, layers.d0ar);
        dconv0b.forward(gl, Dnn.shallowConcat(layers.d0ar, layers.e0b), layers.d0b);
        Dnn.relu(gl, layers.d0b, layers.d0br);
        dconv0.forward(gl, layers.d0br, layers.output);
    };
}


function initDenoiserModel_unet1(params) {
    let unet = new UNet1(3, 16, 24, 48, 64, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });
    applyDenoiser(unet);
    useDenoiser.denoisers['unet1'] = renderer.denoiser;
}


function applyDenoiser(model) {
    let gl = renderer.gl;

    let programOutput = createShaderProgram(gl, null,
        `#version 300 es
        precision highp float;
        
        uniform sampler2D uSrc;
        
        out vec4 fragColor;
        void main() {
            ivec2 coord = ivec2(gl_FragCoord.xy);
            vec3 c = texelFetch(uSrc, coord, 0).xyz;
            c = pow(max(exp(c)-1.0, 0.0), vec3(2.2));
            fragColor = vec4(c.xyz, 1.0);
        }`);

    renderer.denoiser = function(inputs, framebuffer) {
        if (inputs.pixel !== 'framebuffer')
            throw new Error("Unsupported NN input");
        gl.bindTexture(gl.TEXTURE_2D, model.layers.input.imgs[0].texture);
        gl.copyTexImage2D(gl.TEXTURE_2D,
            0, gl.RGBA32F, 0, 0, state.width, state.height, 0);
        model.forward();
        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.useProgram(programOutput);
        setPositionBuffer(gl, programOutput);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, model.layers.output.imgs[0].texture);
        gl.uniform1i(gl.getUniformLocation(programOutput, "uSrc"), 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

function applyResidualDenoiser(model) {
    let gl = renderer.gl;

    let programOutput = createShaderProgram(gl, null,
        `#version 300 es
        precision highp float;
        
        uniform sampler2D uSrc;
        uniform sampler2D uSrcRes;
        
        out vec4 fragColor;
        void main() {
            ivec2 coord = ivec2(gl_FragCoord.xy);
            vec3 c = texelFetch(uSrc, coord, 0).xyz +
                texelFetch(uSrcRes, coord, 0).xyz;
            c = pow(max(exp(c)-1.0, 0.0), vec3(2.2));
            fragColor = vec4(c.xyz, 1.0);
        }`);

    renderer.denoiser = function(inputs, framebuffer) {
        if (inputs.pixel !== 'framebuffer')
            throw new Error("Unsupported NN input");
        gl.bindTexture(gl.TEXTURE_2D, model.layers.input.imgs[0].texture);
        gl.copyTexImage2D(gl.TEXTURE_2D,
            0, gl.RGBA32F, 0, 0, state.width, state.height, 0);
        model.forward();
        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.useProgram(programOutput);
        setPositionBuffer(gl, programOutput);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, model.layers.input.imgs[0].texture);
        gl.uniform1i(gl.getUniformLocation(programOutput, "uSrc"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, model.layers.output.imgs[0].texture);
        gl.uniform1i(gl.getUniformLocation(programOutput, "uSrcRes"), 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

function applyNormalizedResidualDenoiser(model) {
    let gl = renderer.gl;

    let programOutput = createShaderProgram(gl, null,
        `#version 300 es
        precision highp float;
        
        uniform sampler2D uSrc;
        
        out vec4 fragColor;
        void main() {
            ivec2 coord = ivec2(gl_FragCoord.xy);
            vec3 c = texelFetch(uSrc, coord, 0).xyz;
            c = pow(max(exp(c)-1.0, 0.0), vec3(2.2));
            fragColor = vec4(c.xyz, 1.0);
        }`);

    var layerTempI = null;
    var layerTempO = null;
    function updateLayer() {
        var w = Math.ceil(state.width/16)*16;
        var h = Math.ceil(state.height/16)*16;
        var oldLayer = layerTempI;
        layerTempI = new Dnn.CNNLayer(gl, 3, w, h);
        if (oldLayer) Dnn.destroyCnnLayer(gl, oldLayer);
        oldLayer = layerTempO;
        layerTempO = new Dnn.CNNLayer(gl, 3, w, h);
        if (oldLayer) Dnn.destroyCnnLayer(gl, oldLayer);
    };
    updateLayer();
    window.addEventListener("resize", function (event) {
        setTimeout(updateLayer, 20);
    });

    renderer.denoiser = function(inputs, framebuffer) {
        if (inputs.pixel !== 'framebuffer')
            throw new Error("Unsupported NN input");
        // load input
        gl.bindTexture(gl.TEXTURE_2D, layerTempI.imgs[0].texture);
        gl.copyTexImage2D(gl.TEXTURE_2D,
            0, gl.RGBA32F, 0, 0, state.width, state.height, 0);
        // normalize
        var ms = Dnn.global_mean_and_std(gl, layerTempI);
        Dnn.batch_norm_2d(gl, layerTempI, model.layers.input, 0.0, 1.0, ms.mean, ms.std);
        // inference residual model
        model.forward();
        Dnn.add(gl, model.layers.input, model.layers.output, layerTempI);
        // normalize back
        for (var i = 0; i < ms.length; i++)
            ms.std[i] = 1.0 / ms.std[i], ms.mean[i] *= -ms.std[i];
        Dnn.batch_norm_2d(gl, layerTempI, layerTempO, 0.0, 1.0, ms.mean, ms.std);
        // gamma transform
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.useProgram(programOutput);
        setPositionBuffer(gl, programOutput);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, layerTempO.imgs[0].texture);
        gl.uniform1i(gl.getUniformLocation(programOutput, "uSrc"), 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}


function initDenoiserModel_runet1(params) {
    let unet = new UNet1(3, 12, 16, 24, 32, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });
    applyResidualDenoiser(unet);
    useDenoiser.denoisers['runet1'] = renderer.denoiser;
}


function initDenoiserModel_runet1an(params) {
    let gl = renderer.gl;

    let unet = new UNet1(11, 12, 16, 24, 32, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });

    let programOutput = createShaderProgram(gl, null,
        `#version 300 es
        precision highp float;
        
        uniform sampler2D uSrc;
        uniform sampler2D uSrcRes;
        
        out vec4 fragColor;
        void main() {
            ivec2 coord = ivec2(gl_FragCoord.xy);
            vec3 c = texelFetch(uSrc, coord, 0).xyz +
                texelFetch(uSrcRes, coord, 0).xyz;
            c = pow(max(exp(c)-1.0, 0.0), vec3(2.2));
            fragColor = vec4(c.xyz, 1.0);
        }`);

    renderer.denoiser = function(inputs, framebuffer) {
        if (inputs.pixel !== 'framebuffer')
            throw new Error("Unsupported NN input");
        gl.bindTexture(gl.TEXTURE_2D, unet.layers.input.imgs[2].texture);
        gl.copyTexImage2D(gl.TEXTURE_2D,
            0, gl.RGBA32F, 0, 0, state.width, state.height, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.renderTargetAlbedo.framebuffer);
        gl.bindTexture(gl.TEXTURE_2D, unet.layers.input.imgs[0].texture);
        gl.copyTexImage2D(gl.TEXTURE_2D,
            0, gl.RGBA32F, 0, 0, state.width, state.height, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.renderTargetNormal.framebuffer);
        gl.bindTexture(gl.TEXTURE_2D, unet.layers.input.imgs[1].texture);
        gl.copyTexImage2D(gl.TEXTURE_2D,
            0, gl.RGBA32F, 0, 0, state.width, state.height, 0);
        unet.forward();
        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.useProgram(programOutput);
        setPositionBuffer(gl, programOutput);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, unet.layers.input.imgs[2].texture);
        gl.uniform1i(gl.getUniformLocation(programOutput, "uSrc"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, unet.layers.output.imgs[0].texture);
        gl.uniform1i(gl.getUniformLocation(programOutput, "uSrcRes"), 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    useDenoiser.denoisers['runet1an'] = renderer.denoiser;
}


function UNet2(nin, n0, n1, n2, n3, params) {
    let gl = renderer.gl;
    let convi = new Dnn.Conv2d311(nin, n0, params['convi.weight'], params['convi.bias']);
    let econv0a = new Dnn.Conv2d311(n0, n0, params['econv0a.weight'], params['econv0a.bias']);
    let econv0b = new Dnn.Conv2d311(n0, n0, params['econv0b.weight'], params['econv0b.bias']);
    let econv1a = new Dnn.Conv2d311(n0, n1, params['econv1a.weight'], params['econv1a.bias']);
    let econv1b = new Dnn.Conv2d311(n1, n1, params['econv1b.weight'], params['econv1b.bias']);
    let econv2a = new Dnn.Conv2d311(n1, n2, params['econv2a.weight'], params['econv2a.bias']);
    let econv2b = new Dnn.Conv2d311(n2, n2, params['econv2b.weight'], params['econv2b.bias']);
    let econv3a = new Dnn.Conv2d311(n2, n3, params['econv3a.weight'], params['econv3a.bias']);
    let econv3b = new Dnn.Conv2d311(n3, n3, params['econv3b.weight'], params['econv3b.bias']);
    let dconv2a = new Dnn.ConvTranspose2D421(n3, n2, params['dconv2a.weight'], params['dconv2a.bias']);
    let dconv2b = new Dnn.Conv2d110(n2+n2, n2, params['dconv2b.weight'], params['dconv2b.bias']);
    let dconv1a = new Dnn.ConvTranspose2D421(n2, n1, params['dconv1a.weight'], params['dconv1a.bias']);
    let dconv1b = new Dnn.Conv2d110(n1+n1, n1, params['dconv1b.weight'], params['dconv1b.bias']);
    let dconv0a = new Dnn.ConvTranspose2D421(n1, n0, params['dconv0a.weight'], params['dconv0a.bias']);
    let dconv0b = new Dnn.Conv2d110(n0+n0, n0, params['dconv0b.weight'], params['dconv0b.bias']);
    let convo = new Dnn.Conv2d311(n0, 3, params['convo.weight'], params['convo.bias']);

    let layers = {};
    function updateLayer(key, n, scale) {
        var w = Math.ceil(state.width/16)*16;
        var h = Math.ceil(state.height/16)*16;
        var oldLayer = layers[key];
        layers[key] = new Dnn.CNNLayer(gl, n, w/scale, h/scale);
        if (oldLayer) Dnn.destroyCnnLayer(gl, oldLayer);
    };
    this.layers = layers;
    this.updateLayers = function() {
        updateLayer("input", nin, 1);
        updateLayer("ci", n0, 1);
        updateLayer("cir", n0, 1);
        updateLayer("e0a", n0, 1);
        updateLayer("e0ar", n0, 1);
        updateLayer("e0b", n0, 1);
        updateLayer("e0bp", n0, 2);
        updateLayer("e1a", n1, 2);
        updateLayer("e1ar", n1, 2);
        updateLayer("e1b", n1, 2);
        updateLayer("e1bp", n1, 4);
        updateLayer("e2a", n2, 4);
        updateLayer("e2ar", n2, 4);
        updateLayer("e2b", n2, 4);
        updateLayer("e2bp", n2, 8);
        updateLayer("e3a", n3, 8);
        updateLayer("e3ar", n3, 8);
        updateLayer("e3b", n3, 8);
        updateLayer("e3br", n3, 8);
        updateLayer("d2a", n2, 4);
        updateLayer("d2ar", n2, 4);
        updateLayer("d2b", n2, 4);
        updateLayer("d2br", n2, 4);
        updateLayer("d1a", n1, 2);
        updateLayer("d1ar", n1, 2);
        updateLayer("d1b", n1, 2);
        updateLayer("d1br", n1, 2);
        updateLayer("d0a", n0, 1);
        updateLayer("d0ar", n0, 1);
        updateLayer("d0b", n0, 1);
        updateLayer("d0br", n0, 1);
        updateLayer("do", n0, 1);
        updateLayer("output", 3, 1);
    }
    this.updateLayers();

    this.forward = function() {
        convi.forward(gl, layers.input, layers.ci);
        Dnn.relu(gl, layers.ci, layers.cir);
        econv0a.forward(gl, layers.cir, layers.e0a);
        Dnn.relu(gl, layers.e0a, layers.e0ar);
        econv0b.forward(gl, layers.e0ar, layers.e0b);
        Dnn.maxpool2d2(gl, layers.e0b, layers.e0bp);
        econv1a.forward(gl, layers.e0bp, layers.e1a);
        Dnn.relu(gl, layers.e1a, layers.e1ar);
        econv1b.forward(gl, layers.e1ar, layers.e1b);
        Dnn.maxpool2d2(gl, layers.e1b, layers.e1bp);
        econv2a.forward(gl, layers.e1bp, layers.e2a);
        Dnn.relu(gl, layers.e2a, layers.e2ar);
        econv2b.forward(gl, layers.e2ar, layers.e2b);
        Dnn.maxpool2d2(gl, layers.e2b, layers.e2bp);
        econv3a.forward(gl, layers.e2bp, layers.e3a);
        Dnn.relu(gl, layers.e3a, layers.e3ar);
        econv3b.forward(gl, layers.e3ar, layers.e3b);
        Dnn.relu(gl, layers.e3b, layers.e3br);
        dconv2a.forward(gl, layers.e3br, layers.d2a);
        Dnn.relu(gl, layers.d2a, layers.d2ar);
        dconv2b.forward(gl, Dnn.shallowConcat(layers.d2ar, layers.e2b), layers.d2b);
        Dnn.relu(gl, layers.d2b, layers.d2br);
        dconv1a.forward(gl, layers.d2br, layers.d1a);
        Dnn.relu(gl, layers.d1a, layers.d1ar);
        dconv1b.forward(gl, Dnn.shallowConcat(layers.d1ar, layers.e1b), layers.d1b);
        Dnn.relu(gl, layers.d1b, layers.d1br);
        dconv0a.forward(gl, layers.d1br, layers.d0a);
        Dnn.relu(gl, layers.d0a, layers.d0ar);
        dconv0b.forward(gl, Dnn.shallowConcat(layers.d0ar, layers.e0b), layers.d0b);
        Dnn.relu(gl, layers.d0b, layers.d0br);
        Dnn.add(gl, layers.d0br, layers.ci, layers.do);
        convo.forward(gl, layers.do, layers.output);
    };
}


function initDenoiserModel_runet2(params) {
    let unet = new UNet2(3, 12, 16, 24, 32, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });
    applyResidualDenoiser(unet);
    useDenoiser.denoisers['runet2'] = renderer.denoiser;
}


function initDenoiserModel_runet2gan(params) {
    let unet = new UNet2(3, 12, 16, 24, 32, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });
    applyResidualDenoiser(unet);
    useDenoiser.denoisers['runet2gan'] = renderer.denoiser;
}


function initDenoiserModel_runet2gan2(params) {
    let unet = new UNet2(3, 12, 16, 24, 32, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });
    applyResidualDenoiser(unet);
    useDenoiser.denoisers['runet2gan2'] = renderer.denoiser;
}


function AttUNet1(nin, k1, k2, k3, k4, ko, params) {
    let gl = renderer.gl;
    let kc = k1+ko;
    if (kc % 2) throw new Error("Fractional attention layer size.");
    let enc1 = new Dnn.Conv2d311(nin, k1, params['enc1.weight'], params['enc1.bias']);
    let div1 = new Dnn.Conv2d321(k1, k2, params['div1.weight'], params['div1.bias']);
    let enc2 = new Dnn.Conv2d311(k2, k2, params['enc2.weight'], params['enc2.bias']);
    let div2 = new Dnn.Conv2d321(k2, k3, params['div2.weight'], params['div2.bias']);
    let enc3 = new Dnn.Conv2d311(k3, k3, params['enc3.weight'], params['enc3.bias']);
    let div3 = new Dnn.Conv2d321(k3, k4, params['div3.weight'], params['div3.bias']);
    let dec31 = new Dnn.Conv2d311(k4, k4, params['dec31.weight'], params['dec31.bias']);
    let dec32 = new Dnn.Conv2d311(k4, k4, params['dec32.weight'], params['dec32.bias']);
    let upc3 = new Dnn.ConvTranspose2D421(k4, k3, params['upc3.weight'], params['upc3.bias']);
    let dec21 = new Dnn.Conv2d311(k3, k3, params['dec21.weight'], params['dec21.bias']);
    let dec22 = new Dnn.Conv2d311(k3, k3, params['dec22.weight'], params['dec22.bias']);
    let upc2 = new Dnn.ConvTranspose2D421(k3+k3, k2, params['upc2.weight'], params['upc2.bias']);
    let dec11 = new Dnn.Conv2d311(k2, k2, params['dec11.weight'], params['dec11.bias']);
    let dec12 = new Dnn.Conv2d311(k2, k2, params['dec12.weight'], params['dec12.bias']);
    let upc1 = new Dnn.ConvTranspose2D421(k2+k2, ko, params['upc1.weight'], params['upc1.bias']);
    let dec01 = new Dnn.Conv2d311(ko, ko, params['dec01.weight'], params['dec01.bias']);
    let dec02 = new Dnn.Conv2d311(ko, ko, params['dec02.weight'], params['dec02.bias']);
    let att1conv1 = new Dnn.Conv2d110(kc, 1, params['attention1.conv1.weight'], params['attention1.conv1.bias']);
    let att1conv2 = new Dnn.Conv2d110(kc, kc/2, params['attention1.conv2.weight'], params['attention1.conv2.bias']);
    let att1conv3 = { w: params['attention1.conv3.weight'], b: params['attention1.conv3.bias'] };
    let att2conv1 = new Dnn.Conv2d110(kc, kc/2, params['attention2.conv1.weight'], params['attention2.conv1.bias']);
    let att2conv2 = new Dnn.Conv2d110(kc, kc/2, params['attention2.conv2.weight'], params['attention2.conv2.bias']);
    let convo = new Dnn.Conv2d311(kc, 3, params['convo.weight'], params['convo.bias']);

    let layers = {};
    function ul(key, n, scale) {
        var w = Math.ceil(state.width/16)*16;
        var h = Math.ceil(state.height/16)*16;
        var oldLayer = layers[key];
        layers[key] = new Dnn.CNNLayer(gl, n, w/scale, h/scale);
        if (oldLayer) Dnn.destroyCnnLayer(gl, oldLayer);
    };
    this.layers = layers;
    this.updateLayers = function() {
        ul("input", nin, 1);
        ul("e1", k1, 1);
        ul("e1r", k1, 1); ul("d1", k2, 2);
        ul("d1r", k2, 2); ul("e2", k2, 2);
        ul("e2r", k2, 2); ul("d2", k3, 4);
        ul("d2r", k3, 4); ul("e3", k3, 4);
        ul("e3r", k3, 4); ul("d3", k4, 8);
        ul("d3r", k4, 8); ul("d31", k4, 8); ul("d31r", k4, 8); ul("d32", k4, 8);
        ul("d32r", k4, 8); ul("u3", k3, 4);
        ul("u3r", k3, 4); ul("d21", k3, 4); ul("d21r", k3, 4); ul("d22", k3, 4);
        ul("d22r", k3, 4); ul("u2", k2, 2);
        ul("u2r", k2, 2); ul("d11", k2, 2); ul("d11r", k2, 2); ul("d12", k2, 2);
        ul("d12r", k2, 2); ul("u1", ko, 1);
        ul("u1r", ko, 1); ul("d01", ko, 1); ul("d01r", ko, 1); ul("d02", ko, 1);
        ul("d02r", ko, 1);
        ul("att1x1", 1, 1); ul("att1x1a", 1, 1); ul("att1x2", kc/2, 1); ul("att1o", kc, 1);
        ul("att2x1", kc/2, 1); ul("att2x2", kc/2, 1); ul("att2x3", 1, 1); ul("att2x3a", 1, 1); ul("att2o", kc, 1);
        ul("output", 3, 1);
    }
    this.updateLayers();

    function channelAttention(x) {
        att1conv1.forward(gl, x, layers.att1x1);
        Dnn.softmax2d(gl, layers.att1x1, layers.att1x1a);
        att1conv2.forward(gl, x, layers.att1x2);
        let x3 = Dnn.global_dot(gl, layers.att1x1a, layers.att1x2);
        let x3a = new Array(kc);
        for (var i = 0; i < kc; i++) {
            var s = att1conv3.b[i];
            for (var j = 0; j < kc/2; j++)
                s += att1conv3.w[i*(kc/2)+j] * x3[j];
            x3a[i] = 1.0 / (1.0+Math.exp(-s));
        }
        Dnn.batch_norm_2d(gl, x, layers.att1o, 0.0, x3a, 0.0, 1.0);
    }

    function spacialAttention(x) {
        att2conv1.forward(gl, x, layers.att2x1);
        let x1 = Dnn.global_mean(gl, layers.att2x1);
        var sexp = 0.0;
        for (var i = 0; i < kc/2; i++)
            sexp += (x1[i] = Math.exp(x1[i]));
        for (var i = 0; i < kc/2; i++)
            x1[i] /= sexp;
        att2conv2.forward(gl, x, layers.att2x2);
        Dnn.channel_sum(gl, layers.att2x2, layers.att2x3, x1);
        Dnn.sigmoid(gl, layers.att2x3, layers.att2x3a);
        Dnn.mul(gl, x, layers.att2x3a, layers.att2o);
    }

    this.forward = function() {
        enc1.forward(gl, layers.input, layers.e1);
        Dnn.relu(gl, layers.e1, layers.e1r);
        div1.forward(gl, layers.e1r, layers.d1);
        Dnn.relu(gl, layers.d1, layers.d1r);
        enc2.forward(gl, layers.d1r, layers.e2);
        Dnn.relu(gl, layers.e2, layers.e2r);
        div2.forward(gl, layers.e2r, layers.d2);
        Dnn.relu(gl, layers.d2, layers.d2r);
        enc3.forward(gl, layers.d2r, layers.e3);
        Dnn.relu(gl, layers.e3, layers.e3r);
        div3.forward(gl, layers.e3r, layers.d3);
        Dnn.relu(gl, layers.d3, layers.d3r);
        dec31.forward(gl, layers.d3r, layers.d31);
        Dnn.relu(gl, layers.d31, layers.d31r);
        dec32.forward(gl, layers.d31r, layers.d32);
        Dnn.relu(gl, layers.d32, layers.d32r);
        upc3.forward(gl, layers.d32r, layers.u3);
        Dnn.relu(gl, layers.u3, layers.u3r);
        dec21.forward(gl, layers.u3r, layers.d21);
        Dnn.relu(gl, layers.d21, layers.d21r);
        dec22.forward(gl, layers.d21r, layers.d22);
        Dnn.relu(gl, layers.d22, layers.d22r);
        upc2.forward(gl, Dnn.shallowConcat(layers.e3, layers.d22r), layers.u2);
        Dnn.relu(gl, layers.u2, layers.u2r);
        dec11.forward(gl, layers.u2r, layers.d11);
        Dnn.relu(gl, layers.d11, layers.d11r);
        dec12.forward(gl, layers.d11r, layers.d12);
        Dnn.relu(gl, layers.d12, layers.d12r);
        upc1.forward(gl, Dnn.shallowConcat(layers.e2, layers.d12r), layers.u1);
        Dnn.relu(gl, layers.u1, layers.u1r);
        dec01.forward(gl, layers.u1r, layers.d01);
        Dnn.relu(gl, layers.d01, layers.d01r);
        dec02.forward(gl, layers.d01r, layers.d02);
        Dnn.relu(gl, layers.d02, layers.d02r);
        channelAttention(Dnn.shallowConcat(layers.e1, layers.d02r));
        // layers.output = layers.att1x1a; return;  // visualize attention map
        spacialAttention(layers.att1o);
        convo.forward(gl, layers.att2o, layers.output);
    };
}



function initDenoiserModel_temp(params) {
    // let unet = new UNet2(3, 12, 16, 24, 32, params);
    let unet = new AttUNet1(3, 12, 16, 24, 32, 12, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });
    // applyNormalizedResidualDenoiser(unet);
    applyResidualDenoiser(unet);
    // applyDenoiser(unet);
    useDenoiser.denoisers['temp'] = renderer.denoiser;
}

function useDenoiser(model_id) {

    var firstLoad = false;
    if (!useDenoiser.hasOwnProperty('denoisers')) {
        useDenoiser.denoisers = {};
        firstLoad = true;
    }
    renderer.requireAlbedo = false;
    renderer.requireNormal = false;
    if (model_id == null || model_id == "null") {
        renderer.denoiser = null;
        state.renderNeeded = true;
        return;
    }
    if (/an$/.test(model_id) || /a$/.test(model_id))
        renderer.requireAlbedo = true;
    if (/n$/.test(model_id))
        renderer.requireNormal = true;
    if (useDenoiser.denoisers.hasOwnProperty(model_id)) {
        renderer.denoiser = useDenoiser.denoisers[model_id];
        state.renderNeeded = true;
        return;
    }

    let loadedFiles = 0;
    const files = {};

    function onModelLoad(key, filename, content) {
        loadedFiles++;
        files[key] = /\.json/.test(filename) ?
            JSON.parse(content) : content;
        if (loadedFiles < 2)
            return;
        var params = Dnn.decodeDnnParameters(files.bin, files.json);
        
        function update() {
            if (!renderer.gl) {
                setTimeout(update, 1);
                return;
            }
            window['initDenoiserModel_'+model_id](params);
            state.renderNeeded = true;
        }
        update();
    }

    function getFile(key, filename) {
      fetch(filename)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch ${filename}`);
            }
            return /\.json/.test(filename) ?
                response.text() :
                response.arrayBuffer();
        })
        .then(content => {
            onModelLoad(key, filename, content);
        })
        .catch(error => {
            console.error(error);
        });
    }

    var nocache = "?nocache=" + Math.floor(Date.now() / 3600000);
    // nocache = "";
    getFile('json', 'denoise_models/denoise_'+model_id+'.json'+nocache);
    getFile('bin', 'denoise_models/denoise_'+model_id+'.bin'+nocache);
}
