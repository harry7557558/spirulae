"use strict";

var renderer = {
    canvas: null,
    gl: null,
    vsSource: "",
    premarchSource: "",
    poolSource: "",
    raymarchSource: "",
    imgGradSource: "",
    aaSource: "",
    positionBuffer: null,
    premarchProgram: null,
    premarchTarget: null,
    poolProgram: null,
    poolTarget: null,
    raymarchProgram: null,
    antiAliaser: null,
    timerExt: null,
};

// call this function to re-render
async function drawScene(state, transformMatrix, lightDir) {
    if (renderer.raymarchProgram == null) {
        renderer.canvas.style.cursor = "not-allowed";
        return;
    }
    else renderer.canvas.style.cursor = "default";
    let gl = renderer.gl;
    let antiAliaser = renderer.antiAliaser;

    // set position buffer for vertex shader
    function setPositionBuffer(program) {
        var vpLocation = gl.getAttribLocation(program, "vertexPosition");
        const numComponents = 2; // pull out 2 values per iteration
        const type = gl.FLOAT; // the data in the buffer is 32bit floats
        const normalize = false; // don't normalize
        const stride = 0; // how many bytes to get from one set of values to the next
        const offset = 0; // how many bytes inside the buffer to start from
        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.positionBuffer);
        gl.vertexAttribPointer(
            vpLocation,
            numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray(vpLocation);
    }

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

    // clear the canvas
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // premarch
    gl.viewport(0, 0, state.premarchWidth, state.premarchHeight);
    gl.useProgram(renderer.premarchProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.premarchTarget.framebuffer);
    setPositionBuffer(renderer.premarchProgram);
    gl.uniform1f(gl.getUniformLocation(renderer.premarchProgram, "ZERO"), 0.0);
    gl.uniformMatrix4fv(
        gl.getUniformLocation(renderer.premarchProgram, "transformMatrix"),
        false,
        mat4ToFloat32Array(transformMatrix));
    gl.uniform1f(gl.getUniformLocation(renderer.premarchProgram, "iTime"), state.iTime);
    gl.uniform2f(gl.getUniformLocation(renderer.premarchProgram, "screenCenter"),
        state.screenCenter[0], state.screenCenter[1]);
    gl.uniform1f(gl.getUniformLocation(renderer.premarchProgram, "rZScale"), calcZScale());
    gl.uniform3f(gl.getUniformLocation(renderer.premarchProgram, "uClipBox"),
        state.clipSize[0], state.clipSize[1], state.clipSize[2]);
    renderPass();

    // pooling
    gl.useProgram(renderer.poolProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.poolTarget.framebuffer);
    setPositionBuffer(renderer.poolProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderer.premarchTarget.texture);
    gl.uniform1i(gl.getUniformLocation(renderer.poolProgram, "iChannel0"), 0);
    gl.uniform2i(gl.getUniformLocation(renderer.poolProgram, "iResolution"),
        state.premarchWidth, state.premarchHeight);
    renderPass();

    // render image
    gl.viewport(0, 0, state.width, state.height);
    gl.useProgram(renderer.raymarchProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, antiAliaser.renderFramebuffer);
    setPositionBuffer(renderer.raymarchProgram);
    gl.uniform1f(gl.getUniformLocation(renderer.raymarchProgram, "ZERO"), 0.0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderer.poolTarget.texture);
    gl.uniform1i(gl.getUniformLocation(renderer.raymarchProgram, "iChannel0"), 0);
    gl.uniformMatrix4fv(
        gl.getUniformLocation(renderer.raymarchProgram, "transformMatrix"),
        false,
        mat4ToFloat32Array(transformMatrix));
    gl.uniform1f(gl.getUniformLocation(renderer.raymarchProgram, "iTime"), state.iTime);
    gl.uniform2f(gl.getUniformLocation(renderer.raymarchProgram, "screenCenter"),
        state.screenCenter[0], state.screenCenter[1]);
    gl.uniform1f(gl.getUniformLocation(renderer.raymarchProgram, "uScale"), state.scale);
    gl.uniform3f(gl.getUniformLocation(renderer.raymarchProgram, "uClipBox"),
        state.clipSize[0], state.clipSize[1], state.clipSize[2]);
    gl.uniform3f(gl.getUniformLocation(renderer.raymarchProgram, "LDIR"),
        lightDir[0], lightDir[1], lightDir[2]);
    gl.uniform1f(gl.getUniformLocation(renderer.raymarchProgram, "rZScale"), calcZScale());
    gl.uniform1f(gl.getUniformLocation(renderer.raymarchProgram, "rBrightness"), state.rBrightness);
    renderPass();

    // render image gradient
    gl.useProgram(antiAliaser.imgGradProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, antiAliaser.imgGradFramebuffer);
    setPositionBuffer(antiAliaser.imgGradProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, antiAliaser.renderTexture);
    gl.uniform1i(gl.getUniformLocation(antiAliaser.imgGradProgram, "iChannel0"), 0);
    renderPass();

    // render anti-aliasing
    gl.useProgram(antiAliaser.aaProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    setPositionBuffer(antiAliaser.aaProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, antiAliaser.renderTexture);
    gl.uniform1i(gl.getUniformLocation(antiAliaser.aaProgram, "iChannel0"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, antiAliaser.imgGradTexture);
    gl.uniform1i(gl.getUniformLocation(antiAliaser.aaProgram, "iChannel1"), 1);
    renderPass();

    if (!countIndividualTime && timer != null)
        gl.endQuery(timer.TIME_ELAPSED_EXT);

    // check timer
    function checkTime() {
        let fpsDisplay = document.getElementById("fps");
        if (timer == null) {
            for (var i = 0; i < timerQueries.length; i++)
                gl.deleteQuery(timerQueries[i]);
            fpsDisplay.innerHTML = state.iTime >= 0.0 ? state.iTime.toFixed(2) + " s" : "";
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
            state.iTime >= 0.0 ? state.iTime.toFixed(2) + " s - " : "") +
            (1000.0 / totTime).toFixed(1) + " fps";
    }
    setTimeout(checkTime, 100);
}


// ============================ MAIN ==============================

var state = {
    name: "",
    width: window.innerWidth,
    height: window.innerHeight,
    screenCenter: [0.0, 0.0],
    defaultScreenCenter: true,
    iTime: -1.0,
    rz: null,
    rx: null,
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
        throw ("Error: Your browser may not support WebGL2, which is required to run this tool.<br/>It is recommended to use a Chrome-based browser on a desktop device with an updated graphics driver.");
    canvas.addEventListener("webglcontextlost", function (event) {
        event.preventDefault();
        document.body.innerHTML = "<h1 style='color:red;'>Error: WebGL context lost. Please refresh this page.</h1>";
    });

    // load GLSL source
    console.time("load glsl code");
    renderer.vsSource = "#version 300 es\nin vec4 vertexPosition;out vec2 vXy;" +
        "void main(){vXy=vertexPosition.xy;gl_Position=vertexPosition;}";
    renderer.premarchSource = getShaderSource("frag-premarch.glsl");
    renderer.poolSource = getShaderSource("../shaders/frag-pool.glsl");
    renderer.raymarchSource = getShaderSource("frag-raymarch.glsl");
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
    state.width = canvas.width = canvas.style.width = window.innerWidth;
    state.height = canvas.height = canvas.style.height = window.innerHeight;
    state.premarchWidth = Math.round(state.width / 4);
    state.premarchHeight = Math.round(state.height / 4);

    var oldPremarchTarget = renderer.premarchTarget;
    renderer.premarchTarget = createRenderTarget(gl, state.premarchWidth, state.premarchHeight);
    if (oldPremarchTarget) destroyRenderTarget(gl, oldPremarchTarget);

    var oldPoolTarget = renderer.poolTarget;
    renderer.poolTarget = createRenderTarget(gl, state.premarchWidth, state.premarchHeight);
    if (oldPoolTarget) destroyRenderTarget(gl, oldPoolTarget);

    var oldAntiAliaser = renderer.antiAliaser;
    renderer.antiAliaser = createAntiAliaser(gl, state.width, state.height, false);
    if (oldAntiAliaser) destroyAntiAliaser(gl, oldAntiAliaser);

    state.renderNeeded = true;
}

// Initialize renderer, call updateShaderFunction() once before calling this
function initRenderer() {
    let canvas = renderer.canvas;
    let gl = renderer.gl;

    updateBuffers();

    // rendering
    var oldScreenCenter = [-1, -1];
    var startTime = performance.now();
    function render() {
        var timeDependent = true;
        try {
            timeDependent = /\(iTime\)/.test(updateShaderFunction.prevCode.raymarchSource);
        } catch (e) { }
        if (timeDependent && state.iTime == -1.0)
            startTime = performance.now();
        var screenCenter = state.defaultScreenCenter ? calcScreenCenter() : state.screenCenter;
        state.screenCenter = screenCenter;
        if ((screenCenter[0] != oldScreenCenter[0] || screenCenter[1] != oldScreenCenter[1])
            || state.renderNeeded) {
            state.width = canvas.width = canvas.style.width = window.innerWidth;
            state.height = canvas.height = canvas.style.height = window.innerHeight;
            try {
                localStorage.setItem(state.name, JSON.stringify(state));
            } catch (e) { console.error(e); }
            var transformMatrix = calcTransformMatrix(state);
            var lightDir = calcLightDirection(transformMatrix, state.rTheta, state.rPhi);
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
        }
        oldScreenCenter = screenCenter;
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    // interactions
    var fingerDist = -1;
    canvas.addEventListener("wheel", function (event) {
        if (renderer.raymarchProgram == null)
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
        if (renderer.raymarchProgram == null)
            return;
        if (mouseDown) {
            var dx = event.movementX, dy = event.movementY;
            if (event.shiftKey) { // center
                state.defaultScreenCenter = false;
                state.screenCenter[0] += 1.5 * dx / state.width;
                state.screenCenter[1] -= 1.5 * dy / state.height;
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
        if (event.touches.length == 2) {
            var fingerPos0 = [event.touches[0].pageX, event.touches[0].pageY];
            var fingerPos1 = [event.touches[1].pageX, event.touches[1].pageY];
            fingerDist = Math.hypot(fingerPos1[0] - fingerPos0[0], fingerPos1[1] - fingerPos0[1]);
        }
    }, { passive: true });
    canvas.addEventListener("touchend", function (event) {
        fingerDist = -1.0;
    }, { passive: true });
    canvas.addEventListener("touchmove", function (event) {
        if (renderer.raymarchProgram == null)
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
    window.addEventListener("resize", updateBuffers);
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
        return shaderSource;
    }

    // pooling program
    if (renderer.poolProgram == null) {
        var poolProgram = createShaderProgram(gl, renderer.vsSource, renderer.poolSource);
        renderer.poolProgram = poolProgram;
    }

    // parsing error
    if (funCode == null) {
        if (renderer.premarchProgram != null) {
            gl.deleteProgram(renderer.premarchProgram);
            renderer.premarchProgram = null;
        }
        if (renderer.raymarchProgram != null) {
            gl.deleteProgram(renderer.raymarchProgram);
            renderer.raymarchProgram = null;
        }
        return;
    }

    // cache code
    if (updateShaderFunction.prevCode == undefined)
        updateShaderFunction.prevCode = {
            premarchSource: "",
            raymarchSource: ""
        };
    var prevCode = updateShaderFunction.prevCode;
    var premarchSource = sub(renderer.premarchSource);
    var raymarchSource = sub(renderer.raymarchSource);

    console.time("compile shader");

    // premarching program
    if (prevCode.premarchSource != premarchSource || renderer.premarchProgram == null) {
        if (renderer.premarchProgram != null) {
            gl.deleteProgram(renderer.premarchProgram);
            renderer.premarchProgram = null;
        }
        try {
            renderer.premarchProgram = createShaderProgram(gl, renderer.vsSource, premarchSource);
        }
        catch (e) { console.error(e); }
        prevCode.premarchSource = premarchSource;
    }

    // raymarching program
    if (prevCode.raymarchSource != raymarchSource || renderer.raymarchProgram == null) {
        if (renderer.raymarchProgram != null) {
            gl.deleteProgram(renderer.raymarchProgram);
            renderer.raymarchProgram = null;
        }
        try {
            renderer.raymarchProgram = createShaderProgram(gl, renderer.vsSource, raymarchSource);
        }
        catch (e) { console.error(e); }
        prevCode.raymarchSource = raymarchSource;
    }

    console.timeEnd("compile shader");
    state.renderNeeded = true;
}