// 3D Implicit Surface Grapher

const NAME = "spirula.implicit2.";

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
    ["Mandelbrot Set", "u(x,y)=x^2-y^2;v(x,y)=2xy;u1(x,y)=u(u(x,y)+x,v(x,y)+y);v1(x,y)=v(u(x,y)+x,v(x,y)+y);u2(x,y)=u(u1(x,y)+x,v1(x,y)+y);v2(x,y)=v(u1(x,y)+x,v1(x,y)+y);u3(x,y)=u(u2(x,y)+x,v2(x,y)+y);v3(x,y)=v(u2(x,y)+x,v2(x,y)+y);u4(x,y)=u(u3(x,y)+x,v3(x,y)+y);v4(x,y)=v(u3(x,y)+x,v3(x,y)+y;u5(x,y)=u(u4(x,y)+x,v4(x,y)+y);v5(x,y)=v(u4(x,y)+x,v4(x,y)+y);u6(x,y)=u(u5(x,y)+x,v5(x,y)+y);v6(x,y)=v(u5(x,y)+x,v5(x,y)+y);sin(log(2,log(2,hypot(u6(x-1/2,y),v6(x-1/2,y))+1)))"],
];


document.body.onload = function (event) {
    console.log("onload");

    // init built-in functions
    initBuiltInFunctions(builtinFunctions);

    // init parser
    initMathFunctions(rawMathFunctionsShared.concat(rawMathFunctionsR));
    independentVariables = {
        'x': "mf_x()",
        'y': "mf_y()"
    };

    // init parameters
    var glsl = {};
    let rawParameters = [
        new GraphingParameter("bGrid", "checkbox-grid"),
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
            var extraVariables = getVariables(parsed.postfix, true);
            extraVariables.delete('e');
            if (extraVariables.size != 0) errmsg = "Definition not found: " + Array.from(extraVariables);
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
            console.log(glsl.glsl);
            console.log(glsl.glslgrad);
            if (!glsl.isCompatible)
                messageWarning("Graph may be incorrect on some devices.");
            updateShaderFunction(glsl.glsl, glsl.glslgrad, parameters);
        } catch (e) {
            console.error(e);
            messageError(e);
            updateShaderFunction(null, null);
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
        "../shaders/functions.glsl",
        "frag-shader.glsl",
        "../shaders/frag-imggrad.glsl",
        "../shaders/frag-aa.glsl"
    ], function () {
        console.log("shaders loaded");
        try {
            state.name = "spirula.implicit2.state";
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