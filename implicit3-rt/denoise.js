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
    if (!renderer.gl) {
        setTimeout(function() {
            initDenoiserModel_unet1(params);
        }, 1);
        return;
    }
    let gl = renderer.gl;

    let unet = new UNet1(3, 16, 24, 48, 64, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });

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
        gl.bindTexture(gl.TEXTURE_2D, unet.layers.input.imgs[0].texture);
        gl.copyTexImage2D(gl.TEXTURE_2D,
            0, gl.RGBA32F, 0, 0, state.width, state.height, 0);
        unet.forward();
        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.useProgram(programOutput);
        setPositionBuffer(gl, programOutput);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, unet.layers.output.imgs[0].texture);
        gl.uniform1i(gl.getUniformLocation(programOutput, "uSrc"), 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    useDenoiser.denoisers['unet1'] = renderer.denoiser;
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


function initDenoiserModel_runet1(params) {
    if (!renderer.gl) {
        setTimeout(function() {
            initDenoiserModel_runet1(params);
        }, 1);
        return;
    }
    let unet = new UNet1(3, 12, 16, 24, 32, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });
    applyResidualDenoiser(unet);
    useDenoiser.denoisers['runet1'] = renderer.denoiser;
}


function initDenoiserModel_runet1an(params) {
    if (!renderer.gl) {
        setTimeout(function() {
            initDenoiserModel_runet1an(params);
        }, 1);
        return;
    }
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
    if (!renderer.gl) {
        setTimeout(function() {
            initDenoiserModel_runet2(params);
        }, 1);
        return;
    }
    let unet = new UNet2(3, 12, 16, 24, 32, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });
    applyResidualDenoiser(unet);
    useDenoiser.denoisers['runet2'] = renderer.denoiser;
}


function initDenoiserModel_runet2gan(params) {
    if (!renderer.gl) {
        setTimeout(function() {
            initDenoiserModel_runet2gan(params);
        }, 1);
        return;
    }
    let unet = new UNet2(3, 12, 16, 24, 32, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });
    applyResidualDenoiser(unet);
    useDenoiser.denoisers['runet2gan'] = renderer.denoiser;
}


function initDenoiserModel_runet2gan2(params) {
    if (!renderer.gl) {
        setTimeout(function() {
            initDenoiserModel_runet2gan(params);
        }, 1);
        return;
    }
    let unet = new UNet2(3, 12, 16, 24, 32, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });
    applyResidualDenoiser(unet);
    useDenoiser.denoisers['runet2gan2'] = renderer.denoiser;
}

function initDenoiserModel_temp(params) {
    if (!renderer.gl) {
        setTimeout(function() {
            initDenoiserModel_temp(params);
        }, 1);
        return;
    }
    let unet = new UNet2(3, 12, 16, 24, 32, params);
    window.addEventListener("resize", function (event) {
        setTimeout(unet.updateLayers, 20);
    });
    applyResidualDenoiser(unet);
    useDenoiser.denoisers['temp'] = renderer.denoiser;
}

function useDenoiser(model_id) {

    if (!useDenoiser.hasOwnProperty('denoisers'))
        useDenoiser.denoisers = {};
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
        window['initDenoiserModel_'+model_id](params);
        state.renderNeeded = true;
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
