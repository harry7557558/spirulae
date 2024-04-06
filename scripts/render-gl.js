
// ============================ MATRICES ==============================


function mat4(v) {
    if (typeof v == 'number') {
        return [[v, 0, 0, 0], [0, v, 0, 0], [0, 0, v, 0], [0, 0, 0, v]];
    }
    return [
        [v[0][0], v[0][1], v[0][2], v[0][3]],
        [v[1][0], v[1][1], v[1][2], v[1][3]],
        [v[2][0], v[2][1], v[2][2], v[2][3]],
        [v[3][0], v[3][1], v[3][2], v[3][3]]
    ];
}

// https://github.com/g-truc/glm/blob/0.9.5/glm/gtc/matrix_transform.inl
function mat4Perspective(fovy, aspect, zNear, zFar) {
    var tanHalfFovy = Math.tan(0.5 * fovy);
    var res = mat4(0.0);
    res[0][0] = 1.0 / (aspect * tanHalfFovy);
    res[1][1] = 1.0 / tanHalfFovy;
    res[2][2] = -(zFar + zNear) / (zFar - zNear);
    res[2][3] = -1.0;
    res[3][2] = -(2.0 * zFar * zNear) / (zFar - zNear);
    return res;
}
function mat4Scale(m, sc) {
    var res = mat4(1.0);
    if (typeof sc == "number")
        sc = new Array(3).fill(sc);
    for (var i = 0; i < sc.length; i++)
        res[i][i] *= sc[i];
    return mat4Mul(m, res);
}
function mat4Translate(m, v) {
    var res = mat4(m);
    for (var i = 0; i < 4; i++) {
        res[3][i] = m[0][i] * v[0] + m[1][i] * v[1] + m[2][i] * v[2] + m[3][i];
    }
    return res;
}
function mat4Rotate(m, angle, v) {
    var c = Math.cos(angle), s = Math.sin(angle);
    var axis = [], temp = [];
    for (var i = 0; i < 3; i++) {
        axis.push(v[i] / Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]));
        temp.push(axis[i] * (1.0 - c));
    }
    var rot = [
        [
            c + temp[0] * axis[0],
            temp[0] * axis[1] + s * axis[2],
            temp[0] * axis[2] - s * axis[1],
            0.0],
        [
            temp[1] * axis[0] - s * axis[2],
            c + temp[1] * axis[1],
            temp[1] * axis[2] + s * axis[0],
            0.0],
        [
            temp[2] * axis[0] + s * axis[1],
            temp[2] * axis[1] - s * axis[0],
            c + temp[2] * axis[2],
            0.0],
        [0.0, 0.0, 0.0, 1.0]
    ];
    return mat4Mul(m, rot);
}

function mat4Mul(a, b) {
    var c = mat4(0.0);
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            for (var k = 0; k < 4; k++) {
                c[j][i] += a[k][i] * b[j][k];
            }
        }
    }
    return c;
}
function mat4Inverse(m0) {
    var m = mat4(m0);
    var mi = mat4(1.0);
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) if (j != i) {
            var c = -m[j][i] / m[i][i];
            for (var k = 0; k < 4; k++) {
                m[j][k] += c * m[i][k];
                mi[j][k] += c * mi[i][k];
            }
        }
        var c = 1.0 / m[i][i];
        for (var k = 0; k < 4; k++) {
            m[i][k] *= c;
            mi[i][k] *= c;
        }
    }
    // console.log(mat4Mul(m0, mi));
    return mi;
}
function mat4Transpose(m0) {
    var m = mat4(0);
    for (var i = 0; i < 4; i++)
        for (var j = 0; j < 4; j++)
            m[i][j] = m0[j][i];
    return m;
}

function mat4ToFloat32Array(m) {
    var arr = [];
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            arr.push(m[i][j]);
        }
    }
    return new Float32Array(arr);
}


// ============================ WEBGL ==============================


function webglRaiseNotSupportedError() {
    throw new Error("Your web browser may not support WebGL&nbsp;2, which is required for this tool.<br/>\n" + 
        "Try restarting your browser if you are seeing this error after a crash.");
}


