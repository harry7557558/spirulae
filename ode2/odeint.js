// autonomous ODE with two variables

function rk4(fun, u0, dt, n, bound) {
    var res = [u0];
    var u = u0;
    for (var i = 0; i < n; i++) {
        var k1 = fun(u.x, u.y);
        var k2 = fun(u.x+0.5*k1.x*dt, u.y+0.5*k1.y*dt);
        var k3 = fun(u.x+0.5*k2.x*dt, u.y+0.5*k2.y*dt);
        var k4 = fun(u.x+k3.x*dt, u.y+k3.y*dt);
        u = {
            x: u.x + (k1.x/6.0 + k2.x/3.0 + k3.x/3.0 + k4.x/6.0) * dt,
            y: u.y + (k1.y/6.0 + k2.y/3.0 + k3.y/3.0 + k4.y/6.0) * dt
        };
        if (bound && !(u.x >= bound.xmin && u.x <= bound.xmax
                && u.y >= bound.ymin && u.y <= bound.ymax)) {
                    if (isFinite(u.x*u.x+u.y*u.y))
                        res.push(u);
                    break;
                }
        res.push(u);
    }
    return res;
}

function rk4as(fun, u0, dt, n, bound, maxstep) {
    var res = [u0];
    var u = u0;
    var h = Math.abs(dt);
    var err0 = null;
    var deltas = [], small_delta_count = 0;
    for (var i = 0; i < n; i++) {
        var k1 = fun(u.x, u.y);
        dt = Math.sign(dt) * Math.min(h, maxstep/Math.hypot(k1.x, k1.y));
        // see Numerical Recipes
        let a21 = dt/5,
            a31 = 3*dt/40, a32 = 9*dt/40,
            a41 = 44*dt/45, a42 = -56*dt/15, a43 = 32*dt/9,
            a51 = 19372*dt/6561, a52 = -25360*dt/2187, a53 = 64448*dt/6561, a54 = -212*dt/729,
            a61 = 9017*dt/3168, a62 = -355*dt/33, a63 = 46732*dt/5247, a64 = 49*dt/176, a65 = -5103*dt/18656,
            a71 = 35*dt/384, a72 = 0, a73 = 500*dt/1113, a74 = 125*dt/192, a75 = -2187*dt/6784, a76 = 11*dt/84;
        let b1 = 35/384, b2 = 0, b3 = 500/1113, b4 = 125/192, b5 = -2187/6784, b6 = 11/84, b7 = 0;
        let b1_ = 5179/57600, b2_ = 0, b3_ = 7571/16695, b4_ = 393/640, b5_ = -92097/339200, b6_ = 187/2100, b7_ = 1/40;
        // y and y*
        var k2 = fun(u.x+a21*k1.x, u.y+a21*k1.y);
        var k3 = fun(u.x+a31*k1.x+a32*k2.x, u.y+a31*k1.y+a32*k2.y);
        var k4 = fun(u.x+a41*k1.x+a42*k2.x+a43*k3.x, u.y+a41*k1.y+a42*k2.y+a43*k3.y);
        var k5 = fun(u.x+a51*k1.x+a52*k2.x+a53*k3.x+a54*k4.x, u.y+a51*k1.y+a52*k2.y+a53*k3.y+a54*k4.y);
        var k6 = fun(u.x+a61*k1.x+a62*k2.x+a63*k3.x+a64*k4.x+a65*k5.x, u.y+a61*k1.y+a62*k2.y+a63*k3.y+a64*k4.y+a65*k5.y);
        var k7 = fun(u.x+a71*k1.x+a72*k2.x+a73*k3.x+a74*k4.x+a75*k5.x+a76*k6.x, u.y+a71*k1.y+a72*k2.y+a73*k3.y+a74*k4.y+a75*k5.y+a76*k6.y);
        var y = {
            x: u.x + (k1.x*b1 + k2.x*b2 + k3.x*b3 + k4.x*b4 + k5.x*b5 + k6.x*b6 + k7.x*b7) * dt,
            y: u.y + (k1.y*b1 + k2.y*b2 + k3.y*b3 + k4.y*b4 + k5.y*b5 + k6.y*b6 + k7.y*b7) * dt
        };
        var y_ = {
            x: u.x + (k1.x*b1_ + k2.x*b2_ + k3.x*b3_ + k4.x*b4_ + k5.x*b5_ + k6.x*b6_ + k7.x*b7_) * dt,
            y: u.y + (k1.y*b1_ + k2.y*b2_ + k3.y*b3_ + k4.y*b4_ + k5.y*b5_ + k6.y*b6_ + k7.y*b7_) * dt
        };
        // adaptive step
        const atol = 4e-6, rtol = 4e-6;
        var err = Math.hypot(
            (y.x-y_.x)/(atol+Math.hypot(u.x,y.x)*rtol),
            (y.y-y_.y)/(atol+Math.hypot(u.y,y.y)*rtol)) / 1.414;
        var h1 = 0.95 * Math.abs(dt) * (
            err0 == null || true ? Math.pow(err, -0.2) :
            Math.pow(err, -0.14) * Math.pow(err0, 0.08)
        );
        h = Math.min(Math.max(h1, 0.2*h), 10.0*h);
        // console.log(dt, err);
        if (!(err < 1.0)) {
            // i--;
            continue;
        }
        u0 = u, u = y, err0 = err;
        // termination
        if (bound && !(u.x >= bound.xmin && u.x <= bound.xmax
                && u.y >= bound.ymin && u.y <= bound.ymax)) {
                    if (isFinite(u.x*u.x+u.y*u.y))
                        res.push(u);
                    break;
                }
        res.push(u);
        var delta = Math.hypot(u.x-u0.x, u.y-u0.y);
        deltas.push(delta);
        if (delta < 1e-6 * maxstep) {
            small_delta_count += 1;
            if (small_delta_count > 5) break;
        }
        else small_delta_count = 0;
    }
    // console.log(deltas);
    return res;
}
