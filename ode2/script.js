// 3D Implicit Surface Grapher

const NAME = "spirulae.ode2.";

// a lot of these are from the Desmos Discord server
// https://discord.gg/hNtrWCTwwa
const builtinFunctions = [
    ["Swirl", "x_t=sin(x+y)+y;y_t=cos(x-y)"],
    ["Cooling", "k=3;T0=1;y_x=-k(y-T0)"],
    ["Asymptotes", "y_x=y^4-y^3-3*y^2+y+2"],
    ["Circulation", "x_t=-y;y_t=x"],
    ["Swirls", "x_t=sin(x+y);y_t=cos(x-y)"],
    ["Pendulum", "#&#32;x:&#32;a;#&#32;y:&#32;a\';x_t=y;y_t=-sin(x)"],
    ["Electric Field", "d1=((x-1)^2+y^2)^(3/2);d2=((x+1)^2+y^2)^(3/2);x_t=(x-1)/d1-(x+1)/d2;y_t=y/d1-y/d2"],
    ["Lotka-Volterra", "x_t=x-xy;y_t=xy-y"],
    ["Spiral", "x_t=y+0.2x;y_t=0.2y-x"],
    ["Spiral Flower", "a=1+10sin(10atan2(y,x));x_t=y+0.2xa;y_t=0.2ya-x"],
    ["L-V Spiral", "x_t=x-xy+0.1y;y_t=xy-y+0.1x"],
    ["Gradient Curl", "f(x,y)=(x^2-1)^2+(y^2-1)^2;h=0.01;f_x=(f(x+h,y)-f(x-h,y))/(2h);f_y=(f(x,y+h)-f(x,y-h))/(2h);x_t=-f_y-0.1f_x;y_t=f_x-0.1f_y"],
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
        0: {
            'x_t': true,
            'y_t': true
        },
        1: {
            'y_x': true
        }
    };

    // init code generator
    CodeGenerator.langs.js.config = CodeGenerator.langs.js.presets.ode2;

    // init parameters
    initParameters([
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
        // new GraphingParameter("bGrid", "checkbox-grid"),
        new GraphingParameter("bLight", "checkbox-light"),
        new GraphingParameter("cBidirection", "checkbox-bidirection"),
        new GraphingParameter("sField", "select-field"),
        new UniformSlider("rField", "slider-field", -1.4, 0.8, 0.0),
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
