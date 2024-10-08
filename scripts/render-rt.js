"use strict";

var renderer = {
    canvas: null,
    gl: null,
    renderSource: "",
    copySource: "",
    expandSource: "",
    postSource: "",
    tonemapSource: "",
    positionBuffer: null,
    renderProgram: null,
    copyProgram: null,
    expandProgram: null,
    postProgram: null,
    renderTarget: null,
    renderTargetAccum: null,
    expandTarget: null,
    denoiseTarget: null,
    tonemapProgram: null,
    tonemapTarget: null,
    timerExt: null,
    uOutput: 0,
    requireAlbedo: false,
    renderTargetAlbedo: null,
    requireNormal: false,
    renderTargetNormal: null,
    denoiser: null,  // function(textures, framebuffer)
};

var trainingData = {
    recording: false,
    state: "unstarted",
    width: 256,
    height: 256,
    sppRange: { min: 1, max: 1 },
    spp: 0,
    sSamples: 64,
    byteOffset: 0,
    bufferView: [],
    bufferFrames: [],
    listIndex: -1,
};

// call this function to re-render
async function drawScene(state, transformMatrix, lightDir) {
    if (renderer.renderProgram == null) {
        renderer.canvas.style.cursor = "not-allowed";
        return;
    }
    else renderer.canvas.style.cursor = "default";
    let gl = renderer.gl;

    // render to target + timer
    var timerQueries = [];
    let timer = renderer.timerExt;
    const countIndividualTime = false;
    function renderPass() {
        if (countIndividualTime && timer != null) {
            let query = gl.createQuery();
            timerQueries.push(query);
            gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.endQuery(timer.TIME_ELAPSED_EXT);
        }
        else gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    let query = null;
    if (!countIndividualTime && timer != null) {
        query = gl.createQuery();
        timerQueries.push(query);
        gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
    }

    // accumulation buffer
    gl.viewport(0, 0, state.width, state.height);
    if (state.iFrame == 0) {  // clear
        gl.clearColor(0, 0, 0, 0);
        // clear texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.renderTarget.framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindTexture(gl.TEXTURE_2D, renderer.renderTarget.sampler);
        gl.copyTexImage2D(gl.TEXTURE_2D,
            0, gl.RGBA32F, 0, 0, state.width, state.height, 0);
        // clear accumulation texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.renderTargetAccum.framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindTexture(gl.TEXTURE_2D, renderer.renderTargetAccum.sampler);
        gl.copyTexImage2D(gl.TEXTURE_2D,
            0, gl.RGBA32F, 0, 0, state.width, state.height, 0);
    }
    const batch = 64;
    if (state.iFrame % batch == 0) {
        gl.useProgram(renderer.copyProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.renderTargetAccum.framebuffer);
        setPositionBuffer(gl, renderer.copyProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderer.renderTarget.texture);
        gl.uniform1i(gl.getUniformLocation(renderer.copyProgram, "iChannel0"), 0);
        gl.uniform1f(gl.getUniformLocation(renderer.copyProgram, "sc"),
            state.iFrame == 0 ? 0.0 : 1.0);
        renderPass();
    }

    // render image
    gl.useProgram(renderer.renderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.renderTarget.framebuffer);
    setPositionBuffer(gl, renderer.renderProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderer.renderTarget.sampler);
    gl.uniform1i(gl.getUniformLocation(renderer.renderProgram, "accumBuffer"), 0);
    gl.uniform1f(gl.getUniformLocation(renderer.renderProgram, "ZERO"), 0.0);
    // gl.activeTexture(gl.TEXTURE0);
    // gl.bindTexture(gl.TEXTURE_2D, renderer.renderTarget.sampler);
    // gl.uniform1i(gl.getUniformLocation(renderer.renderProgram, "iChannel0"), 0);
    gl.uniform2f(gl.getUniformLocation(renderer.renderProgram, "iResolution"),
        state.width, state.height);
    gl.uniform1i(gl.getUniformLocation(renderer.renderProgram, "uOutput"), renderer.uOutput);
    gl.uniform1f(gl.getUniformLocation(renderer.renderProgram, "iSpp"), state.iSpp);
    gl.uniform1f(gl.getUniformLocation(renderer.renderProgram, "sSamples"), Number(state.sSamples));
    gl.uniform1f(gl.getUniformLocation(renderer.renderProgram, "iSeed"), Math.random());
    gl.uniformMatrix4fv(
        gl.getUniformLocation(renderer.renderProgram, "transformMatrix"),
        false,
        mat4ToFloat32Array(transformMatrix));
    gl.uniform1f(gl.getUniformLocation(renderer.renderProgram, "iTime"), state.iTime);
    gl.uniform1f(gl.getUniformLocation(renderer.renderProgram, "uScale"), state.scale);
    gl.uniform3f(gl.getUniformLocation(renderer.renderProgram, "uClipBox"),
        state.clipSize[0], state.clipSize[1], state.clipSize[2]);
    gl.uniform3f(gl.getUniformLocation(renderer.renderProgram, "LDIR"),
        lightDir[0], lightDir[1], lightDir[2]);
    gl.uniform1f(gl.getUniformLocation(renderer.renderProgram, "rZScale"), calcZScale());
    for (var r in state) {
        if (!/^r[A-Zx-z]/.test(r))
            continue;
        gl.uniform1f(gl.getUniformLocation(renderer.renderProgram, r), state[r]);
    }
    renderPass();
    gl.bindTexture(gl.TEXTURE_2D, renderer.renderTarget.sampler);
    gl.copyTexImage2D(gl.TEXTURE_2D,
        0, gl.RGBA32F, 0, 0, state.width, state.height, 0);

    // auxiliary buffers
    if (state.iFrame == 0) {
        if (renderer.requireAlbedo) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.renderTargetAlbedo.framebuffer);
            setPositionBuffer(gl, renderer.renderProgram);
            gl.uniform1i(gl.getUniformLocation(renderer.renderProgram, "uOutput"), 4);
            renderPass();
        }
        if (renderer.requireNormal) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.renderTargetNormal.framebuffer);
            setPositionBuffer(gl, renderer.renderProgram);
            gl.uniform1i(gl.getUniformLocation(renderer.renderProgram, "uOutput"), 5);
            renderPass();
        }
    }

    let outputFramebuffer = renderer.denoiser ?
        renderer.denoiseTarget.framebuffer :
        renderer.tonemapTarget.framebuffer;
    let fractionalSpp = state.iSpp < (renderer.denoiser ? 2 : 2);

    // post processing
    gl.useProgram(renderer.postProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fractionalSpp ?
        renderer.expandTarget.framebuffer : outputFramebuffer
    );
    setPositionBuffer(gl, renderer.postProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderer.renderTargetAccum.texture);
    gl.uniform1i(gl.getUniformLocation(renderer.postProgram, "iChannel0"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, renderer.renderTarget.texture);
    gl.uniform1i(gl.getUniformLocation(renderer.postProgram, "iChannel1"), 1);
    gl.uniform1i(gl.getUniformLocation(renderer.postProgram, "denoise"),
        renderer.denoiser !== null);
    gl.uniform1f(gl.getUniformLocation(renderer.postProgram, "iSpp"),
        state.iSpp+state.sSamples);
    renderPass();

    // expand for <1spp
    if (fractionalSpp) {
        gl.useProgram(renderer.expandProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, outputFramebuffer);
        setPositionBuffer(gl, renderer.expandProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderer.expandTarget.texture);
        gl.uniform1i(gl.getUniformLocation(renderer.expandProgram, "iChannel0"), 0);
        renderPass();
    }
    var niter = state.iSpp<1.0/64.0 ? 3 :
            state.iSpp<1.0/16.0 ? 2 :
            state.iSpp<1.0/4.0 ? 1 : 0;
    for (var i = 0; i < niter; i++) {
        gl.bindTexture(gl.TEXTURE_2D, renderer.expandTarget.sampler);
        gl.copyTexImage2D(gl.TEXTURE_2D,
            0, gl.RGBA32F, 0, 0, state.width, state.height, 0);
        setPositionBuffer(gl, renderer.expandProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderer.expandTarget.sampler);
        gl.uniform1i(gl.getUniformLocation(renderer.expandProgram, "iChannel0"), 0);
        renderPass();
    }

    // denoising
    if (renderer.denoiser) {
        gl.bindTexture(gl.TEXTURE_2D, renderer.denoiseTarget.sampler);
        gl.copyTexImage2D(gl.TEXTURE_2D,
            0, gl.RGBA32F, 0, 0, state.width, state.height, 0);
        renderer.denoiser({
            // 'pixel': renderer.denoiseTarget.texture,
            'pixel': 'framebuffer',
            'albedo': null,
            'normal': null },
            renderer.tonemapTarget.framebuffer
        );
    }

    // tone mapping
    gl.useProgram(renderer.tonemapProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    setPositionBuffer(gl, renderer.tonemapProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderer.tonemapTarget.texture);
    gl.uniform1i(gl.getUniformLocation(renderer.tonemapProgram, "iChannel0"), 0);
    renderPass();

    if (!countIndividualTime && timer != null)
        gl.endQuery(timer.TIME_ELAPSED_EXT);

    // check timer
    function checkTime() {
        let fpsDisplay = document.getElementById("fps");
        if (timer == null) {
            for (var i = 0; i < timerQueries.length; i++)
                gl.deleteQuery(timerQueries[i]);
            fpsDisplay.innerHTML = state.iTime >= 0.0 ? state.iTime.toFixed(2) + " s" :
                (Math.round(state.iSpp*100)/100) + " spp";
            return;
        }
        if (timerQueries.length == 0) return;
        let query = timerQueries[timerQueries.length - 1];
        if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
            setTimeout(checkTime, 40);
            return;
        }
        var indivTime = [], totTime = 0.0;
        for (var i = 0; i < timerQueries.length; i++) {
            let query = timerQueries[i];
            if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
                let dt = 1e-6 * gl.getQueryParameter(query, gl.QUERY_RESULT);
                indivTime.push(dt.toFixed(1) + "ms");
                totTime += dt;
            }
            gl.deleteQuery(query);
        }
        if (countIndividualTime) console.log(indivTime.join(' '));
        fpsDisplay.innerHTML = (
            state.iTime >= 0.0 ? state.iTime.toFixed(2) + " s - " :
            (Math.round(state.iSpp*100)/100) + " spp - ") +
            (1000.0 / totTime).toFixed(1) + " fps";
    }
    setTimeout(checkTime, 100);
}


