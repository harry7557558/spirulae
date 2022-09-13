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
    IndependentVariables = {
        'x': "mf_z()",
        'z': "mf_z()",
        'i': "mc_i()",
        'j': "mc_i()"
    };

    // init parameters
    RawParameters = [
        new GraphingParameter("sHz", "select-hz"),
        new GraphingParameter("sStep", "select-step"),
        new GraphingParameter("bLight", "checkbox-light"),
        new GraphingParameter("bGrid", "checkbox-grid"),
        new GraphingParameter("bDiscontinuity", "checkbox-discontinuity"),
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
    ];
    activateParameters();
    initParameters();
    UpdateFunctionInputConfig.complexMode = true;
    UpdateFunctionInputConfig.equationMode = false;
    UpdateFunctionInputConfig.warnNaN = false;
    UpdateFunctionInputConfig.warnNumerical = true;

    // main
    initMain([
        "../shaders/vert-pixel.glsl",
        "../shaders/complex-zeta.glsl",
        "../shaders/complex.glsl",
        "frag-premarch.glsl",
        "../shaders/frag-pool.glsl",
        "frag-raymarch.glsl",
        "../shaders/frag-imggrad.glsl",
        "../shaders/frag-aa.glsl"
    ]);
    initMathjax();
};