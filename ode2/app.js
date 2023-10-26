var App = {
    mousePosW: null,
    solutionPoints: [],
};

function initApp() {
    canvas.addEventListener('pointerdown', function(event) {
        var x = event.clientX, y = event.clientY;
        App.mousePosW = screenToWorld(x, y);
        App.solutionPoints.push(App.mousePosW);
        state.renderNeeded = true;
    });
    canvas.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        App.solutionPoints = [];
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

    document.getElementById("drop-x").addEventListener("keydown", function(e) {
        if (e.key === 'Enter') {
            dropPoint();
        };
    });
    document.getElementById("drop-y").addEventListener("keydown", function(e) {
        if (e.key === 'Enter') {
            dropPoint();
        };
    });
    document.getElementById("drop").addEventListener("click", dropPoint);
}


function dropPoint() {
    var definition = document.getElementById("equation-input").value;
    definition = definition.replaceAll(';', '\n').split('\n');
    var lines = [];
    for (var i = 0; i < definition.length; i++) {
        var line = definition[i].trim();
        if (/[xy]_t\s*\=/.test(line) || /y_x\s*\=/.test(line))
            continue;
        lines.push(line);
    }
    definition = lines.join('\n');

    function getValue(id) {
        let element = document.getElementById(id);
        var text = element.value.trim();
        var value = Number(text);
        if (!isFinite(value)) {
            try {
                var s = definition + '\ny_x=' + text;
                var e = MathParser.parseInput(s);
                var c = CodeGenerator.postfixToSource([{ y_x: e.y_x }], ['fun'], 'js');
                eval('value=('+c.source+")().y");
            }
            catch(e) {
                console.error(e);
            }
        }
        if (text != "" && isFinite(value)) {
            element.style.color = null;
            element.style.boxShadow = null;
            element.style.fontWeight = null;
            return value;
        }
        else {
            element.style.color = "red";
            element.style.boxShadow = "rgb(255,0,0) 0px 0px 3px";
            element.style.fontWeight = 600;
            return NaN;
        }
    }
    var x = getValue("drop-x");
    var y = getValue("drop-y");
    if (isFinite(x) && isFinite(y)) {
        App.solutionPoints.push({x: x, y: y});
        state.renderNeeded = true;
    }
}


