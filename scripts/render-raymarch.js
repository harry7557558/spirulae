"use strict";


// calculate the center of the screen excluding the control box
function calcScreenCenter() {
    let rect = document.getElementById("control").getBoundingClientRect();
    var w = window.innerWidth, h = window.innerHeight;
    var rl = rect.left, rb = h - rect.bottom;
    var cx = 0.5 * w, cy = 0.5 * h;
    if (rl > rb && rl > 0) cx = 0.5 * rl;
    else if (rb > 0) cy = 0.5 * rb;
    var com = [2.0 * (cx / w - 0.5), 2.0 * (cy / h - 0.5)];
    com[0] = Math.max(-0.6, Math.min(0.6, com[0]));
    com[1] = Math.max(-0.6, Math.min(0.6, com[1]));
    return com;
}

function calcTransformMatrix(state, inverse = true) {
    var sc = (state.height / Math.min(state.width, state.height)) / state.scale;
    var transformMatrix = mat4Perspective(
        0.25 * Math.PI,
        canvas.width / canvas.height,
        0.5 * sc, 10.0 * sc);
    transformMatrix = mat4Translate(transformMatrix, [0, 0, -3.0 * sc]);
    transformMatrix = mat4Rotate(transformMatrix, state.rx, [1, 0, 0]);
    transformMatrix = mat4Rotate(transformMatrix, state.rz, [0, 0, 1]);
    if (!inverse) return transformMatrix;
    return mat4Inverse(transformMatrix);
}

function calcLightDirection(transformMatrix, lightTheta, lightPhi) {
    function dot(u, v) { return u[0] * v[0] + u[1] * v[1] + u[2] * v[2]; }
    // get uvw vectors
    var uvw = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            uvw[i][j] = (transformMatrix[i][j] + transformMatrix[3][j]) / (transformMatrix[i][3] + transformMatrix[3][3]);
        }
    }
    var u = uvw[0], v = uvw[1], w = uvw[2];
    // orthogonalize and normalize the vectors
    var d = dot(w, w);
    for (var i = 0; i < 3; i++) w[i] /= Math.sqrt(d);
    for (var i = 0; i < 2; i++) {
        d = dot(uvw[i], w);
        for (var j = 0; j < 3; j++) uvw[i][j] -= w[j] * d;
        d = dot(uvw[i], uvw[i]);
        for (var j = 0; j < 3; j++) uvw[i][j] /= Math.sqrt(d);
        // note that u and v are not orthonogal due to translation of COM in the matrix
    }
    // calculate light direction
    var ku = Math.cos(lightTheta) * Math.sin(lightPhi);
    var kv = Math.sin(lightTheta) * Math.sin(lightPhi);
    var kw = -Math.cos(lightPhi);
    var l = [0, 0, 0];
    for (var i = 0; i < 3; i++)
        l[i] = ku * u[i] + kv * v[i] + kw * w[i];
    return l;
}

// set legend
function renderLegend(state) {
    // calculate axis length
    const targetLength = 36;
    var targetL = targetLength / (0.5 * Math.min(state.width, state.height) * state.scale);
    var expi = Math.floor(Math.log10(targetL));
    var l = Math.pow(10, expi);
    if (l / targetL < 0.2) l *= 5.0;
    if (l / targetL < 0.5) l *= 2.0;
    // get information
    let axes = [
        document.getElementById("axis-x"),
        document.getElementById("axis-y"),
        document.getElementById("axis-z")
    ];
    let yup_checkbox = document.getElementById("checkbox-yup");
    let yup = yup_checkbox && yup_checkbox.checked;
    let mat = calcTransformMatrix(state, false);
    // set axes
    let ij = yup ? [0, 2, -1] : [0, 1, 2];
    for (var i = 0; i < 3; i++) {
        var j = Math.abs(ij[i]);
        var s = l * Math.sign(ij[i] + 1e-6);
        s *= Math.min(i == 2 ? calcZScale() : 1.0, 10.);
        var m = s * mat[j][3] + mat[3][3];
        var x = (s * mat[j][0] + mat[3][0]) / m * (0.5 * state.width);
        var y = (s * mat[j][1] + mat[3][1]) / m * (0.5 * state.height);
        var z = (s * mat[j][2] + mat[3][2]) / m;
        if (!(z > 0. && z < 1.)) x = y = 0.;
        axes[i].setAttribute("x2", x);
        axes[i].setAttribute("y2", -y);
    }
    // set legend
    function toSuperscript(num) {
        num = "" + num;
        var res = "";
        for (var i = 0; i < num.length; i++) {
            if (num[i] == "-") res += "⁻";
            else res += "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(num[i])];
        }
        return res;
    }
    if (l >= 1e4 || l < 1e-3)
        l = Math.round(l * Math.pow(10, -expi)) + "×10" + toSuperscript(expi);
    document.getElementById("legend-text").textContent = l;
}

// ============================ WEBGL ==============================

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
async function drawScene(screenCenter, transformMatrix, lightDir) {
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
        screenCenter[0], screenCenter[1]);
    gl.uniform1f(gl.getUniformLocation(renderer.premarchProgram, "rZScale"), calcZScale());
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
        screenCenter[0], screenCenter[1]);
    gl.uniform1f(gl.getUniformLocation(renderer.raymarchProgram, "uScale"), state.scale);
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
        if (timerQueries.length == 0) return;
        if (timer == null) {
            for (var i = 0; i < timerQueries.length; i++)
                gl.deleteQuery(timerQueries[i]);
            return;
        }
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
        var timeMsg = (1000.0 / totTime).toFixed(1) + " fps";
        if (state.iTime >= 0.0)
            timeMsg += " - " + state.iTime.toFixed(2) + " s";
        document.getElementById("fps").innerHTML = timeMsg;
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
        renderNeeded: true
    };
    for (var key in state1) {
        if (overwrite || !loaded_state.hasOwnProperty(key))
            loaded_state[key] = state1[key];
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
    renderer.gl = canvas.getContext("webgl2") || canvas.getContext("experimental-webgl2");
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
    else {
        document.getElementById("fps").style.display = "none";
        console.warn("Timer unavailable.");
    }

    // state
    try {
        var initialState = localStorage.getItem(state.name);
        if (initialState != null) {
            var new_state = JSON.parse(initialState);
            resetState(new_state, false);
        }
        new_state.iTime = 0.0;
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
    renderer.antiAliaser = createAntiAliaser(gl, state.width, state.height);
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
        let timeDependent = /m[fc]_const\(iTime\)/.test(updateShaderFunction.prevCode.raymarchSource);
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
            drawScene(screenCenter, transformMatrix, lightDir);
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
                state.scale *= Math.max(Math.min(sc, 2.0), 0.5);
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