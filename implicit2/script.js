// 3D Implicit Surface Grapher

const NAME = "spirulae.implicit2.";

// a lot of these are from the Desmos Discord server
// https://discord.gg/hNtrWCTwwa
const builtinFunctions = [
    ["Circle", "x^2+y^2-1"],
    ["A6 Heart", "(x^2+y^2-1)^3=2x^2y^3"],
    ["Radical Heart", "x^2+(1.3y-sqrt(|x|))^2=1"],
    ["Tooth", "2x^3(x-2)+2x+y^3(y-2)"],
    ["Quatrefoil", "sin(6atan(y,x))-4xy"],
    ["Hyperbolic Plane", "sin(4x/(x^2+y^2))sin(4y/(x^2+y^2))=0"],
    ["Rounded Square", "max(|x|,|y|,x^3-y^3)=1"],
    ["Flower 1", "sqrt(x^2+y^2)=0.7+0.3arcsin(sin(5atan2(y,x)))"],
    ["Flower 2", "r=sqrt(x^2+y^2);a=atan2(y,x);7-3sin(5/2a)^10-5sin(5a)^10=6r"],
    ["Swirl", "r=15root(4,x^2+y^2);xsin(r)+ycos(r)=0.75(x^2+y^2)"],
    ["Star 6", "(x^2+y^2)(1+10sin(3atan(x,y))^2)=2"],
    ["Evil 13", "r=sqrt(x^2+y^2);5-2|sin(13/2atan(y,x)-sin(10r))|=4sqrt(r)"],
    ["Abs Spam", "|(|(|x|+|y|)|-2|(|x|-|y|)|+|(|y-x|+|y+x|)-.8|)-.4|=.15"],
    ["Swirls", "x1=3(x+3);y1=3(y+4);cos(hypot(y1sin(x1),x1cos(y1))-atan(y1sin(x1),x1cos(y1)))"],
    ["Puzzle Pieces", "sin(6x)+sin(6y)=(sin(12x)+cos(6y))sin(12y)"],
    ["Tangent", "(y-tan(2x))tan(y)"],
    ["Eyes", "a=3(y+x+1);b=3(y-x+1);sin(min(a*sin(b),b*sin(a)))-cos(max(a*cos(b),b*cos(a)))=(3-2y)/9+((2x^2+y^2)/6)^3"],
    ["Fractal Sine", "sin(x)sin(y)+sin(2x)sin(2y)/2+sin(4x)sin(4y)/3+sin(8x)sin(8y)/4+sin(17x)sin(16y)/5+sin(32x)sin(32y)/6"],
    // ["Mandelbrot Set", "u(x,y)=x^2-y^2;v(x,y)=2xy;u1(x,y)=u(u(x,y)+x,v(x,y)+y);v1(x,y)=v(u(x,y)+x,v(x,y)+y);u2(x,y)=u(u1(x,y)+x,v1(x,y)+y);v2(x,y)=v(u1(x,y)+x,v1(x,y)+y);u3(x,y)=u(u2(x,y)+x,v2(x,y)+y);v3(x,y)=v(u2(x,y)+x,v2(x,y)+y);u4(x,y)=u(u3(x,y)+x,v3(x,y)+y);v4(x,y)=v(u3(x,y)+x,v3(x,y)+y;u5(x,y)=u(u4(x,y)+x,v4(x,y)+y);v5(x,y)=v(u4(x,y)+x,v4(x,y)+y);u6(x,y)=u(u5(x,y)+x,v5(x,y)+y);v6(x,y)=v(u5(x,y)+x,v5(x,y)+y);sin(log(2,log(2,hypot(u6(x-1/2,y),v6(x-1/2,y))+1)))"],
    ["Mandelbrot Set", "c=(x-1/2)+yi;f(z1)=z1^2+c;g=f(f(f(f(f(f(c;sin(log2(log2(|g|^2+1))"],
];


