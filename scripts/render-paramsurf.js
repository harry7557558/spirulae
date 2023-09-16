"use strict";

var renderer = {
    canvas: null,
    gl: null,
    vsSource: "",
    fsSource: "",
    imgGradSource: "",
    aaSource: "",
    positionBuffer: null,
    uN: 241,
    vN: 241,
    uvBuffer: null,
    indiceBuffer: null,
    shaderProgram: null,
    antiAliaser: null,
    timerExt: null,
};

function setWidthHeight() {
    let control = document.getElementById("control");
    var width = window.innerWidth, height = window.innerHeight;
    canvas.style.width = width, canvas.style.height = height;
    var s = Math.max(512.0 / Math.max(
        width - control.clientWidth,
        height - control.clientHeight
    ), 1.0);
    state.width = canvas.width = s * width;
    state.height = canvas.height = s * height;
}

// call this function to re-render
async function drawScene(screenCenter, transformMatrix, lightDir) {
    if (renderer.shaderProgram == null) {
        renderer.canvas.style.cursor = "not-allowed";
        return;
    }
    else renderer.canvas.style.cursor = "default";
    let gl = renderer.gl;
    let antiAliaser = renderer.antiAliaser;
    let parameters = parameterToDict(RawParameters);

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

    // render image
    gl.viewport(0, 0, state.width, state.height);
    gl.useProgram(renderer.shaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, antiAliaser.renderFramebuffer);
    var col = parameters.bLight ?
        [0.82, 0.8, 0.78] : [4e-4, 5e-4, 6e-4];
    var gamma = 1.0 / 2.2;
    gl.clearColor(
        Math.pow(col[0], gamma),
        Math.pow(col[1], gamma),
        Math.pow(col[2], gamma), 1.0);
    if (parameters.bXray) {
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        if (parameters.bLight)
            gl.blendFunc(gl.ZERO, gl.SRC_COLOR);  // multiply
        else
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR); // 1-(1-s)(1-d)
    }
    else {
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.depthFunc(gl.LEQUAL);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.uvBuffer);
        let vertexPosition = gl.getAttribLocation(renderer.shaderProgram, "vertexPosition");
        gl.vertexAttribPointer(
            vertexPosition,
            numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray(vertexPosition);
    }
    gl.uniform1f(gl.getUniformLocation(renderer.shaderProgram, "ZERO"), 0.0);
    gl.uniformMatrix4fv(
        gl.getUniformLocation(renderer.shaderProgram, "transformMatrix"),
        false,
        mat4ToFloat32Array(transformMatrix));
    gl.uniform1f(gl.getUniformLocation(renderer.shaderProgram, "iTime"), state.iTime);
    gl.uniform2f(gl.getUniformLocation(renderer.shaderProgram, "screenCenter"),
        screenCenter.x, screenCenter.y);
    gl.uniform1f(gl.getUniformLocation(renderer.shaderProgram, "uScale"), state.scale);
    gl.uniform3f(gl.getUniformLocation(renderer.shaderProgram, "LDIR"),
        lightDir[0], lightDir[1], lightDir[2]);
    gl.uniform1f(gl.getUniformLocation(renderer.shaderProgram, "rBrightness"), state.rBrightness);

    if (countIndividualTime && timer != null) {
        let query = gl.createQuery();
        timerQueries.push(query);
        gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indiceBuffer);
    {
        const vertexCount = (renderer.uN - 1) * (renderer.vN - 1) * 6;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        const N = Number(parameters.sQuality);
        for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
            gl.uniform4f(gl.getUniformLocation(renderer.shaderProgram, "uvRange"),
                i / N, j / N, (i + 1) / N, (j + 1) / N);
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        }
    }
    if (countIndividualTime && timer != null)
        gl.endQuery(timer.TIME_ELAPSED_EXT);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

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
    screenCenter: { x: 0.5, y: 0.5 },
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
    return 1.0;
}

