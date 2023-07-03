function updateShaderFunction(funCode, funGradCode, params) {

    Module.ccall('updateShaderFunction', // name of C function
        null, // return type
        ['string'], // argument types
        [funCode]);

}

function setRenderNeeded(renderNeeded) {
    Module.ccall('setRenderNeeded',
        null,
        ['number'],
        [renderNeeded]);
}
function scaleState(point, scale) {
    Module.ccall('scaleState',
        null,
        ['number', 'number', 'number'],
        [point.x, point.y, scale]);
}
function translateState(delta) {
    Module.ccall('translateState',
        null,
        ['number', 'number'],
        [delta.x, delta.y]);
}
function resizeWindow() {
    let canvas = document.getElementById("emscripten-canvas");
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w, canvas.height = h;
    canvas.style.width = w + "px", canvas.style.height = h + "px";
    Module.ccall('resizeWindow',
        null,
        ['number', 'number'],
        [w, h]);
}
function resetState() {
    Module.ccall('resetState',
        null,
        [],
        []);
}

function setScreenCenter() {
    var c = calcScreenCenter();
    Module.ccall('setScreenCenter',
        null,
        ['number', 'number'],
        [c.x, c.y]);
}




function wasmReady() {
    if (document.readyState != "complete") {
        setTimeout(wasmReady, 50);
        return;
    };

    let canvas = document.getElementById("emscripten-canvas");
    let control = document.getElementById("control");

    updateFunctionInput(true);
    resizeWindow();
    setScreenCenter();
    resetState();

    // interactions
    var fingerDist = -1;
    canvas.addEventListener("wheel", function (event) {
        scaleState(
            { x: event.clientX, y: event.clientY },
            Math.exp(-0.0004 * event.wheelDeltaY)
        );
        setRenderNeeded(true);
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
        if (mouseDown) {
            var v = fingerDist == -1 ? 1.0 : 0.4;
            translateState({ x: v * event.movementX, y: v * event.movementY });
            setRenderNeeded(true);
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
            setRenderNeeded(true);
        }
    }, { passive: true });
    window.addEventListener("resize", function () {
        resizeWindow();
        setScreenCenter();
    });
    new ResizeObserver(function() {
        setScreenCenter();
    }).observe(control);
    document.getElementById("fps").addEventListener("click", function () {
        state.iTime = -1.0;
    });

}


// https://stackoverflow.com/a/47231903
window.addEventListener('keydown', function(event){
    event.stopImmediatePropagation();
}, true);
window.addEventListener('keyup', function(event){
    event.stopImmediatePropagation();
}, true);