// ============================ MAIN ==============================

var state = {
    name: "",
    iFrame: 0,
    sSamples: 1,
    iSpp: 0.0,
    width: window.innerWidth,
    height: window.innerHeight,
    screenCenter: { x: 0.5, y: 0.5 },
    defaultScreenCenter: true,
    worldSpace: true,
    iTime: -1.0,
    rz: null,
    rx: null,
    ry: null,
    fov: null,
    scale: null,
    clipSize: null,
    rTheta: null,
    rPhi: null,
    renderNeeded: true
};
function resetState(loaded_state = {}, overwrite = true) {
    if (resetState.defaultState == undefined)
        resetState.defaultState = JSON.parse(JSON.stringify(loaded_state));
    var state1 = {
        name: state.name,
        width: window.innerWidth,
        height: window.innerHeight,
        screenCenter: calcScreenCenter(),
        defaultScreenCenter: true,
        rz: resetState.defaultState.rz,
        rx: resetState.defaultState.rx,
        scale: resetState.defaultState.scale,
        clipSize: resetState.defaultState.clipSize.slice(),
        renderNeeded: true
    };
    for (var key in state1) {
        if (overwrite || !loaded_state.hasOwnProperty(key) || loaded_state[key] == null
            || typeof(loaded_state[key]) != typeof(state1[key])
            || (typeof(state1[key]) == "object" && loaded_state[key].length != state1[key].length)
        ) loaded_state[key] = state1[key];
        if (state.hasOwnProperty(key) && !/^r[A-Z]/.test(key))
            state[key] = loaded_state[key];
    }
    state.iTime = 0.0;
}

