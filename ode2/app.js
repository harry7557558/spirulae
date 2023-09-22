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


function solverReturnToBezier(fwd, bck) {
    var res = [];
    for (var i = bck.length-1; i >= 0; i--) {
        var x = bck.x[i];
        var dxdt = bck.dxdt[i];
        if (i < bck.length-1) {
            var dt = bck.dt[i];
            res.push({
                x: x.x-dxdt.x*dt/3,
                y: x.y-dxdt.y*dt/3
            });
        }
        res.push(x);
        if (i > 0) {
            var dt = bck.dt[i-1];
            res.push({
                x: x.x+dxdt.x*dt/3,
                y: x.y+dxdt.y*dt/3
            });
        }
    }
    for (var i = 0; i < fwd.length; i++) {
        var x = fwd.x[i];
        var dxdt = fwd.dxdt[i];
        if (i > 0) {
            var dt = fwd.dt[i-1];
            res.push({
                x: x.x-dxdt.x*dt/3,
                y: x.y-dxdt.y*dt/3
            });
            res.push(x);
        }
        if (i < fwd.length-1) {
            var dt = fwd.dt[i];
            res.push({
                x: x.x+dxdt.x*dt/3,
                y: x.y+dxdt.y*dt/3
            });
        }
    }
    return res;
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
    let maxstep = 0.1 * Math.sqrt(xrange*yrange);
    var fwd = rkas(funRaw, App.mousePosW, 0.1, 600, bound, maxstep);
    var bck = rkas(funRaw, App.mousePosW, -0.1, 600, bound, maxstep);
    return solverReturnToBezier(fwd, bck);
}

function fieldDensityToSc(density) {
    return 60.0*(0.5+0.5*Math.pow(-density,3.0));
}

function getStreamlines(density) {
    var xmid = 0.5*(state.xmin+state.xmax);
    var xrange = 0.5*(state.xmax-state.xmin);
    var ymid = 0.5*(state.ymin+state.ymax);
    var yrange = 0.5*(state.ymax-state.ymin);
    let bound = {
        xmin: xmid-1.01*xrange,
        xmax: xmid+1.01*xrange,
        ymin: ymid-1.01*yrange,
        ymax: ymid+1.01*yrange
    }
    sc = 0.75 * fieldDensityToSc(density)*Math.max(
        (state.xmax-state.xmin)/window.innerWidth,
        (state.ymax-state.ymin)/window.innerHeight);

    // avoid streamlines that are too close
    var streamlines = [];
    var sg = 0.6*sc;
    var gi0 = Math.ceil(state.xmin/sg);
    var gi1 = Math.floor(state.xmax/sg);
    var gj0 = Math.ceil(state.ymin/sg);
    var gj1 = Math.floor(state.ymax/sg);
    var occupancyList = {};
    var tempOccupancyList = {};
    function getIdx(i, j) {
        return '' + (j * (gi1-gi0+1) + i);
    }
    function isOccupied(i, j) {
        i = Math.min(Math.max(i, gi0), gi1);
        j = Math.min(Math.max(j, gj0), gj1);
        var idx = getIdx(i, j);
        return occupancyList.hasOwnProperty(idx);
    }
    function terminateP(x, y) {
        var i = Math.round(x/sg);
        var j = Math.round(y/sg);
        // if (i < gi0 || i > gi1 || j < gj0 || j > gj1)
        //     return false;
        for (var di = -1; di <= 1; di++) {
            for (var dj = -1; dj <= 1; dj++) {
                if (Math.hypot(di, dj) <= 1 && isOccupied(i+di, j+dj))
                    return true;
            }
        }
        tempOccupancyList[getIdx(i, j)] = true;
        if (terminateP.prev != null) {
            var n = 3;
            for (var i = 1; i < n; i++) {
                var t = i / n;
                var xt = terminateP.prev.x * (1.0-t) + x * t;
                var yt = terminateP.prev.y * (1.0-t) + y * t;
                var it = Math.round(xt/sg);
                var jt = Math.round(yt/sg);
                if (it < gi0 || it > gi1 || jt < gj0 || jt > gj1)
                    tempOccupancyList[getIdx(it, jt)] = true;
            }
        }
        terminateP.prev = { x: x, y: y };
        return false;
    }
    terminateP.prev = null;

    // normalize the vector field for stable integration
    function funNormalized(x, y) {
        var r = funRaw(x, y);
        var l = Math.hypot(r.x, r.y);
        return { x: r.x/l, y: r.y/l };
    }
    function pushStreamline(p) {
        if (terminateP(p.x, p.y))
            return;
        var fwd = rkas(funNormalized, p, 0.2*sc, 100, bound, sc, terminateP);
        terminateP.prev = null;
        var bck = rkas(funNormalized, p, -0.2*sc, 100, bound, sc, terminateP);
        terminateP.prev = null;
        // avoid short streamlines
        var sl = solverReturnToBezier(fwd, bck);
        var length = 0.0;
        for (var i = 3; i < sl.length; i += 3)
            length += Math.hypot(sl[i].x-sl[i-3].x, sl[i].y-sl[i-3].y);
        if (length > 4.0*sc || sl.length > 40)
            streamlines.push(sl);
        // update occupancy list
        for (var idx in tempOccupancyList)
            occupancyList[idx] = true;
        tempOccupancyList = {};
    }

    // add streamlines from outer to inner
    var i0 = Math.ceil(state.xmin/sc);
    var i1 = Math.floor(state.xmax/sc);
    var j0 = Math.ceil(state.ymin/sc);
    var j1 = Math.floor(state.ymax/sc);
    for (var border = 0; 2*border < Math.max(i1-i0, j1-j0); border++) {
        var points = [];
        for (var i = i0+border; i+border < i1; i++) {
            var j = j0+border;
            points.push({ x: i*sc, y: j*sc });
            j = j1-border;
            points.push({ x: i*sc, y: j*sc });
        }
        for (var j = j0+border; j+border < j1; j++) {
            var i = i0+border;
            points.push({ x: i*sc, y: j*sc });
            i = i1-border;
            points.push({ x: i*sc, y: j*sc });
        }
        var big_prime = 998244353;
        for (var ii = 0, i = 0; ii < points.length;
                ii++, i = (i+big_prime)%points.length) {
            pushStreamline(points[i]);
        }
    }
    return streamlines;
}
ctx.strokeStyle = 'rgb(128,128,128)';
ctx.lineWidth = 1;
for (var i = 0; i < streamlines.length; i++) {
    var sl = streamlines[i];
    drawPolyline(sl);
}


