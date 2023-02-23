// 2D Complex Function Grapher

const NAME = "spirula.complex.";

const builtinFunctions = [
    ["Sine", "sin(2z)"],
    ["Double Reciprocal", "1/z^2"],
    ["Fifth Reciprocal", "z^-5+i"],
    ["Polynomial 3", "(z^3-4)^2"],
    ["Polynomial 6²", "(z^6+z)^6+z"],
    ["Blue Flower", "10/ln(z^5)^2*(-i-1)"],
    ["Radio Tunnel", "sin(ln(z^3))"],
    ["Leaky Hyperbola", "z*atan(1-z^2)"],
    ["Yellow Orange", "(1+i)*(ln(z)^10)^0.1"],
    ["CM Snowflower", "sqrt(ln(z^6)^5)*(-i-1)"],
    ["Trigonometric Spam", "sin(cos(tan(csc(sec(cot(sqrt(5(x+1)"],
    ["Mandelbrot Set", "f(x)=x^2+z;g=f(f(f(f(f(f(f(z;sin(ln(ln(1/|g|)-1))"],
    ["Julie Eyes", "f(x)=x^3+(-0.45+0.65i;g(z)=f(f(f(f(f(z;sin(zln(ln(0.5/|g(z)|)))"],
    ["Fractal Stamens", "f(z)=z^3+|z|;v=f(f(f(f(f(f(f(f(1/z;e^(iarg(z))*v"],
    ["Conjugate Tricorn", "f(x)=x^2+conj(x);f(f(f(f(f(f(z"],
    ["Magenta Horizon", "6(-i+1)(imag(z)conj(z))^-2"],
    ["Rainbow Nautilus", "ln(20e^(5iln(|z|))/z)csc(12arg(z))"],
    ["Log Real", "log(re(((1/z)^12+1)((2/z)^6+1)"],
    ["LnGamma", "lngamma(4z)"],
    ["Riemann Zeta", "zeta(10z)"],
];


document.body.onload = function (event) {
    console.log("onload");

    // init built-in functions
    initBuiltInFunctions(builtinFunctions);

    // init parser
    BuiltInMathFunctions.initMathFunctions(
        BuiltInMathFunctions.rawMathFunctionsShared
            .concat(BuiltInMathFunctions.rawMathFunctionsC)
    );
    MathParser.IndependentVariables = {
        'x': "z",
        'z': "z",
        'i': "mc_i()",
        'j': "mc_i()"
    };

    // init parameters
    initParameters([
        new GraphingParameter("bGrid", "checkbox-grid"),
        new GraphingParameter("bContourLinear", "checkbox-contour-linear"),
        new GraphingParameter("bContourLog", "checkbox-contour-log"),
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
        new UniformSlider("rBrightness", "slider-brightness", 0.001, 0.999, 0.6),
    ]);
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
};