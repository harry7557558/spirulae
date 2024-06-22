function splitCurve(fun, t0, t1, initialStep, minStep, targetError) {
    function distanceToLineSegment(p, a, b) {
        let ap = [p.x - a.x, p.y - a.y];
        let ab = [b.x - a.x, b.y - a.y];
        let lenAB = ab[0] * ab[0] + ab[1] * ab[1];
        let h = (ap[0] * ab[0] + ap[1] * ab[1]) / lenAB;
        let dr = [ap[0] - ab[0] * h, ap[1] - ab[1] * h];
        return Math.sqrt(dr[0] * dr[0] + dr[1] * dr[1]);
    }

    function adaptiveStep(t0, t1, p0, p1) {
        // Split interval in the center
        let tm = 0.5 * (t0 + t1);
        let pm = fun(tm);
        
        // Calculate error
        let err = distanceToLineSegment(pm, p0, p1);

        // Interval small enough or error within target
        if ((t1 - t0 < minStep) || (err <= targetError)) {
            return [p0, pm];
        }

        // Recursive calls
        let seg0 = adaptiveStep(t0, tm, p0, pm);
        let seg1 = adaptiveStep(tm, t1, pm, p1);

        // Concatenate results excluding the duplicate middle point
        return seg0.concat(seg1.slice(1));
    }

    // Generate initial points
    let dif = Math.ceil((t1 - t0) / initialStep);
    let points = new Array(dif+1);

    for (let i = 0; i <= dif; i++) {
        let t = t0 + (t1 - t0) * (i / dif);
        let p = fun(t);
        points[i] = { t: t, p: p };
    }

    // Perform adaptive segmentation (with attention to array efficiency)
    let parts = new Array(dif);
    let total_points = 0;
    for (let i = 0; i < dif; i++) {
        let segment = adaptiveStep(points[i].t, points[i + 1].t, points[i].p, points[i + 1].p);
        segment = segment.slice(0, -1);
        parts[i] = segment;
        total_points += segment.length;
    }
    let result = new Array(total_points+1);
    total_points = 0;
    for (let i = 0; i < dif; i++) {
        segment = parts[i];
        for (let j = 0; j < segment.length; j++)
            result[total_points++] = segment[j];
    }
    result[total_points] = points[dif].p;

    return result;
}
