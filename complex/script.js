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
    IndependentVariables = {
        'x': "mf_z()",
        'z': "mf_z()",
        'i': "mc_i()",
        'j': "mc_i()"
    };

    // init parameters
    RawParameters = [
        new GraphingParameter("bGrid", "checkbox-grid"),
        new GraphingParameter("bContourLinear", "checkbox-contour-linear"),
        new GraphingParameter("bContourLog", "checkbox-contour-log"),
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
        "frag-shader.glsl",
        "../shaders/frag-imggrad.glsl",
        "../shaders/frag-aa.glsl"
    ]);
    initMathjax();
};