// request shader sources
let loadShaderSourceCache = {};
function getShaderSource(path) {
    if (!loadShaderSourceCache.hasOwnProperty(path))
        // throw new Error("Cache not found: " + path);
        return null;
    return loadShaderSourceCache[path];
}
function loadShaderSources(sources, callback) {
    function onFinish() {
        for (var i = 0; i < sources.length; i++) {
            var source = loadShaderSourceCache[sources[i]];
            const include_regex = /\n\#include\s+[\<\"](.*?)[\>\"]/;
            while (include_regex.test(source)) {
                var match = source.match(include_regex);
                var include_source = loadShaderSourceCache[match[1]];
                source = source.replace(match[0], "\n" + include_source + "\n");
            }
            loadShaderSourceCache[sources[i]] = source;
        }
        callback();
    }
    var nocache = "?nocache=" + Math.floor(Date.now() / 3600000);
    var promises = [];
    for (var i = 0; i < sources.length; i++) {
        promises.push(new Promise(
            function (resolve, reject) {
                var path = sources[i];
                var req = new XMLHttpRequest();
                req.open("GET", path + nocache);
                req.onload = function () {
                    // console.log(path);
                    if (this.status != 200)
                        reject("Error " + this.status);
                    loadShaderSourceCache[path] = this.responseText;
                    if (Object.keys(loadShaderSourceCache).length >= sources.length)
                        onFinish();
                };
                req.send();
            }
        ));
    }
    Promise.all(promises).then(
        function (response) { }
    ).catch(function (error) {
        console.error(error);
    });
}

// compile shaders and create a shader program
function createShaderProgram(gl, vsSource, fsSource) {
    if (vsSource == null) {
        vsSource = "#version 300 es\nin vec4 vertexPosition;out vec2 vXy;" +
            "void main(){vXy=vertexPosition.xy;gl_Position=vertexPosition;}";
    }
    function loadShader(gl, type, source) {
        if (location.hostname == "localhost")
            source += "\n#define _TIMESTAMP" + Date.now();  // prevent cache to test compile time
        var shader = gl.createShader(type); // create a new shader
        gl.shaderSource(shader, source); // send the source code to the shader
        gl.compileShader(shader); // compile shader
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { // check if compiled succeed
            var error = gl.getShaderInfoLog(shader);
            throw new Error("Shader compile error: " + error);
        }
        return shader;
    }
    var vShader = null, fShader = null;
    try {
        vShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        fShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    }
    catch (e) {
        if (vShader != null) gl.deleteShader(vShader);
        if (fShader != null) gl.deleteShader(fShader);
        throw e;
    }
    // create the shader program
    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vShader);
    gl.attachShader(shaderProgram, fShader);
    gl.linkProgram(shaderProgram);
    // if creating shader program failed
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(shaderProgram));
    return shaderProgram;
}

