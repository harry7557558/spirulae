"use strict";


// Viewport state

var state = {
    name: "",
    width: window.innerWidth,
    height: window.innerHeight,
    xmin: NaN,
    xmax: NaN,
    ymin: NaN,
    ymax: NaN,
    iTime: -1.0,
    renderNeeded: true
};
function resetState(loaded_state = {}, overwrite = true) {
    var state1 = {
        name: state.name,
        width: window.innerWidth,
        height: window.innerHeight,
        renderNeeded: true
    };
    var xym = calcXyMinMax();
    for (var key in xym) state1[key] = xym[key];
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

// calculate the default bound points
function calcXyMinMax() {
    var center = calcScreenCenter();
    var w = window.innerWidth, h = window.innerHeight;
    var sc = 2.5 / Math.min(w, h);
    return {
        xmin: -center.x * (2.0 * sc * w),
        xmax: (1.0 - center.x) * (2.0 * sc * w),
        ymin: -center.y * (2.0 * sc * h),
        ymax: (1.0 - center.y) * (2.0 * sc * h)
    };
}

// mouse/wheel interactions
function translateState(movementXy) {
    var dx = movementXy.x / state.width * (state.xmax - state.xmin);
    var dy = -movementXy.y / state.height * (state.ymax - state.ymin);
    state.xmin -= dx, state.xmax -= dx;
    state.ymin -= dy, state.ymax -= dy;
}
// scale the viewport about a point on the graph
function scaleState(mouseXy, sc) {
    if (typeof sc == 'number') sc = { x: sc, y: sc };
    var x = state.xmin + (state.xmax - state.xmin) * mouseXy.x / state.width;
    var y = state.ymin + (state.ymax - state.ymin) * (1.0 - mouseXy.y / state.height);
    state.xmin = x + (state.xmin - x) * sc.x;
    state.xmax = x + (state.xmax - x) * sc.x;
    state.ymin = y + (state.ymin - y) * sc.y;
    state.ymax = y + (state.ymax - y) * sc.y;
}
// call this after window resizing
function resizeState() {
    var width = window.innerWidth, height = window.innerHeight;
    if (!((state.xmax - state.xmin) * (state.ymax - state.ymin) > 0)) {
        var sc = Math.sqrt(width * height);
        state.xmin = -(state.xmax = 10. * width / sc);
        state.ymin = -(state.ymax = 10. * height / sc);
    }
    else if (width > 50 && height > 50 && state.width > 50 && state.height > 50) {
        var sc = Math.sqrt(state.width * state.height) / Math.sqrt(width * height);
        var c = calcScreenCenter();
        var ratio = ((state.ymax - state.ymin) / state.height)
            / ((state.xmax - state.xmin) / state.width);  // keep aspect ratio after floating point accuracy loss
        scaleState(
            { x: c.x * state.width, y: c.y * state.height },
            {
                x: sc * width / state.width * Math.sqrt(ratio),
                y: sc * height / state.height / Math.sqrt(ratio)
            }
        );
    }
    state.width = width, state.height = height;
}

// screen to world convertion
function screenToWorld(screenX, screenY) {
    return {
        x: state.xmin + (state.xmax-state.xmin) * screenX / state.width,
        y: state.ymin + (state.ymax-state.ymin) * (1.0 - screenY / state.height)
    };
}
// world to screen convertion
function worldToScreen(worldX, worldY) {
    return {
        x: (worldX - state.xmin) / (state.xmax - state.xmin) * state.width,
        y: state.height - (worldY - state.ymin) / (state.ymax - state.ymin) * state.height
    };
}

// render legend
function renderLegend() {
    var scale = state.width / (state.xmax - state.xmin);
    const targetWidth = 120;
    var targetL = targetWidth / scale;
    var expi = Math.floor(Math.log10(targetL));
    var l = Math.pow(10, expi);
    if (l / targetL < 0.2) l *= 5.0;
    if (l / targetL < 0.5) l *= 2.0;
    document.getElementById("legend-scale").setAttribute("width", scale * l);
    document.getElementById("legend-text").setAttribute("x", 0.5 * scale * l);
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


// Rendering

var renderer = {
    canvas: null,
    ctx: null,
};

// all coordinates in world

function drawLine(x1, y1, x2, y2) {
    let ctx = renderer.ctx;
    var p1 = worldToScreen(x1, y1);
    var p2 = worldToScreen(x2, y2);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
}

function drawArrowTip(p, a, s=2.0) {
    a = -a;
    let ctx = renderer.ctx;
    ctx.beginPath();
    p = worldToScreen(p.x, p.y);
    var l = s * Number(ctx.lineWidth);
    var h = 0.5*l;
    var o = 0.15 * Math.PI;
    var x = p.x+h*Math.cos(a);
    var y = p.y+h*Math.sin(a)
    ctx.moveTo(x-l*Math.cos(a-o), y-l*Math.sin(a-o));
    ctx.lineTo(x, y);
    ctx.lineTo(x-l*Math.cos(a+o), y-l*Math.sin(a+o));
    ctx.closePath();
    ctx.stroke();
}

function drawArrow(x1, y1, x2, y2) {
    let ctx = renderer.ctx;
    var p1 = worldToScreen(x1, y1);
    var p2 = worldToScreen(x2, y2);
    // line
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    // tip
    var a = Math.atan2(y2-y1, x2-x1);
    drawArrowTip({ x: x2, y: y2 }, a);
}

function drawPolyline(points, closed=false) {
    let ctx = renderer.ctx;
    ctx.beginPath();
    var p0 = worldToScreen(points[0].x, points[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (var i = 1; i < points.length; i++) {
        var p = worldToScreen(points[i].x, points[i].y);
        ctx.lineTo(p.x, p.y);
    }
    if (closed)
        ctx.closePath();
    ctx.stroke();
}

function drawBezierCurve(p1, c1, c2, p2) {
    let ctx = renderer.ctx;
    p1 = worldToScreen(p1.x, p1.y);
    c1 = worldToScreen(c1.x, c1.y);
    c2 = worldToScreen(c2.x, c2.y);
    p2 = worldToScreen(p2.x, p2.y);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
    ctx.stroke();
}

function drawBezierSpline(points) {
    let ctx = renderer.ctx;
    ctx.beginPath();
    var p0 = worldToScreen(points[0].x, points[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (var i = 1; i < points.length; i += 3) {
        var c1 = worldToScreen(points[i].x, points[i].y);
        var c2 = worldToScreen(points[i+1].x, points[i+1].y);
        var c = worldToScreen(points[i+2].x, points[i+2].y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, c.x, c.y);
    }
    ctx.stroke();
}

// call this function to re-render
async function drawScene(state) {
    let ctx = renderer.ctx;
    if (ctx == null) {
        renderer.canvas.style.cursor = "not-allowed";
        return;
    }
    else renderer.canvas.style.cursor = null;

    onDraw();
}


// ============================ MAIN ==============================

function initRenderer0() {
    renderer.canvas = document.getElementById("canvas");
    renderer.ctx = canvas.getContext("2d");
    
    // state
    try {
        var initialState = localStorage.getItem(state.name);
        if (initialState != null) {
            var new_state = JSON.parse(initialState);
            resetState(new_state, false);
        }
        else resetState();
    }
    catch (e) {
        console.error(e);
        try { localStorage.removeItem(state.name); } catch (e) { console.error(e); }
    }
}

function updateBuffers() {
    state.width = canvas.width = canvas.style.width = window.innerWidth;
    state.height = canvas.height = canvas.style.height = window.innerHeight;

    state.renderNeeded = true;
}

// Initialize renderer, call updateShaderFunction() once before calling this
function initRenderer() {
    let canvas = renderer.canvas;

    updateBuffers();

    // rendering
    var oldScreenCenter = [-1, -1];
    var startTime = performance.now();
    function render() {
        var timeDependent = true;
        try {
            timeDependent = /\(iTime\)/.test(updateShaderFunction.prevCode.shaderSource);
        } catch (e) { }
        if (timeDependent && state.iTime == -1.0)
            startTime = performance.now();
        var screenCenter = calcScreenCenter();
        state.screenCenter = screenCenter;
        if ((screenCenter[0] != oldScreenCenter[0] || screenCenter[1] != oldScreenCenter[1])
            || state.renderNeeded) {
            resizeState();
            state.width = canvas.width = canvas.style.width = window.innerWidth;
            state.height = canvas.height = canvas.style.height = window.innerHeight;
            try {
                localStorage.setItem(state.name, JSON.stringify(state));
            } catch (e) { console.error(e); }
            drawScene(state);
            renderLegend();
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
        if (renderer.ctx == null)
            return;
        resizeState();
        scaleState(
            { x: event.clientX, y: event.clientY },
            Math.exp(-0.0004 * event.wheelDeltaY)
        );
        state.renderNeeded = true;
    }, { passive: true });
    var mouseDown = false;
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
        if (renderer.ctx == null)
            return;
        if (mouseDown) {
            var v = fingerDist == -1 ? 1.0 : 0.4;
            translateState({ x: v * event.movementX, y: v * event.movementY });
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
        if (renderer.ctx == null)
            return;
        if (event.touches.length == 2) {
            var fingerPos0 = { x: event.touches[0].pageX, y: event.touches[0].pageY };
            var fingerPos1 = { x: event.touches[1].pageX, y: event.touches[1].pageY };
            var newFingerDist = Math.hypot(fingerPos1.x - fingerPos0.x, fingerPos1.y - fingerPos0.y);
            if (fingerDist > 0. && newFingerDist > 0.) {
                var sc = fingerDist / newFingerDist;
                scaleState({
                    x: 0.5 * (fingerPos0.x + fingerPos1.x),
                    y: 0.5 * (fingerPos0.y + fingerPos1.y)
                }, sc);
            }
            fingerDist = newFingerDist;
            state.renderNeeded = true;
        }
    }, { passive: true });
    window.addEventListener("resize", function () {
        resizeState();
        updateBuffers();
    });
    document.getElementById("fps").addEventListener("click", function () {
        state.iTime = -1.0;
    });

    initApp();
}

function updateShaderFunction(funCode, funGradCode, params) {
    state.renderNeeded = true;
    console.log(funCode);

    if (funCode == null) {
        renderer.ctx = null;
        return;
    }

    // cache code
    if (updateShaderFunction.prevCode == undefined)
        updateShaderFunction.prevCode = {
            shaderSource: ""
        };
    var prevCode = updateShaderFunction.prevCode;
    let shaderSource = funCode;

    // shader program(s)
    var recompile =
        prevCode.shaderSource != shaderSource || renderer.ctx == null;
    if (recompile) {
        renderer.ctx = renderer.canvas.getContext('2d');
        prevCode.shaderSource = shaderSource;
    }

    // trigger potential error
    var nargs = funCode.slice(funCode.indexOf('(')+1, funCode.indexOf(')')).split(',').length;
    eval('('+funCode+')('+(new Array(nargs)).fill('0').join(',')+')');

    if (window.hasOwnProperty('onUpdate'))
        onUpdate(recompile);
}