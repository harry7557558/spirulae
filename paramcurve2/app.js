var App = {
    mousePosW: null,
};

function initApp() {
    canvas.addEventListener('pointerdown', function(event) {
        var x = event.clientX, y = event.clientY;
        App.mousePosW = screenToWorld(x, y);
        state.renderNeeded = true;
    });
    canvas.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        state.renderNeeded = true;
    });
    canvas.addEventListener('pointermove', function(event) {
        var x = event.clientX, y = event.clientY;
        App.mousePosW = screenToWorld(x, y);
        state.renderNeeded = true;
    });
    canvas.addEventListener('pointerout', function(event) {
        App.mousePosW = null;
        state.renderNeeded = true;
    });
    canvas.addEventListener("mousemove", function (event) {
        let display = document.getElementById("value-display");
        var world = screenToWorld(event.clientX, event.clientY);
        var dxdt = funRaw(world.x, world.y);
        display.innerHTML = 'x = ' + world.x.toPrecision(4) + ', ' +
            'y = ' + world.y.toPrecision(4) + '<br/>' +
            "x' = " + dxdt.x.toPrecision(4) + ', ' +
            "y' = " + dxdt.y.toPrecision(4);
        display.style.display = 'block';
    });

}



function onDraw() {
    let ctx = renderer.ctx;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, state.width, state.height);

    // grid
    var sc = 0.05*Math.max(state.xmax-state.xmin, state.ymax-state.ymin);
    sc = Math.pow(10, Math.round(Math.log10(sc)));
    ctx.strokeStyle = 'rgb(192,192,192)';
    ctx.lineWidth = 1;
    for (var i = Math.ceil(state.ymin/sc); i <= Math.floor(state.ymax/sc); i++) {
        drawLine(state.xmin, sc*i, state.xmax, sc*i);
    }
    for (var i = Math.ceil(state.xmin/sc); i <= Math.floor(state.xmax/sc); i++) {
        drawLine(sc*i, state.ymin, sc*i, state.ymax);
    }

    // axes
    ctx.strokeStyle = 'rgb(128,128,128)';
    ctx.lineWidth = 4;
    drawLine(state.xmin, 0.0, state.xmax, 0.0);
    drawLine(0.0, state.ymin, 0.0, state.ymax);

    // curve
    if (!funRaw) return;

    let tol = 1e-4 * Math.min(state.xmax-state.xmin, state.ymax-state.ymin);
    let t1 = 1.0;

    let time0 = performance.now();
    let segments = splitCurve(funRaw, 0.0, t1, 0.01, 1e-5, tol);
    let time1 = performance.now();
    // console.log(time1-time0, 'ms');

    ctx.lineWidth = 4;
    ctx.strokeStyle = 'gray';
    // drawPolyline(segments, false);
    ctx.lineWidth = 2;
    for (var i = 0; i+1 < segments.length; i++) {
        ctx.strokeStyle = ['red', 'blue'][i%2];
        let p0 = segments[i], p1 = segments[i+1];
        drawLine(p0.x, p0.y, p1.x, p1.y);
    }
}
