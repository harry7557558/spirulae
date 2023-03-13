// 3D Implicit Surface Grapher

const NAME = "spirula.paramsurf.";

const builtinFunctions = [
    ["Sphere", "x^2+y^2+z^2=1"],
];


document.body.onload = function (event) {
    console.log("onload");

    // init built-in functions
    initBuiltInFunctions(builtinFunctions);

    // init parser
    BuiltInMathFunctions.initMathFunctions(
        BuiltInMathFunctions.rawMathFunctionsShared
            .concat(BuiltInMathFunctions.rawMathFunctionsR)
    );
    MathParser.IndependentVariables = {
        'u': "u",
        'v': "v"
    };
    MathParser.DependentVariables = {
        'x': true,
        'y': true,
        'z': true
    };

    // init parameters
    initParameters([
        new GraphingParameter("sStep", "select-step"),
        new GraphingParameter("bLight", "checkbox-light"),
        new GraphingParameter("bYup", "checkbox-yup"),
        new GraphingParameter("bGrid", "checkbox-grid"),
        new GraphingParameter("sColor", "select-color"),
        new GraphingParameter("bTransparency", "checkbox-transparency"),
        new GraphingParameter("bDiscontinuity", "checkbox-discontinuity"),
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
        new UniformSlider("rTheta", "slider-theta", -0.5 * Math.PI, 1.5 * Math.PI, Math.PI / 6.0),
        new UniformSlider("rPhi", "slider-phi", 0, Math.PI, Math.PI / 6.0),
    ]);
    UpdateFunctionInputConfig.complexMode = false;
    UpdateFunctionInputConfig.implicitMode = false;
    UpdateFunctionInputConfig.valMode = false;
    UpdateFunctionInputConfig.warnNaN = true;
    UpdateFunctionInputConfig.warnNumerical = false;

    // config code generator
    CodeGenerator.langs.glsl.fun = "vec3 {%funname%}(float u, float v) {\n\
{%funbody%}\n\
    return vec3({%x%}, {%y%}, {%z%});\n\
}"

    // init viewport
    resetState({
        rz: -0.9 * Math.PI,
        rx: -0.4 * Math.PI,
        scale: 0.5
    }, false);

    // main
    initMain([
        "../shaders/vert-pixel.glsl",
        "../shaders/functions.glsl",
        "../shaders/frag-pool.glsl",
        "vert.glsl",
        "frag.glsl",
        "../shaders/frag-imggrad.glsl",
        "../shaders/frag-aa.glsl"
    ]);
};
