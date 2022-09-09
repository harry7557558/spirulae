// 2D Complex Function Grapher

const NAME = "spirula.complex.";

const builtinFunctions = [
    ["Sine", "sin(2z)"],
    ["Double Reciprocal", "1/z^2"],
    ["Fifth Reciprocal", "z^-5-i"],
    ["Polynomial 3", "(z^3-4)^2"],
    ["Polynomial 6²", "(z^6+z)^6+z"],
    ["Blue Flower", "10/ln(z^5)^2*(-i-1)"],
    ["Radioactive", "sin(ln(z^3))"],
    ["Reciprocal Flower", "cos(7/z^1.5)"],
    ["Leaky Hyperbola", "z*atan(1-z^2)"],
    ["Yellow Orange", "(1+i)*(ln(z)^10)^0.1"],
    ["CM Snowflower", "sqrt(ln(z^6)^5)*(-i-1)"],
    ["Trigonometric Spam", "sin(cos(tan(csc(sec(cot(sqrt(5(x+1)"],
    ["Mandelbrot Set", "f(x)=x^2+z;f(f(f(f(f(f(f(z"],
    ["Conjugate Tricorn", "f(x)=x^2+conj(x);f(f(f(f(f(f(z"],
    ["Magenta Horizon", "6(-i+1)(imag(z)conj(z))^-2"],
    ["LnGamma", "lngamma(z)"],
    ["Zeta", "zeta(z)"],
];


document.body.onload = function (event) {
    console.log("onload");

    // init built-in functions
    initBuiltInFunctions(builtinFunctions);

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
    let rawParameters = [
        new GraphingParameter("bGrid", "checkbox-grid"),
        new GraphingParameter("bContourLinear", "checkbox-contour-linear"),
        new GraphingParameter("bContourLog", "checkbox-contour-log"),
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
    ];
    let checkboxLatex = document.getElementById("checkbox-latex");
    let checkboxAutoCompile = document.getElementById("checkbox-auto-compile");

    // called when update function
    function updateFunctionInput(forceRecompile = false) {
        let texContainer = document.getElementById("mathjax-preview");
        if (!checkboxLatex.checked) texContainer.innerHTML = "";
        var expr = document.getElementById("equation-input").value;
        var parameters = parameterToDict(rawParameters);
        try {
            localStorage.setItem(NAME + "input", expr);
            localStorage.setItem(NAME + "params", JSON.stringify(parameters));
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
            for (var i = 0; i < parsed.latex.length; i++)
                parsed.latex[i] = parsed.latex[i].replace(/=0$/, '');
            if (errmsg != "") {
                messageError(errmsg);
                updateShaderFunction(null);
                if (checkboxLatex.checked)
                    updateLatex(parsed.latex, "white");
                return;
            }
            if (checkboxLatex.checked)
                updateLatex(parsed.latex, "white");
        }
        catch (e) {
            console.error(e);
            messageError(e);
            updateShaderFunction(null);
            if (parsed != null && checkboxLatex.checked)
                updateLatex(parsed.latex, "red");
            return;
        }

        // compile shader
        if (!(checkboxAutoCompile.checked || forceRecompile === true)) {
            messageUpdate();
            return;
        }
        try {
            messageNone();
            if (checkboxLatex.checked)
                updateLatex(parsed.latex, "white");
            glsl = postfixToGlsl(parsed.postfix);
            glsl.glsl = glsl.glsl.replace(/([^\w])mf_/g, "$1mc_");
            glsl.glsl = glsl.glsl.replace(/float/g, "vec2");
            console.log(glsl.glsl);
            updateShaderFunction(glsl.glsl, glsl.glslgrad, parameters);
        } catch (e) {
            console.error(e);
            messageError(e);
            updateShaderFunction(null);
            if (checkboxLatex.checked)
                updateLatex(parsed.latex, "red");
        }
    }

    // init parameters (cont'd)
    activateParameters(rawParameters, updateFunctionInput);
    initParameters(rawParameters, updateFunctionInput);

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
            state.name = NAME + "state";
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