// z-scale slider
function calcZScale() {
    var t = state.rZScale;
    if (!(typeof t === "number" && t > 0. && t < 1.))
        t = 0.5;
    return Math.pow(t / (1.0 - t), 0.75);
}

function initWebGL() {
    // get context
    renderer.canvas = document.getElementById("canvas");
    renderer.gl = canvas.getContext("webgl2", { antialias: false })
        || canvas.getContext("experimental-webgl2",  { antialias: false });
    if (renderer.gl == null)
        webglRaiseNotSupportedError();
    canvas.addEventListener("webglcontextlost", function (event) {
        event.preventDefault();
        document.body.innerHTML = "<h1 style='color:red;'>Error: WebGL context lost. Please refresh this page.</h1>";
    });

    // load GLSL source
    console.time("load glsl code");
    renderer.vsSource = "#version 300 es\nin vec4 vertexPosition;out vec2 vXy;" +
        "void main(){vXy=vertexPosition.xy;gl_Position=vertexPosition;}";
    renderer.renderSource = getShaderSource("frag-render.glsl");
    renderer.copySource = getShaderSource("../shaders/frag-copy.glsl");
    renderer.expandSource = getShaderSource("../shaders/frag-rt-expand.glsl");
    renderer.postSource = getShaderSource("../shaders/frag-rt-post.glsl");
    renderer.tonemapSource = getShaderSource("../shaders/frag-tonemap.glsl");
    console.timeEnd("load glsl code");

    // position buffer
    renderer.positionBuffer = renderer.gl.createBuffer();
    renderer.gl.bindBuffer(renderer.gl.ARRAY_BUFFER, renderer.positionBuffer);
    var positions = [-1, 1, 1, 1, -1, -1, 1, -1];
    renderer.gl.bufferData(renderer.gl.ARRAY_BUFFER, new Float32Array(positions), renderer.gl.STATIC_DRAW);

    // timer
    renderer.timerExt = renderer.gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (renderer.timerExt)
        document.getElementById("fps").textContent = "Timer loaded.";
    if (!renderer.gl.getExtension("EXT_color_buffer_float"))
        throw ("Error: your device does not support float framebuffer.");
    // if (!renderer.gl.getExtension("EXT_float_blend"))
    //     throw ("Error: your device does not support float framebuffer blending.");

    // state
    try {
        var initialState = localStorage.getItem(state.name);
        if (initialState != null) {
            var new_state = JSON.parse(initialState);
            resetState(new_state, false);
        }
        state.iTime = 0.0;
    }
    catch (e) {
        console.error(e);
        try { localStorage.removeItem(state.name); } catch (e) { console.error(e); }
    }
}

