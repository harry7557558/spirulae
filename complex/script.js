// 3D Implicit Surface Grapher

// a lot of these are from the Desmos Discord server
// https://discord.gg/hNtrWCTwwa
const builtinFunctions = [
    ["Double Reciprocal", "1/z^2"],
    ["Fifth Reciprocal", "z^-5-i"],
    ["Polynomial 3", "(z^3-4)^2"],
    ["Polynomial 6²", "(z^6+z)^6+z"],
    ["Blue Flower", "10/ln(z^5)^2*(-i-1)"],
    ["Radioactive", "sin(ln(z^2.8))"],
    ["Reciprocal Flower", "cos(7/z^1.5)"],
    ["Leaky Hyperbola", "z*atan(1-z^2)"],
    ["Yellow Orange", "(1+i)*(ln(z)^10)^0.1"],
    ["CM Snowflower", "sqrt(ln(z^6)^5)*(-i-1)"],
    ["Trigonometric Spam", "sin(cos(tan(csc(sec(cot(sqrt(5(x+1)"],
    ["Mandelbrot Set", "f(x)=x^2+z;f(f(f(f(f(f(f(z"],
    ["Conjugate Tricorn", "f(x)=x^2+conj(x);f(f(f(f(f(f(z"],
    ["Magenta Horizon", "6(-i+1)(imag(z)conj(z))^-2"]
];