function onUpdate(recompile) {
    if (recompile)
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
    let parameters = parameterToDict(RawParameters);
    let field = parameters.sField;
    let density = parameters.rField;

    ctx.lineWidth = 1.5;

    sc = fieldDensityToSc(density)*Math.max(
        (state.xmax-state.xmin)/window.innerWidth,
        (state.ymax-state.ymin)/window.innerHeight);
    var lines = [];
    var all_ls = [];
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
            all_ls.push(l);
        }
    }
    all_ls.sort();
    var totl = 0.0, totn = 0;
    for (var i = Math.round(0.1*all_ls.length); i < 0.9*all_ls.length; i++)
        if (isFinite(all_ls[i]))
            totl += all_ls[i], totn += 1;
    totl /= totn;
    for (var i = 0; i < lines.length; i++) {
        var t = Math.tanh(lines[i].l / totl);
        var r = Math.round(255*t);
        var g = Math.round(128);
        var b = Math.round(255-255*t);
        ctx.strokeStyle = 'rgb('+r+','+g+','+b+')';
        var k = 0.4*sc/lines[i].l;
        var x = lines[i].x, y = lines[i].y;
        var dxdt = lines[i].dxdt, dydt = lines[i].dydt;
        if (field == 'slope')
            drawLine(x-k*dxdt, y-k*dydt, x+k*dxdt, y+k*dydt);
        if (field == 'direction')
            drawArrow(x-k*dxdt, y-k*dydt, x+k*dxdt, y+k*dydt);
        if (field == 'vector')
            drawArrow(x, y, x+dxdt, y+dydt);
    }

    if (field == 'streamline') {
        var streamlines = getStreamlines(density);
        ctx.strokeStyle = 'rgb(0,128,0)';
        for (var si = 0; si < streamlines.length; si++) {
            var sl = streamlines[si];
            drawBezierSpline(sl);
            // draw arrow at the middle of streamline by arc length
            var lengthPsa = [0.0], length = 0.0;
            for (var i = 3; i < sl.length; i += 3) {
                length += Math.hypot(sl[i].x-sl[i-3].x, sl[i].y-sl[i-3].y);
                lengthPsa.push(length);
            }
            var i = 0;
            while (lengthPsa[i] < 0.5*lengthPsa[lengthPsa.length-1])
                i += 1;
            if (i > 0 && i < lengthPsa.length-1) {
                var p = sl[3*i];
                var d = funRaw(p.x, p.y);
                var a = Math.atan2(d.y, d.x);
                drawArrowTip(p, a, 3.0);
            }
        }
    }

    // solution through mouse cursor
    ctx.strokeStyle = 'rgb(255,0,255)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    if (App.mousePosW) {
        drawBezierSpline(getSolution());
    }
    ctx.strokeStyle = 'rgb(255,0,0)';
    ctx.lineWidth = 2;
    for (var i = 0; i < App.solutions.length; i++) {
        drawBezierSpline(App.solutions[i]);
    }
}