function updateBuffers() {
    let gl = renderer.gl;
    if (trainingData.recording) {
        state.width = canvas.width = trainingData.width;
        state.height = canvas.height = trainingData.height;
    }
    else {
        state.width = canvas.width = window.innerWidth;
        state.height = canvas.height = window.innerHeight;
    }

    var oldRenderTarget = renderer.renderTarget;
    renderer.renderTarget = createRenderTarget(gl, state.width, state.height, false, true, true);
    if (oldRenderTarget) destroyRenderTarget(gl, oldRenderTarget);

    var oldRenderTargetAccum = renderer.renderTargetAccum;
    renderer.renderTargetAccum = createRenderTarget(gl, state.width, state.height, false, true, true);
    if (oldRenderTargetAccum) destroyRenderTarget(gl, oldRenderTargetAccum);

    var oldRenderTargetAlbedo = renderer.renderTargetAlbedo;
    renderer.renderTargetAlbedo = createRenderTarget(gl, state.width, state.height, false, true, true);
    if (oldRenderTargetAlbedo) destroyRenderTarget(gl, oldRenderTargetAlbedo);

    var oldRenderTargetNormal = renderer.renderTargetNormal;
    renderer.renderTargetNormal = createRenderTarget(gl, state.width, state.height, false, true, true);
    if (oldRenderTargetNormal) destroyRenderTarget(gl, oldRenderTargetNormal);

    var oldExpandTarget = renderer.expandTarget;
    renderer.expandTarget = createRenderTarget(gl, state.width, state.height, false, true, true);
    if (oldExpandTarget) destroyRenderTarget(gl, oldExpandTarget);

    var oldDenoiseTarget = renderer.denoiseTarget;
    renderer.denoiseTarget = createRenderTarget(gl, state.width, state.height, false, true, true);
    if (oldDenoiseTarget) destroyRenderTarget(gl, oldDenoiseTarget);

    var oldTonemapTarget = renderer.tonemapTarget;
    renderer.tonemapTarget = createRenderTarget(gl, state.width, state.height, false, true, true);
    if (oldTonemapTarget) destroyRenderTarget(gl, oldTonemapTarget);

    state.renderNeeded = true;
}

