// 2D Complex Function Grapher

const NAME = "spirulae.complex.";

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
    ["Julia Eyes", "f(x)=x^3+(-0.45+0.65i;g(z)=f(f(f(f(f(z;sin(zln(ln(0.5/|g(z)|)))"],
    ["Fractal Stamens", "f(z)=z^3+|z|;v=f(f(f(f(f(f(f(f(1/z;e^(iarg(z))*v"],
    ["Conjugate Tricorn", "f(x)=x^2+conj(x);f(f(f(f(f(f(z"],
    ["Magenta Horizon", "6(-i+1)(imag(z)conj(z))^-2"],
    ["Rainbow Nautilus", "ln(20e^(5iln(|z|))/z)csc(12arg(z))"],
    ["Log Real", "log(real(((1/z)^12+1)((2/z)^6+1)"],
    ["LnGamma", "lngamma(4z)"],
    ["Riemann Zeta", "zeta(10z)"],
    ["Power Fractal", "z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z^z"],
];


document.body.onload = function (event) {
    console.log("onload");

    // init built-in functions
    initBuiltInFunctions(builtinFunctions);

    // init parser
    BuiltInMathFunctions.initMathFunctions(
        BuiltInMathFunctions.rawMathFunctionsShared
            // .concat(BuiltInMathFunctions.rawMathFunctionsC)
            .concat(BuiltInMathFunctions.rawMathFunctionsR)
    );
    MathParser.IndependentVariables = {
        'z_real': "z_real",
        'z_imag': "z_imag",
        'x': MathParser.exprToPostfix("z_real+z_imag*i", {}),
        'z': MathParser.exprToPostfix("z_real+z_imag*i", {}),
    };
    MathParser.DependentVariables = {
        'val': { required: true, type: 'complex' }
    };
    CodeGenerator.langs.glsl.config = {
        fun: "vec2 {%funname%}(vec2 z) {\n\
    float z_real = z.x, z_imag = z.y;\n\
    float {%funbody%};\n\
    return vec2({%val[0]%}, {%val[1]%});\n\
}",
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };
    MathParser.complexMode = true;

    // init parameters
    initParameters([
        new GraphingParameter("bGrid", "checkbox-grid"),
        new GraphingParameter("bContourLinear", "checkbox-contour-linear"),
        new GraphingParameter("bContourLog", "checkbox-contour-log"),
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
        new UniformSlider("rBrightness", "slider-brightness", 0.001, 0.999, 0.6),
    ]);
    // UpdateFunctionInputConfig.complexMode = true;
    UpdateFunctionInputConfig.implicitMode = false;
    UpdateFunctionInputConfig.warnNaN = false;

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