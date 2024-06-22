// 3D Implicit Surface Grapher

const NAME = "spirulae.paramcurve2.";

// a lot of these are from the Desmos Discord server
// https://discord.gg/hNtrWCTwwa
const builtinFunctions = [
    ["Ellipse", "vec2(2cos(2pit),1.6sin(2pit))"],
    ["Lissajous", "x=2cos(10pit+pi/4);y=2sin(8pit)"],
    ["Butterfly", "s=12pit;r=exp(cos(s))-2cos(4s)-sin^5(s/12);vec2(rsin(s),rcos(s))"],
    ["Mandala", "s=20pit;x=-1.9cos(s)+cos(1.9s);y=-1.9sin(s)+sin(1.9s)"],
    ["Bouquet", "s=2pit;vec2(-sin(s)-0.3cos(s),0.1sin(s)-0.5cos(s))*sin(5s)+vec2(0,1-0.5*(sin(5s)-1)^2)"],
    ["Two Spirals", "s=logit(t);k=1.5;vec2(tanh(s))+2vec2(sin(|s|^k),cos(|s|^k))/(abs(s)+1)"],
];



function initLangpack() {
    CodeGenerator.langs.js.presets.paramcurve2 = {
        fun: [
            "function(t) {\n\
{%funbody%};\n\
    return { x: {%x%}, y: {%y%} };\n\
}"
        ],
        prefix: 'v',
        def: "    let {%varname%}={%expr%};",
        joiner: "\n"
    };

    let fun = CodeGenerator.langs.js.presets.paramcurve2.fun;
    for (var vi = 0; vi < 2; vi++) {
        if (vi == 0)
            continue;
        let src = fun[0];
        if (vi == 1) src = src
            .replaceAll('{%x', "{%val[0]")
            .replaceAll('{%y', "{%val[1]");
        fun.push(src);
    }
}

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
        't': "t"
    };
    MathParser.DependentVariables = {
        0: { 'x': true, 'y' : true },
        1: { 'val': true },
        'val': { type: 'vec2' }
    };

    // init code generator
    initLangpack();
    CodeGenerator.langs.js.config = CodeGenerator.langs.js.presets.paramcurve2;

    // init parameters
    initParameters([
        new GraphingParameter("bLight", "checkbox-light"),
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
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