// Initialize renderer, call updateShaderFunction() once before calling this
function initRenderer() {
    let canvas = renderer.canvas;
    let gl = renderer.gl;

    updateBuffers();

    // rendering
    var oldScreenCenter = { x: -1, y: -1 };
    var startTime = performance.now();
    var lastTimestamp = 0.0,
        prevRenderTimeError = 0.0,
        integralRenderTimeError = 0.0;
    function render(timestamp) {
        // frame rate controller (PID)
        let sSamples = Number(parameterToDict(RawParameters).sSamples);
        if (Math.round(Math.log2(sSamples)) != Math.log2(sSamples)) {
            let first = (integralRenderTimeError == 0.0 && prevRenderTimeError == 0.0);
            let renderTime = timestamp-lastTimestamp;
            renderTime = Math.max(renderTime, 2.0);
            lastTimestamp = timestamp;
            let expectedRenderTime = 1000 / sSamples;
            let renderTimeError = sSamples * (expectedRenderTime / renderTime - 1.0);
            if (first) prevRenderTimeError = renderTimeError;
            integralRenderTimeError += renderTimeError;
            let derivativeRenderTimeError = renderTimeError - prevRenderTimeError;
            prevRenderTimeError = renderTimeError;
            let controlSignal = 0.01 * renderTimeError
                + 0.0 * integralRenderTimeError
                + 0.02 * derivativeRenderTimeError;
            state.sSamples = state.sSamples==sSamples ? 1/64 : Number(state.sSamples);
            state.sSamples *= 1.0 + controlSignal;
            state.sSamples = Math.max(1/128, Math.min(state.sSamples, 64));
            // console.log(new Array(Math.round(Math.log2(state.sSamples*256)*4)).fill('*').join(''));
        }

        var timeDependent = true;
        try {
            timeDependent = /\(iTime\)/.test(updateShaderFunction.prevCode.renderSource);
        } catch (e) { }
        if (timeDependent && state.iTime == -1.0)
            startTime = performance.now();
        var screenCenter = state.defaultScreenCenter ? calcScreenCenter() : state.screenCenter;
        state.screenCenter = screenCenter;
        if (screenCenter.x != oldScreenCenter.x || screenCenter.y != oldScreenCenter.y)
            state.renderNeeded = true;
        // if (state.renderNeeded)
        if (state.renderNeeded && !trainingData.recording)
            state.iFrame = 0, state.iSpp = 0.0;
        if (state.iSpp < Number(state.sSpp)) {
            if (trainingData.recording) {
                state.width = canvas.width = trainingData.width;
                state.height = canvas.height = canvas.style.height = trainingData.height;
                canvas.style.width = state.width + "px";
                canvas.style.height = state.height + "px";
            }
            else {
                state.width = canvas.width = window.innerWidth;
                state.height = canvas.height = window.innerHeight;
                canvas.style.width = window.innerWidth + "px";
                canvas.style.height = window.innerHeight + "px";
            }
            try {
                localStorage.setItem(state.name, JSON.stringify(state));
            } catch (e) { console.error(e); }
            var transformMatrix = calcTransformMatrix(state, true, screenCenter);
            var lightDir = calcLightDirection(
                [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]],
                state.rTheta, state.rPhi);
            drawScene(state, transformMatrix, lightDir);
            renderLegend(state);
            if (timeDependent) {
                state.renderNeeded = true;
                state.iTime = 0.001 * (performance.now() - startTime);
            }
            else {
                state.renderNeeded = false;
                startTime = performance.now();
                state.iTime = -1.0;
            }
            state.iFrame += 1;
            state.iSpp += Number(state.sSamples);
        }
        oldScreenCenter = screenCenter;
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    // interactions
    var fingerDist = -1;
    canvas.addEventListener("wheel", function (event) {
        if (trainingData.recording) return;
        if (renderer.renderProgram == null)
            return;
        var sc = Math.exp(0.0002 * event.wheelDeltaY);
        state.scale *= sc;
        var params = parameterToDict(RawParameters);
        if (params.hasOwnProperty("bClipFixed") && !params.bClipFixed)
            for (var _ = 0; _ < 3; _++) state.clipSize[_] /= sc;
        state.renderNeeded = true;
    }, { passive: true });
    var mouseDown = false;
    canvas.addEventListener("contextmenu", function (event) {
        if (trainingData.recording) return;
        if (event.shiftKey) {
            console.log("Shift");
            event.preventDefault();
            state.defaultScreenCenter = true;
            state.renderNeeded = true;
        }
    });
    canvas.addEventListener("pointerdown", function (event) {
        //event.preventDefault();
        document.getElementById("help-menu").style.visibility = "hidden";
        canvas.setPointerCapture(event.pointerId);
        mouseDown = true;
    });
    window.addEventListener("pointerup", function (event) {
        event.preventDefault();
        mouseDown = false;
    });
    canvas.addEventListener("pointermove", function (event) {
        if (trainingData.recording) return;
        if (renderer.renderProgram == null)
            return;
        if (mouseDown) {
            var dx = event.movementX, dy = event.movementY;
            if (event.shiftKey) { // center
                state.defaultScreenCenter = false;
                state.screenCenter.x += 0.75 * dx / state.width;
                state.screenCenter.y -= 0.75 * dy / state.height;
            }
            else {  // rotate
                var k = fingerDist > 0. ? 0.001 : 0.01;
                state.rx += k * dy;
                state.rz += k * dx;
            }
            state.renderNeeded = true;
        }
    });
    canvas.addEventListener("touchstart", function (event) {
        if (trainingData.recording) return;
        if (event.touches.length == 2) {
            var fingerPos0 = [event.touches[0].pageX, event.touches[0].pageY];
            var fingerPos1 = [event.touches[1].pageX, event.touches[1].pageY];
            fingerDist = Math.hypot(fingerPos1[0] - fingerPos0[0], fingerPos1[1] - fingerPos0[1]);
        }
    }, { passive: true });
    canvas.addEventListener("touchend", function (event) {
        if (trainingData.recording) return;
        fingerDist = -1.0;
    }, { passive: true });
    canvas.addEventListener("touchmove", function (event) {
        if (trainingData.recording) return;
        if (renderer.renderProgram == null)
            return;
        if (event.touches.length == 2) {
            var fingerPos0 = [event.touches[0].pageX, event.touches[0].pageY];
            var fingerPos1 = [event.touches[1].pageX, event.touches[1].pageY];
            var newFingerDist = Math.hypot(fingerPos1[0] - fingerPos0[0], fingerPos1[1] - fingerPos0[1]);
            if (fingerDist > 0. && newFingerDist > 0.) {
                var sc = newFingerDist / fingerDist;
                sc = Math.max(Math.min(sc, 2.0), 0.5);
                state.scale *= sc;
                var params = parameterToDict(RawParameters);
                if (params.hasOwnProperty("bClipFixed") && !params.bClipFixed)
                    for (var _ = 0; _ < 3; _++) state.clipSize[_] /= sc;
            }
            fingerDist = newFingerDist;
            state.renderNeeded = true;
        }
    }, { passive: true });
    window.addEventListener("resize", function (event) {
        if (trainingData.recording) return;
        updateBuffers();
    });
    document.getElementById("fps").addEventListener("click", function () {
        state.iTime = -1.0;
    });
}

