"use strict";

function calcTransformMatrix(state, inverse = true,
        screenCenter = { x: 0.5, y: 0.5 }) {
    var sc = (state.height / Math.min(state.width, state.height)) / state.scale;
    var aspect = canvas.width / canvas.height;
    var transformMatrix = mat4Perspective(
        0.25 * Math.PI,
        aspect,
        0.5 * sc, 10.0 * sc);
    var translateMatrix = mat4Translate(mat4(1.0),
        [2.0*screenCenter.x-1.0, 2.0*screenCenter.y-1.0, 0.0]);
    if (typeof state.ry == 'number' && isFinite(state.ry)) {
        translateMatrix = mat4Scale(translateMatrix, [1.0/aspect, 1.0]);
        translateMatrix = mat4Rotate(translateMatrix, state.ry, [0, 0, 1]);
        translateMatrix = mat4Scale(translateMatrix, [aspect, 1.0]);
    }
    transformMatrix = mat4Mul(translateMatrix, transformMatrix);
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