document.body.onload = function (event) {
    console.log("onload");

    // init parser
    initMathFunctions(rawMathFunctionsShared.concat(rawMathFunctionsC));
    independentVariables = {
        'x': "mf_z()",
        'z': "mf_z()",
        'i': "mc_i()",
        'j': "mc_i()"
    };

    // init parameters
    var glsl = {};
    let checkboxGrid = document.querySelector("#checkbox-grid");
    let checkboxLatex = document.getElementById("checkbox-latex");
    let checkboxAutoCompile = document.getElementById("checkbox-auto-compile");
    let buttonUpdate = document.getElementById("button-update");
    function getParams() {
        return {
            bGrid: checkboxGrid.checked,
            cLatex: checkboxLatex.checked,
            cAutoCompile: checkboxAutoCompile.checked,
        }
    }
    function setParams(params) {
        checkboxGrid.checked = params.bGrid;
        checkboxLatex.checked = params.cLatex;
        checkboxAutoCompile.checked = params.cAutoCompile;
    }
    try {
        var params = JSON.parse(localStorage.getItem("spirula.complex.params"));
        if (params != null) setParams(params);
    }
    catch (e) { console.error(e); }

    // init functions
    let select = document.querySelector("#builtin-functions");
    let input = document.querySelector("#equation-input");
    select.innerHTML += "<option value=''>Load example...</option>";
    for (var i = 0; i < builtinFunctions.length; i++) {
        let fun = builtinFunctions[i];
        select.innerHTML += "<option value=" + fun[1] + ">" + fun[0] + "</option>"
    }
    var initialExpr = "";
    try {
        initialExpr = localStorage.getItem("spirula.complex.input");
        if (initialExpr == null) throw initialExpr;
        select.childNodes[0].setAttribute("value", initialExpr);
        var selectId = 0;
        for (var i = 1; i < select.childNodes.length; i++) {
            var value = select.childNodes[i].value.replace(/\;/g, '\n');
            if (value == initialExpr.trim())
                selectId = i;
        }
        select.childNodes[selectId].selected = true;
    }
    catch (e) {
        select.childNodes[1].selected = true;
    }

    // called when update function
    function updateFunctionInput(forceRecompile) {
        let errorMessage = document.querySelector("#error-message");
        let texContainer = document.getElementById("mathjax-preview");
        if (!checkboxLatex.checked) texContainer.innerHTML = "";
        var expr = input.value;
        try {
            localStorage.setItem("spirula.complex.input", expr);
            localStorage.setItem("spirula.complex.params", JSON.stringify(getParams()));
        } catch (e) { console.error(e); }

        // parse input
        var parsed = null;
        try {
            parsed = parseInput(expr);
            var errmsg = "";
            if (parsed.postfix.length == 0) errmsg = "No function to graph.";
            if (parsed.postfix.length > 1) errmsg = "Multiple main equations found.";
            parsed.postfix.push([]);
            parsed.postfix = parsed.postfix[0];
            var extraVariables = getVariables(parsed.postfix, true);
            extraVariables.delete('e');
            if (extraVariables.size != 0) errmsg = "Definition not found: " + Array.from(extraVariables);
            if (errmsg != "") {
                errorMessage.style.display = "inline-block";
                errorMessage.style.color = "red";
                errorMessage.innerHTML = errmsg;
                updateShaderFunction(null, null);
                if (checkboxLatex.checked)
                    updateLatex(parsed.latex, "white");
                return;
            }
            if (checkboxLatex.checked)
                updateLatex(parsed.latex, "white");
        }
        catch (e) {
            console.error(e);
            errorMessage.style.display = "inline-block";
            errorMessage.style.color = "red";
            errorMessage.innerHTML = e;
            updateShaderFunction(null, null);
            if (parsed != null && checkboxLatex.checked)
                updateLatex(parsed.latex, "red");
            return;
        }

        // compile shader
        if (!(checkboxAutoCompile.checked || forceRecompile === true)) {
            errorMessage.style.display = "inline-block";
            errorMessage.style.color = "white";
            errorMessage.innerHTML = "Parameter(s) have been changed. Click \"update\" to recompile shader.";
            return;
        }
        try {
            errorMessage.style.display = "none";
            if (checkboxLatex.checked)
                updateLatex(parsed.latex, "white");
            glsl = postfixToGlsl(parsed.postfix);
            glsl.glsl = glsl.glsl.replace(/([^\w])mf_/g, "$1mc_");
            glsl.glsl = glsl.glsl.replace(/float/g, "vec2");
            console.log(glsl.glsl);
            updateShaderFunction(glsl.glsl, glsl.glslgrad, getParams());
        } catch (e) {
            console.error(e);
            errorMessage.style.display = "inline-block";
            errorMessage.style.color = "red";
            errorMessage.innerHTML = e;
            updateShaderFunction(null, null);
            if (checkboxLatex.checked)
                updateLatex(parsed.latex, "red");
        }
    }

    // update on parameter change
    buttonUpdate.addEventListener("click", function () { updateFunctionInput(true); });
    checkboxLatex.addEventListener("input", updateFunctionInput);
    checkboxAutoCompile.addEventListener("input", updateFunctionInput);
    checkboxGrid.addEventListener("input", updateFunctionInput);
    select.addEventListener("input", function (event) {
        resetState();
        input.value = select.value.replaceAll(";", "\n");
        updateFunctionInput(true);
    });
    input.addEventListener("input", function (event) {
        select.value = initialExpr;
        updateFunctionInput();
    });
    window.addEventListener("keydown", function (event) {
        if (event.keyCode == 13 && (event.altKey || event.ctrlKey)) {
            event.preventDefault();
            updateFunctionInput(true);
        }
        else if (event.keyCode == 191 && event.ctrlKey) {
            let control = document.getElementById("control");
            let fps = document.getElementById("fps");
            if (control.style.display == "none")
                fps.style.display = control.style.display = "block";
            else fps.style.display = control.style.display = "none";
        }
    });
    input.value = select.value.replaceAll(";", "\n");

    // main
    loadShaderSources([
        "../shaders/vert-pixel.glsl",
        "../shaders/complex-zeta.glsl",
        "../shaders/complex.glsl",
        "frag-shader.glsl",
        "../shaders/frag-imggrad.glsl",
        "../shaders/frag-aa.glsl"
    ], function () {
        console.log("shaders loaded");
        try {
            state.name = "spirula.complex.state";
            initWebGL();
            updateFunctionInput(true);
            initRenderer();
        } catch (e) {
            console.error(e);
            document.body.innerHTML = "<h1 style='color:red;'>" + e + "</h1>";
        }
    });
    initMathjax();
};