function updateShaderFunction(funCode, funGradCode, params) {
    let gl = renderer.gl;

    function sub(shaderSource) {
        shaderSource = shaderSource.replaceAll("{%FUN%}", funCode);
        shaderSource = shaderSource.replaceAll("{%FUNGRAD%}", funGradCode);
        shaderSource = shaderSource.replaceAll("{%HZ%}", params.sHz);
        shaderSource = shaderSource.replaceAll("{%CLIP%}", Number(params.sClip));
        shaderSource = shaderSource.replaceAll("{%LIGHT_PATH_DEPTH%}", Number(params.sLightPathDepth));
        shaderSource = shaderSource.replaceAll("{%MIS%}", params.cMis);
        shaderSource = shaderSource.replaceAll("{%CLOSED%}", Number(params.cClosed));
        shaderSource = shaderSource.replaceAll("{%FIELD%}", params.sField);
        shaderSource = shaderSource.replaceAll("{%STEP_SIZE%}", params.sStep);
        shaderSource = shaderSource.replaceAll("{%TRANSPARENCY%}", Number(params.bTransparency));
        shaderSource = shaderSource.replaceAll("{%LIGHT_THEME%}", Number(params.bLight));
        shaderSource = shaderSource.replaceAll("{%COLOR%}", params.sColor);
        shaderSource = shaderSource.replaceAll("{%Y_UP%}", Number(params.bYup));
        shaderSource = shaderSource.replaceAll("{%GRID%}", Number(params.bGrid));
        shaderSource = shaderSource.replaceAll("{%DISCONTINUITY%}", Number(params.bDiscontinuity));
        shaderSource = shaderSource.replaceAll("{%CONTOUR_LINEAR%}", Number(params.bContourLinear));
        shaderSource = shaderSource.replaceAll("{%CONTOUR_LOG%}", Number(params.bContourLog));
        shaderSource = shaderSource.replaceAll("{%TONEMAP%}", params.sTonemap);
        return shaderSource;
    }

    // parsing error
    if (funCode == null) {
        if (renderer.renderProgram != null) {
            gl.deleteProgram(renderer.renderProgram);
            renderer.renderProgram = null;
        }
        return;
    }

    // cache code
    if (updateShaderFunction.prevCode == undefined)
        updateShaderFunction.prevCode = {
            renderSource: "",
            postSource: "",
            tonemapSource: "",
        };
    var prevCode = updateShaderFunction.prevCode;
    var renderSource = sub(renderer.renderSource);
    var tonemapSource = sub(renderer.tonemapSource);

    console.time("compile shader");

    // render program
    if (prevCode.renderSource != renderSource || renderer.renderProgram == null) {
        if (renderer.renderProgram != null) {
            gl.deleteProgram(renderer.renderProgram);
            renderer.renderProgram = null;
        }
        renderer.renderProgram = createShaderProgram(gl, null, renderSource);
        prevCode.renderSource = renderSource;
    }
    if (prevCode.tonemapSource != tonemapSource || renderer.tonemapProgram == null) {
        if (renderer.tonemapProgram != null) {
            gl.deleteProgram(renderer.tonemapProgram);
            renderer.tonemapProgram = null;
        }
        renderer.tonemapProgram = createShaderProgram(gl, null, tonemapSource);
        prevCode.tonemapSource = tonemapSource;
    }

    if (!renderer.copyProgram)
        renderer.copyProgram = createShaderProgram(gl, null, renderer.copySource);
    if (!renderer.expandProgram)
        renderer.expandProgram = createShaderProgram(gl, null, renderer.expandSource);
    if (!renderer.postProgram)
        renderer.postProgram = createShaderProgram(gl, null, renderer.postSource);

    console.timeEnd("compile shader");
    state.renderNeeded = true;
}