function initWebGL() {
    // get context
    renderer.canvas = document.getElementById("canvas");
    renderer.gl = canvas.getContext("webgl2", { antialias: false })
        || canvas.getContext("experimental-webgl2", { antialias: false });
    if (renderer.gl == null)
        throw ("Error: Your browser may not support WebGL2, which is required to run this tool.<br/>It is recommended to use a Chrome-based browser on a desktop device with an updated graphics driver.");
    canvas.addEventListener("webglcontextlost", function (event) {
        event.preventDefault();
        document.body.innerHTML = "<h1 style='color:red;'>Error: WebGL context lost. Please refresh this page.</h1>";
    });

    // load GLSL source
    console.time("load glsl code");
    renderer.vsSource = getShaderSource("vert.glsl");
    renderer.fsSource = getShaderSource("frag.glsl");
    console.timeEnd("load glsl code");

    // position buffer
    renderer.positionBuffer = renderer.gl.createBuffer();
    renderer.gl.bindBuffer(renderer.gl.ARRAY_BUFFER, renderer.positionBuffer);
    var positions = [-1, 1, 1, 1, -1, -1, 1, -1];
    renderer.gl.bufferData(renderer.gl.ARRAY_BUFFER, new Float32Array(positions), renderer.gl.STATIC_DRAW);

    // uv buffer
    renderer.uvBuffer = renderer.gl.createBuffer();
    renderer.gl.bindBuffer(renderer.gl.ARRAY_BUFFER, renderer.uvBuffer);
    let uN = renderer.uN, vN = renderer.vN;
    var uvs = new Array(uN * vN * 2);
    for (var ui = 0; ui < uN; ui++) {
        for (var vi = 0; vi < vN; vi++) {
            uvs[2 * ui * vN + 2 * vi] = ui / (uN - 1);
            uvs[2 * ui * vN + 2 * vi + 1] = vi / (vN - 1);
        }
    }
    renderer.gl.bufferData(renderer.gl.ARRAY_BUFFER,
        new Float32Array(uvs), renderer.gl.STATIC_DRAW);

    // indice buffer
    renderer.indiceBuffer = renderer.gl.createBuffer();
    renderer.gl.bindBuffer(renderer.gl.ELEMENT_ARRAY_BUFFER, renderer.indiceBuffer);
    var indices = new Array(6 * (uN - 1) * (vN - 1));
    for (var ui = 0; ui < uN - 1; ui++) {
        for (var vi = 0; vi < vN - 1; vi++) {
            var i = 6 * (ui * (vN - 1) + vi);
            indices[i + 0] = ui * vN + vi;
            indices[i + 1] = ui * vN + ((vi + 1) % vN);
            indices[i + 2] = ((ui + 1) % uN) * vN + vi;
            indices[i + 3] = ui * vN + ((vi + 1) % vN);
            indices[i + 4] = ((ui + 1) % uN) * vN + ((vi + 1) % vN);
            indices[i + 5] = ((ui + 1) % uN) * vN + vi;
        }
    }
    renderer.gl.bufferData(renderer.gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices), renderer.gl.STATIC_DRAW);


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
    setWidthHeight();

    let gl = renderer.gl;
    var oldAntiAliaser = renderer.antiAliaser;
    renderer.antiAliaser = createAntiAliaser(gl, state.width, state.height, true);
    if (oldAntiAliaser) destroyAntiAliaser(gl, oldAntiAliaser);

    state.renderNeeded = true;
}

// Initialize renderer, call updateShaderFunction() once before calling this
function initRenderer() {
    let canvas = renderer.canvas;
    let gl = renderer.gl;

    updateBuffers();

    // rendering
    var oldScreenCenter = { x: -1, y : -1 };
    var startTime = performance.now();
    function render() {
        var timeDependent = true;
        try {
            timeDependent = /\(iTime\)/.test(updateShaderFunction.prevCode.vsSource);
        } catch (e) { }
        if (timeDependent && state.iTime == -1.0)
            startTime = performance.now();
        var screenCenter = state.defaultScreenCenter ? calcScreenCenter() : state.screenCenter;
        state.screenCenter = screenCenter;
        if ((screenCenter.x != oldScreenCenter.x || screenCenter.y != oldScreenCenter.y)
            || state.renderNeeded) {
            setWidthHeight();
            try {
                localStorage.setItem(state.name, JSON.stringify(state));
            } catch (e) { console.error(e); }
            var transformMatrix = calcTransformMatrix(state, false);
            var lightDir = calcLightDirection(
                calcTransformMatrix(state, true), state.rTheta, state.rPhi);
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
        if (renderer.shaderProgram == null)
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
        if (renderer.shaderProgram == null)
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
        if (renderer.shaderProgram == null)
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
    state.renderNeeded = true;  // update cursor

    function sub(shaderSource) {
        shaderSource = shaderSource.replaceAll("{%FUN%}", funCode);
        shaderSource = shaderSource.replaceAll("{%FUNGRAD%}", funGradCode);
        shaderSource = shaderSource.replaceAll("{%LIGHT_THEME%}", Number(params.bLight));
        shaderSource = shaderSource.replaceAll("{%COLOR%}", params.sColor);
        shaderSource = shaderSource.replaceAll("{%XRAY%}", Number(params.bXray));
        shaderSource = shaderSource.replaceAll("{%Y_UP%}", Number(params.bYup));
        shaderSource = shaderSource.replaceAll("{%GRID%}", Number(params.sGrid));
        shaderSource = shaderSource.replaceAll("{%DISCONTINUITY%}", Number(params.bDiscontinuity));
        return shaderSource;
    }

    // parsing error
    if (funCode == null) {
        if (renderer.shaderProgram != null) {
            gl.deleteProgram(renderer.shaderProgram);
            renderer.shaderProgram = null;
        }
        return;
    }

    // cache code
    if (updateShaderFunction.prevCode == undefined)
        updateShaderFunction.prevCode = {
            vsSource: "",
            fsSource: ""
        };
    var prevCode = updateShaderFunction.prevCode;
    var vsSource = sub(renderer.vsSource);
    var fsSource = sub(renderer.fsSource);

    console.time("compile shader");

    if (prevCode.vsSource != vsSource || prevCode.fsSource != fsSource
        || renderer.shaderProgram == null) {
        if (renderer.shaderProgram != null) {
            gl.deleteProgram(renderer.shaderProgram);
            renderer.shaderProgram = null;
        }
        try {
            renderer.shaderProgram = createShaderProgram(gl, vsSource, fsSource);
        }
        catch (e) { console.error(e); }
        prevCode.vsSource = vsSource;
        prevCode.fsSource = fsSource;
    }

    console.timeEnd("compile shader");
}