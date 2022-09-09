// 3D Complex Function Grapher

const NAME = "spirula.complex3.";

const builtinFunctions = [
    ["csc(z)", "csc(z)"],
    ["tan(z)", "-tan(z)"],
    ["atanh(z)", "atanh(-z)"],
    ["Γ(z)", "gamma(z)"],
    ["Log Tower", "ln(z^-5)/5"],
    ["Five Pillars", "(-i-1)/(ln(z^5)^2)"],
    ["Eight Needles", "z^8+z^(1/8)"],
    ["Three Forks", "1/lngamma(sqrt(4z^3))"],
    ["Light Way", "exp(-cos(z))"],
    ["Conjugate Multibrot", "f(x)=conj(x)^4+z;g(z)=f(f(f(z;0.2/ln(g(z/2)+1"],
];


document.body.onload = function (event) {
    console.log("onload");

    // init built-in functions
    initBuiltInFunctions(builtinFunctions);

    // init parser
    initMathFunctions(rawMathFunctionsShared.concat(rawMathFunctionsC));
    mathFunctions['zeta'][1].glsl = "mc_zeta_fast(%1)";
    //mathFunctions['logzeta'][1].glsl = mathFunctions['lnzeta'][1].glsl = "mc_lnzeta_fast(%1)";
    independentVariables = {
        'x': "mf_z()",
        'z': "mf_z()",
        'i': "mc_i()",
        'j': "mc_i()"
    };

    // init parameters
    var glsl = {};
    let rawParameters = [
        new GraphingParameter("sHz", "select-hz"),
        new GraphingParameter("sStep", "select-step"),
        new GraphingParameter("bLight", "checkbox-light"),
        new GraphingParameter("bGrid", "checkbox-grid"),
        new GraphingParameter("bDiscontinuity", "checkbox-discontinuity"),
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
            console.log(parsed.postfix);
            var variables = getVariables(parsed.postfix, false);
            if (variables.has('x') && variables.has('z'))
                errmsg = "Cannot have both x and z as the independent variable.";
            var extraVariables = getVariables(parsed.postfix, true);
            extraVariables.delete('e');
            if (extraVariables.size != 0)
                errmsg = "Definition not found: " + Array.from(extraVariables);
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
            if (/mc_(ln)?((gamma)|(zeta))/.test(glsl.glsl))
                messageWarning("Function evaluation involves numerical approximation and may be inconsistent across devices.");
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
        "frag-premarch.glsl",
        "../shaders/frag-pool.glsl",
        "frag-raymarch.glsl",
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