function recordTrainingData(spp=[1/64, 16384], noise_th=0.01) {

    // recorded data format:
    // 4 bytes header length + header (JSON) + raw data
    // header: { state: {}, transform, buffers: [{ name, byte_offset, byte_length, type, shape }] }
    // name: number for spp, string for auxiliary buffer

    if (trainingData.state == "unstarted") {
        trainingData.recording = true;
        updateBuffers();
        trainingData.sppRange = typeof spp == "number" ?
            { min: 1, max: spp } : { min: spp[0], max: spp[1] };
        trainingData.spp = trainingData.sppRange.min;
        trainingData.bufferFrames = [];
        trainingData.bufferView = [];
        trainingData.byteOffset = 0;
        state.sSpp = trainingData.spp;
        state.sSamples = Math.min(state.sSpp, trainingData.sSamples);
        state.iFrame = 0, state.iSpp = 0.0;
        renderer.uOutput = 0;
        trainingData.state = "wait";
        setTimeout(recordTrainingData, 100);
    }

    else if (trainingData.state == "wait") {
        if (state.iSpp < trainingData.spp) {
            setTimeout(recordTrainingData, 100);
            return;
        }
        console.log(renderer.uOutput == 0 ?
            trainingData.spp + " spp" :
            { 1: 'albedo', 2: 'normal', 3: 'position' }[renderer.uOutput]);

        let gl = renderer.gl;
        var npixels = state.width*state.height;
        var pixels0 = new Float32Array(4*npixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.renderTargetAccum.framebuffer);
        gl.readPixels(0, 0, state.width, state.height, gl.RGBA, gl.FLOAT, pixels0);
        var pixels1 = new Float32Array(4*npixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.renderTarget.framebuffer);
        gl.readPixels(0, 0, state.width, state.height, gl.RGBA, gl.FLOAT, pixels1);
        var pixels = new Float32Array(3*npixels);
        var totc3 = 0.0;
        var scale = Math.max(trainingData.spp/trainingData.sSamples, 1.0);
        for (var i = 0; i < npixels; i++) {
            var c = [
                pixels0[4*i+0] + pixels1[4*i+0],
                pixels0[4*i+1] + pixels1[4*i+1],
                pixels0[4*i+2] + pixels1[4*i+2],
                pixels0[4*i+3] + pixels1[4*i+3]
            ];
            totc3 += pixels1[4*i+3];
            pixels[0*npixels+i] = c[0] / scale;
            pixels[1*npixels+i] = c[1] / scale;
            pixels[2*npixels+i] = c[2] / scale;
        }
        trainingData.bufferView.push({
            name: trainingData.spp,
            byte_offset: trainingData.byteOffset,
            byte_length: 4*pixels.length,
            type: 'float32',
            shape: [3, trainingData.height, trainingData.width]
        });
        trainingData.bufferFrames.push(pixels);
        trainingData.byteOffset += 4*pixels.length;

        // termination criteria
        var terminate = trainingData.spp >= trainingData.sppRange.max;
        if (!terminate && trainingData.bufferFrames.length > 1) {
            // by variance
            var pixels_ = trainingData.bufferFrames[trainingData.bufferFrames.length-2];
            var sumerr = 0.0;
            for (var i = 0; i < pixels.length; i++) {
                var p0 = Math.pow(Math.max(pixels_[i],0.0), 1.0);  // gamma
                var p1 = Math.pow(Math.max(pixels[i],0.0), 1.0);
                p0 = 1.019*p0/(p0+0.155);  // tonemap
                p1 = 1.019*p1/(p1+0.155);
                var dif = p1-p0;
                if (isFinite(dif) && Math.abs(dif) < 1e6)
                    sumerr += dif*dif;
            }
            var rmse = Math.sqrt(sumerr/pixels.length);
            if (rmse < 1.732 * noise_th)  // assume half variance after
                terminate = true;
            console.log("rmse", rmse);
        }
        if (terminate) {
            state.sSpp = 1;
            state.sSamples = 1;
            state.iFrame = 0, state.iSpp = 0.0;
            trainingData.state = "finished";
            setTimeout(recordTrainingData, 10);
            return;
        }
        trainingData.spp *= 2;
        state.sSpp = trainingData.spp;
        state.sSamples = Math.min(state.sSpp, trainingData.sSamples);
        state.iFrame = 0, state.iSpp = 0.0;
        setTimeout(recordTrainingData, 10);
    }

    else if (trainingData.state == "finished") {
        trainingData.recording = false;
        trainingData.state = "unstarted";
        updateBuffers();
        state.sSamples = 1;
        state.renderNeeded = true;

        let transform = mat4Transpose(
            calcTransformMatrix(state, false, state.screenCenter));
        let header = JSON.stringify({
            state: getState(),
            transform: transform,
            buffers: trainingData.bufferView
        });
        while (header.length % 4)
            header += " ";
        let concatenatedArray = concatTypedArrayComponents(
            [
                header.length,
                header,
            ].concat(trainingData.bufferFrames)
        );
        let binaryData = concatenatedArray.buffer;
        let blob = new Blob([binaryData], { type: 'application/octet-stream' });
        let spp = trainingData.spp;
        let hash = Math.floor(Math.random()*0xFFFFFFFFFFFF).toString(16).padStart(12, '0');
        let fileName = "implicit3-rt_" + hash + "_" + spp + ".bin";
        let downloadLink = document.createElement('a');
        downloadLink.href = window.URL.createObjectURL(blob);
        downloadLink.download = fileName;
        downloadLink.click();
    }

}

