// 3D Implicit Surface Grapher

const NAME = "spirulae.ode2.";

// a lot of these are from the Desmos Discord server
// https://discord.gg/hNtrWCTwwa
const builtinFunctions = [
    ["Cooling", "k=3;T0=1;x_t=1;y_t=-k(y-T0)"],
    ["Circulation", "x_t=y;y_t=-x"],
    ["Swirl", "x_t=sin(x+y);y_t=cos(x-y)"],
    ["Swirl 2", "x_t=sin(x+y)+y;y_t=cos(x-y)"],
    ["Electric Field", "d1=(x-1)^2+y^2;d2=(x+1)^2+y^2;x_t=(x-1)/d1-(x+1)/d2;y_t=y/d1-y/d2"],
    ["Lotka-Volterra", "x_t=x-xy;y_t=xy-y"],
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
        'x': "x",
        'y': "y"
    };
    MathParser.DependentVariables = {
        'x_t': true,
        'y_t': true
    };

    // init code generator
    CodeGenerator.langs.js.config = CodeGenerator.langs.js.presets.ode2;

    // init parameters
    initParameters([
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
        new GraphingParameter("bGrid", "checkbox-grid"),
        new GraphingParameter("bLight", "checkbox-light"),
    ]);
    UpdateFunctionInputConfig.complexMode = false;
    UpdateFunctionInputConfig.implicitMode = false;
    UpdateFunctionInputConfig.enableMain = false;
    UpdateFunctionInputConfig.warnNaN = true;
    UpdateFunctionInputConfig.useGL = false;
    UpdateFunctionInputConfig.jsFunName = "funRaw";

    // main
    initMain([]);
};