function solverReturnToBezier(fwd, bck, clean) {
    function cleanReturn(ret) {
        var res = {
            x: [ret.x[0]],
            dxdt: [ret.dxdt[0]],
            dt: []
        };
        var eps = 1.0 * Math.min(
            (state.xmax-state.xmin)/state.width,
            (state.ymax-state.ymin)/state.height);
        var dt = 0.0;
        for (var i = 2; i < ret.length; i++) {
            var a = res.x[res.x.length-1];
            var b = ret.x[i];
            var da = res.dxdt[res.dxdt.length-1];
            var db = ret.dxdt[i];
            var l = Math.hypot(b.x-a.x, b.y-a.y);
            var t = (da.x*db.y-da.y*db.x) / Math.hypot(da.x,da.y) / Math.hypot(db.x,db.y);
            if (l*Math.abs(t) > eps || i == ret.length - 1) {
                res.x.push(ret.x[i-1]);
                res.dxdt.push(ret.dxdt[i-1]);
                res.dt.push(dt);
                dt = 0.0;
            }
            dt += ret.dt[i-1];
        }
        res.length = res.x.length;
        return res;
    }
    if (clean) {
        fwd = cleanReturn(fwd);
        bck = cleanReturn(bck);
    }
    // get
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

function getSolution(p0, clean) {
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
    function funNormalized(x, y) {
        var r = funRaw(x, y);
        var l = Math.hypot(r.x, r.y);
        return { x: r.x/l, y: r.y/l };
    }
    let bidirection = parameterToDict(RawParameters).cBidirection;
    var fwd = rkas(funNormalized, p0, 0.1, 1000, bound, maxstep);
    var bck = bidirection ?
        rkas(funNormalized, p0, -0.1, 1000, bound, maxstep) :
        {
            length: 1,
            x: [p0],
            dxdt: [funNormalized(p0)],
            dt: []
        };
    return solverReturnToBezier(fwd, bck, clean);
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
        (state.xmax-state.xmin)/state.width,
        (state.ymax-state.ymin)/state.height);

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
        var sl = solverReturnToBezier(fwd, bck, true);
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


function onUpdate(recompile) {
    if (recompile)
        App.solutionPoints = [];
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
    ctx.lineCap = 'round';

    sc = fieldDensityToSc(density)*Math.max(
        (state.xmax-state.xmin)/state.width,
        (state.ymax-state.ymin)/state.height);
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
    function getColor(l) {
        var t = Math.tanh(l/totl);
        var r = Math.round(64+191*t);
        var g = Math.round(128);
        var b = Math.round(255-191*t);
        return 'rgb('+r+','+g+','+b+')';
    }
    for (var i = 0; i < lines.length; i++) {
        ctx.strokeStyle = getColor(lines[i].l);
        var k = 0.4*sc/lines[i].l;
        var s = 0.6*sc/totl;
        var x = lines[i].x, y = lines[i].y;
        var dxdt = lines[i].dxdt, dydt = lines[i].dydt;
        if (field == 'slope')
            drawLine(x-k*dxdt, y-k*dydt, x+k*dxdt, y+k*dydt);
        if (field == 'direction')
            drawArrow(x-k*dxdt, y-k*dydt, x+k*dxdt, y+k*dydt);
        if (field == 'vector')
            drawArrow(x, y, x+s*dxdt, y+s*dydt);
    }

    if (field == 'streamline') {
        var count = 0;
        var streamlines = getStreamlines(density);
        var bezierCurves = {};
        for (var si = 0; si < streamlines.length; si++) {
            var sl = streamlines[si];
            // drawBezierSpline(sl);
            for (var i = 0; i+1 < sl.length; i += 3) {
                var c = {
                    x: 0.25 * (sl[i].x+sl[i+1].x+sl[i+2].x+sl[i+3].x),
                    y: 0.25 * (sl[i].y+sl[i+1].y+sl[i+2].y+sl[i+3].y)
                };
                var d = funRaw(c.x, c.y);
                var color = getColor(Math.hypot(d.x, d.y));
                if (!bezierCurves.hasOwnProperty(color))
                    bezierCurves[color] = [];
                bezierCurves[color].push([sl[i], sl[i+1], sl[i+2], sl[i+3]]);
                count += 1;
            }
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
                ctx.strokeStyle = getColor(Math.hypot(d.x, d.y));
                drawArrowTip(p, a, 3.0);
            }
        }
        for (var color in bezierCurves) {
            var curves = bezierCurves[color];
            ctx.strokeStyle = color;
            ctx.beginPath();
            for (var i = 0; i < curves.length; i++) {
                var c = curves[i];
                for (var _ = 0; _ < 4; _++)
                    c[_] = worldToScreen(c[_].x, c[_].y);
                ctx.moveTo(c[0].x, c[0].y);
                ctx.bezierCurveTo(c[1].x, c[1].y, c[2].x, c[2].y, c[3].x, c[3].y);
            }
            ctx.stroke();
        }
        // console.log(count);
    }

    // stacked solutions
    ctx.strokeStyle = 'rgb(255,0,0)';
    ctx.lineWidth = 3;
    for (var i = 0; i < App.solutionPoints.length; i++) {
        var p = App.solutionPoints[i];
        var sol = getSolution(p, true);
        drawBezierSpline(sol);
    }
    // solution through mouse cursor
    ctx.strokeStyle = 'rgb(255,0,255)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    if (App.mousePosW) {
        drawBezierSpline(getSolution(App.mousePosW, true));
    }
}