// Before running this:
//  - Set browser download to auto save to specific folder
//  - Allow downloading multiple files
//  - Ctrl + / to hide control panel

// Example: recordTrainingDataList(builtinStates.map(_ => _.state))

function recordTrainingDataList(
    stateList, spp=[1/64, 16384], noise_th=0.01
) {
    if (!stateList.length)
        return;

    let timeoutFunction = () => recordTrainingDataList(stateList, spp, noise_th);

    if (trainingData.listIndex == -1) {
        trainingData.listIndex = 0;
        for (var state of stateList)
            state.params.sDenoise = "null";
        setState(stateList[0]);
        trainingData.recording = true;
        recordTrainingData(spp, noise_th);
        setTimeout(timeoutFunction, 1000);
    }

    else {
        if (trainingData.recording) {
            setTimeout(timeoutFunction, 1000);
            return;
        }
        trainingData.listIndex += 1;
        console.log("Recorded ", trainingData.listIndex, "/", stateList.length);
        if (trainingData.listIndex >= stateList.length) {
            console.log("Dataset recording complete.");
            trainingData.listIndex = -1;
            return;
        }
        setState(stateList[trainingData.listIndex]);
        trainingData.recording = true;
        recordTrainingData(spp, noise_th);
        setTimeout(timeoutFunction, 1000);
    }

}