// create texture/framebuffer
function createSampleTexture(gl, width, height, floatTexture=false) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (floatTexture) {
        if (floatTexture == 'half') {
            if (!renderer.halfFloatExt)
                renderer.halfFloatExt = gl.getExtension("OES_texture_half_float");
        }
        if (floatTexture == 'half' && renderer.halfFloatExt)
            gl.texImage2D(gl.TEXTURE_2D, 0,
                gl.RGBA, width, height, 0, gl.RGBA,
                renderer.halfFloatExt.HALF_FLOAT_OES, null);
        else gl.texImage2D(gl.TEXTURE_2D, 0,
            gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    }
    else {
        gl.texImage2D(gl.TEXTURE_2D, 0,
            gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    return tex;
}
function createRenderTarget(gl, width, height, requireDepth = false,
        floatTexture=false, includeSampler=false) {
    let tex = createSampleTexture(gl, width, height, floatTexture);
    let framebuffer = gl.createFramebuffer();
    var depthbuffer = null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (requireDepth) {
        depthbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthbuffer);
    }
    var res = {
        texture: tex,
        framebuffer: framebuffer,
        depthbuffer: depthbuffer
    };
    if (includeSampler)
        res.sampler = createSampleTexture(gl, width, height, floatTexture);
    return res;
}
function destroyRenderTarget(gl, target) {
    gl.deleteTexture(target.texture);
    gl.deleteFramebuffer(target.framebuffer);
    if (target.depthbuffer != null)
        gl.deleteRenderbuffer(target.depthbuffer);
    if (target.sampler != null)
        gl.deleteTexture(target.sampler);
}

// create anti-aliasing object
function createAntiAliaser(gl, width, height, requireDepth) {
    var renderTarget = createRenderTarget(gl, width, height, requireDepth);
    var imgGradProgram = createShaderProgram(gl,
        getShaderSource("../shaders/vert-pixel.glsl"), getShaderSource("../shaders/frag-imggrad.glsl"));
    var imgGradTarget = createRenderTarget(gl, width, height);
    var aaProgram = createShaderProgram(gl,
        getShaderSource("../shaders/vert-pixel.glsl"), getShaderSource("../shaders/frag-aa.glsl"));
    return {
        renderTexture: renderTarget.texture,
        renderFramebuffer: renderTarget.framebuffer,
        imgGradProgram: imgGradProgram,
        imgGradTexture: imgGradTarget.texture,
        imgGradFramebuffer: imgGradTarget.framebuffer,
        aaProgram: aaProgram
    };
}
function destroyAntiAliaser(gl, antiAliaser) {
    gl.deleteFramebuffer(antiAliaser.renderFramebuffer);
    gl.deleteTexture(antiAliaser.renderTexture);
    gl.deleteProgram(antiAliaser.imgGradProgram);
    gl.deleteFramebuffer(antiAliaser.imgGradFramebuffer);
    gl.deleteTexture(antiAliaser.imgGradTexture);
    gl.deleteProgram(antiAliaser.aaProgram);
}


// set position buffer for vertex shader
function setPositionBuffer(gl, program) {
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


// GUI

// calculate the center of the screen excluding the control box
function calcScreenCenter() {
    let rect = document.getElementById("control").getBoundingClientRect();
    var w = window.innerWidth, h = window.innerHeight;
    var rl = rect.left, rb = h - rect.bottom;
    var cx = 0.5 * w, cy = 0.5 * h;
    if (rl > rb && rl > 0) cx = 0.5 * rl;
    else if (rb > 0) cy = 0.5 * rb;
    var com = { x: 2.0 * (cx / w - 0.5), y: 2.0 * (cy / h - 0.5) };
    com.x = 0.5 + 0.5 * Math.max(-0.6, Math.min(0.6, com.x));
    com.y = 0.5 + 0.5 * Math.max(-0.6, Math.min(0.6, com.y));
    return com;
}


// Export data

function getImage(pixelData, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');

    const imageData = new Uint8ClampedArray(pixelData);
    const imgData = new ImageData(imageData, w, h);

    for (let y = 0; y < h / 2; y++) {
        const topRowIndex = y * w * 4;
        const bottomRowIndex = (h - y - 1) * w * 4;
      
        // Swap rows
        for (let x = 0; x < w * 4; x++) {
            const temp = imgData.data[topRowIndex + x];
            imgData.data[topRowIndex + x] = imgData.data[bottomRowIndex + x];
            imgData.data[bottomRowIndex + x] = temp;
        }
    }

    ctx.putImageData(imgData, 0, 0);

    const base64PNG = canvas.toDataURL('image/png');
    return base64PNG;
}

function concatTypedArrayComponents(components) {
    // thanks ChatGPT
    let byteLength = 0;

    // Calculate the total byte length
    for (const component of components) {
        if (typeof component === 'string') {
            byteLength += new TextEncoder().encode(component).length;
        } else if (typeof component === 'number') {
            byteLength += 4; // Assuming 32-bit integers
        } else if (component instanceof ArrayBuffer || ArrayBuffer.isView(component)) {
            byteLength += component.byteLength;
        } else {
            throw new Error('Unsupported component type');
        }
    }

    // Create a Uint8Array with the calculated byte length
    const resultArray = new Uint8Array(byteLength);
    let offset = 0;

    // Concatenate components into the resultArray
    for (const component of components) {
        if (typeof component === 'string') {
            const encodedString = new TextEncoder().encode(component);
            resultArray.set(encodedString, offset);
            offset += encodedString.length;
        } else if (typeof component === 'number') {
            const intArray = new Uint32Array([component]);
            resultArray.set(new Uint8Array(intArray.buffer), offset);
            offset += 4;
        } else if (component instanceof ArrayBuffer || ArrayBuffer.isView(component)) {
            resultArray.set(new Uint8Array(component.buffer), offset);
            offset += component.byteLength;
        }
    }

    return resultArray;
}
