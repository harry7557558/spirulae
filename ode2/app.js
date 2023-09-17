var App = {
    mousePosW: null,
    solutions: [],
};

function initApp() {
    canvas.addEventListener('pointerdown', function(event) {
        var x = event.clientX, y = event.clientY;
        App.mousePosW = screenToWorld(x, y);
        App.solutions.push(getSolution());
        state.renderNeeded = true;
    });
    canvas.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        App.solutions = [];
        state.renderNeeded = true;
    });
    window.addEventListener('pointermove', function(event) {
        var x = event.clientX, y = event.clientY;
        App.mousePosW = screenToWorld(x, y);
        state.renderNeeded = true;
    });
}

function getSolution() {
    var xmid = 0.5*(state.xmin+state.xmax);
    var xrange = 0.5*(state.xmax-state.xmin);
    var ymid = 0.5*(state.ymin+state.ymax);
    var yrange = 0.5*(state.ymax-state.ymin);
    let bound = {
        xmin: xmid-2.5*xrange,
        xmax: xmid+2.5*xrange,
        ymin: ymid-2.5*yrange,
        ymax: ymid+2.5*yrange
    }
    let maxstep = 0.05 * Math.sqrt(xrange*yrange);
    var fwd = rk4as(funRaw, App.mousePosW, 0.1, 200, bound, maxstep);
    var bck = rk4as(funRaw, App.mousePosW, -0.1, 200, bound, maxstep);
    var res = [];
    for (var i = 0; i < bck.length; i++)
        res.push(bck[bck.length - i - 1]);
    for (var i = 1; i < fwd.length; i++)
        res.push(fwd[i]);
    return res;
}

function onUpdate() {
    App.solutions = [];
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

    // vector field
    ctx.lineWidth = 2;
    sc = 40.0*Math.max(
        (state.xmax-state.xmin)/window.innerWidth,
        (state.ymax-state.ymin)/window.innerHeight);
    var lines = [];
    var totl = 0.0;
    for (var j = Math.ceil(state.ymin/sc); j <= Math.floor(state.ymax/sc); j++) {
        for (var i = Math.ceil(state.xmin/sc); i <= Math.floor(state.xmax/sc); i++) {
            var x = i*sc, y = j*sc;
            var d = funRaw(x, y);
            var dxdt = d.x, dydt = d.y;
            var l = Math.hypot(dxdt, dydt);
            lines.push({
                l: l,
                x: x, y: y,
                dxdt: dxdt, dydt: dydt
            })
            totl += l;
        }
    }
    totl /= lines.length;
    for (var i = 0; i < lines.length; i++) {
        var t = Math.tanh(lines[i].l / totl);
        var r = Math.round(255*t);
        var g = Math.round(128);
        var b = Math.round(255-255*t);
        ctx.strokeStyle = 'rgb('+r+','+g+','+b+')';
        var k = 0.4*sc/lines[i].l;
        var x = lines[i].x, y = lines[i].y;
        var dxdt = lines[i].dxdt, dydt = lines[i].dydt;
        drawLine(x-k*dxdt, y-k*dydt, x+k*dxdt, y+k*dydt);
    }

    // solution through mouse cursor
    ctx.strokeStyle = 'rgb(255,0,255)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    if (App.mousePosW) {
        drawPolyline(getSolution());
    }
    ctx.strokeStyle = 'rgb(255,0,0)';
    ctx.lineWidth = 2;
    for (var i = 0; i < App.solutions.length; i++) {
        drawPolyline(App.solutions[i]);
    }
}