function initLangpack() {
    CodeGenerator.langs.glsl.presets.implicit2 = {
        fun: "float {%funname%}(float x, float y) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
        prefix: 'v',
        def: "    float {%varname%} = {%expr%};",
        joiner: "\n"
    };
    CodeGenerator.langs.glsl.presets.implicit2_compact = {
        fun: "float {%funname%}(float x, float y) {\n\
    float {%funbody%};\n\
    return {%val%};\n\
}",
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };
    CodeGenerator.langs.glsl.presets.implicit2g = {
        fun: "vec3 {%funname%}(float x, float y) {\n\
{%funbody%}\n\
    return vec3({%val;x%}, {%val;y%}, {%val%});\n\
}",
        prefix: 'v',
        def: "    float {%varname%} = {%expr%};",
        joiner: "\n"
    };
    CodeGenerator.langs.glsl.presets.implicit2g_compact = {
        fun: "vec3 {%funname%}(float x, float y) {\n\
    float {%funbody%};\n\
    return vec3({%val;x%}, {%val;y%}, {%val%});\n\
}",
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };
    CodeGenerator.langs.glsl.presets.implicit2h = {
        fun: "mat3 {%funname%}(float x, float y) {\n\
{%funbody%}\n\
    return mat3({%val;x,x%}, {%val;x,y%}, {%val;x%},\n\
                {%val;y,x%}, {%val;y,y%}, {%val;y%},\n\
                {%val;x%}, {%val;y%}, {%val%});\n\
}",
        prefix: 'v',
        def: "    float {%varname%} = {%expr%};",
        joiner: "\n"
    };
    CodeGenerator.langs.glsl.presets.implicit2h_compact = {
        fun: "mat3 {%funname%}(float x, float y) {\n\
    float {%funbody%};\n\
    return mat3({%val;x,x%}, {%val;x,y%}, {%val;x%}, {%val;y,x%}, {%val;y,y%}, {%val;y%}, {%val;x%}, {%val;y%}, {%val%});\n\
}",
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };
    CodeGenerator.langs.cppf.presets.implicit2 = {
        fun: "float {%funname%}(float x, float y) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
        prefix: 'v',
        def: "    float {%varname%} = {%expr%};",
        joiner: "\n"
    };
    CodeGenerator.langs.cppf.presets.implicit2_compact = {
        fun: "float {%funname%}(float x, float y) {\n\
    float {%funbody%};\n\
    return {%val%};\n\
}",
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };
    CodeGenerator.langs.cppf.presets.implicit2g = {
        fun: "float {%funname%}(float x, float y, float *gx, float *gy) {\n\
{%funbody%}\n\
    *gx = {%val;x%}, *gy = {%val;y%};\n\
    return {%val%};\n\
}",
        prefix: 'v',
        def: "    float {%varname%} = {%expr%};",
        joiner: "\n"
    };
    CodeGenerator.langs.cppf.presets.implicit2g_compact = {
        fun: "float {%funname%}(float x, float y, float *gx, float *gy) {\n\
    float {%funbody%};\n\
    *gx = {%val;x%}, *gy = {%val;y%};\n\
    return {%val%};\n\
}",
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };
    CodeGenerator.langs.cppd.presets.implicit2 = {
        fun: "double {%funname%}(double x, double y) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
        prefix: 'v',
        def: "    double {%varname%} = {%expr%};",
        joiner: "\n"
    };
    CodeGenerator.langs.cppd.presets.implicit2_compact = {
        fun: "double {%funname%}(double x, double y) {\n\
    double {%funbody%};\n\
    return {%val%};\n\
}",
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };
    CodeGenerator.langs.cppd.presets.implicit2g = {
        fun: "double {%funname%}(double x, double y, double *gx, double *gy) {\n\
{%funbody%}\n\
    *gx = {%val;x%}, *gy = {%val;y%};\n\
    return {%val%};\n\
}",
        prefix: 'v',
        def: "    double {%varname%} = {%expr%};",
        joiner: "\n"
    };
    CodeGenerator.langs.cppd.presets.implicit2g_compact = {
        fun: "double {%funname%}(double x, double y, double z, double *gx, double *gy, double *gz) {\n\
    double {%funbody%};\n\
    *gx = {%val;x%}, *gy = {%val;y%}, *gz = {%val;z%};\n\
    return {%val%};\n\
}",
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };
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
        'x': "x",
        'y': "y"
    };

    // init code generator
    initLangpack();
    var updateLangpack = function() {
        let v = document.getElementById("select-grad").value;
        CodeGenerator.langs.glsl.config = CodeGenerator.langs.glsl.presets
            ['implicit2' + ['','g','h'][Number(v)] + '_compact'];
        CodeGenerator.langs.js.config = CodeGenerator.langs.js.presets.implicit2;
    }
    updateLangpack();
    UpdateFunctionInputConfig.callbackBefore = updateLangpack;

    // init parameters
    initParameters([
        new GraphingParameter("bGrid", "checkbox-grid"),
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
        new GraphingParameter("sDebug", "select-grad"),
    ]);
    UpdateFunctionInputConfig.complexMode = false;
    UpdateFunctionInputConfig.implicitMode = true;
    UpdateFunctionInputConfig.warnNaN = true;
    UpdateFunctionInputConfig.jsFunName = "funRawJS";

    // main
    initMain([
        "../shaders/vert-pixel.glsl",
        "../shaders/functions.glsl",
        "frag-shader.glsl",
        "../shaders/frag-imggrad.glsl",
        "../shaders/frag-aa.glsl",
        "../shaders/complex-zeta.glsl",
        "../shaders/complex.glsl",
    ]);
};

function exportAllFunctions(lang, grad = false) {
    let langpack = CodeGenerator.langs[lang];
    let oldConfig = langpack.config;
    langpack.config = langpack.presets[grad ? 'implicit2g_compact' : 'implicit2_compact'];
    var funs = builtinFunctions;
    var names = [], exprs = [];
    for (var i = 0; i < funs.length; i++) {
        var name = 'fun' + funs[i][0].replace(/[^\w]/g, '');
        console.log(name);
        var str = funs[i][1].replaceAll("&#32;", ' ')
        var expr = MathParser.parseInput(str);
        names.push(name);
        exprs.push({ val: expr.val[0] });
    }
    var res = CodeGenerator.postfixToSource(exprs, names, lang);
    console.log(res.source);
    langpack.config = oldConfig;
}

function exportCurrentFunction(lang, grad = false) {
    let langpack = CodeGenerator.langs[lang];
    let oldConfig = langpack.config;
    langpack.config = langpack.presets[grad ? 'implicit2g' : 'implicit2'];
    var str = document.getElementById("equation-input").value;
    var expr = MathParser.parseInput(str).val[0];
    var res = CodeGenerator.postfixToSource(
        [{ val: expr }], ["fun"], lang);
    console.log(res.source);
    langpack.config = oldConfig;
}
