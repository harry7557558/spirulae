// 3D Implicit Surface Grapher

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

    // init parser
    independentVariables = {
        'x': "mf_x()",
        'y': "mf_y()"
    };

    // init parameters
    var glsl = {};
    let checkboxGrid = document.querySelector("#checkbox-grid");
    let checkboxLatex = document.getElementById("checkbox-latex");
    let checkboxAutoCompile = document.getElementById("checkbox-auto-compile");
    let buttonUpdate = document.getElementById("button-update");
    function getParams() {
        return {
            bGrid: checkboxGrid.checked,
            cLatex: checkboxLatex.checked,
            cAutoCompile: checkboxAutoCompile.checked,
        }
    }
    function setParams(params) {
        checkboxGrid.checked = params.bGrid;
        checkboxLatex.checked = params.cLatex;
        checkboxAutoCompile.checked = params.cAutoCompile;
    }
    try {
        var params = JSON.parse(localStorage.getItem("spirula.implicit2.params"));
        if (params != null) setParams(params);
    }
    catch (e) { console.error(e); }

    // init functions
    let select = document.querySelector("#builtin-functions");
    let input = document.querySelector("#equation-input");
    select.innerHTML += "<option value=''>Load example...</option>";
    for (var i = 0; i < builtinFunctions.length; i++) {
        let fun = builtinFunctions[i];
        select.innerHTML += "<option value=" + fun[1] + ">" + fun[0] + "</option>"
    }
    var initialExpr = "";
    try {
        initialExpr = localStorage.getItem("spirula.implicit2.input");
        if (initialExpr == null) throw initialExpr;
        select.childNodes[0].setAttribute("value", initialExpr);
        var selectId = 0;
        for (var i = 1; i < select.childNodes.length; i++) {
            var value = select.childNodes[i].value.replace(/\;/g, '\n');
            if (value == initialExpr.trim())
                selectId = i;
        }
        select.childNodes[selectId].selected = true;
    }
    catch (e) {
        select.childNodes[1].selected = true;
    }

    // called when update function
    function updateFunctionInput(forceRecompile) {
        let errorMessage = document.querySelector("#error-message");
        let texContainer = document.getElementById("mathjax-preview");
        if (!checkboxLatex.checked) texContainer.innerHTML = "";
        var expr = input.value;
        try {
            localStorage.setItem("spirula.implicit2.input", expr);
            localStorage.setItem("spirula.implicit2.params", JSON.stringify(getParams()));
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
                errorMessage.style.display = "inline-block";
                errorMessage.style.color = "red";
                errorMessage.innerHTML = errmsg;
                updateShaderFunction(null, null);
                if (checkboxLatex.checked)
                    updateLatex(parsed.latex, "white");
                return;
            }
            if (checkboxLatex.checked)
                updateLatex(parsed.latex, "white");
        }
        catch (e) {
            console.error(e);
            errorMessage.style.display = "inline-block";
            errorMessage.style.color = "red";
            errorMessage.innerHTML = e;
            updateShaderFunction(null, null);
            if (parsed != null && checkboxLatex.checked)
                updateLatex(parsed.latex, "red");
            return;
        }

        // compile shader
        if (!(checkboxAutoCompile.checked || forceRecompile === true)) {
            errorMessage.style.display = "inline-block";
            errorMessage.style.color = "white";
            errorMessage.innerHTML = "Parameter(s) have been changed. Click \"update\" to recompile shader.";
            return;
        }
        try {
            errorMessage.style.display = "none";
            if (checkboxLatex.checked)
                updateLatex(parsed.latex, "white");
            glsl = postfixToGlsl(parsed.postfix);
            console.log(glsl.glsl);
            console.log(glsl.glslgrad);
            if (!glsl.isCompatible) {
                errorMessage.style.display = "inline-block";
                errorMessage.style.color = "orange";
                errorMessage.innerHTML = "Graph may be incorrect on some devices.";
            }
            updateShaderFunction(glsl.glsl, glsl.glslgrad, getParams());
        } catch (e) {
            console.error(e);
            errorMessage.style.display = "inline-block";
            errorMessage.style.color = "red";
            errorMessage.innerHTML = e;
            updateShaderFunction(null, null);
            if (checkboxLatex.checked)
                updateLatex(parsed.latex, "red");
        }
    }

    // update on parameter change
    buttonUpdate.addEventListener("click", function () { updateFunctionInput(true); });
    checkboxLatex.addEventListener("input", updateFunctionInput);
    checkboxAutoCompile.addEventListener("input", updateFunctionInput);
    checkboxGrid.addEventListener("input", updateFunctionInput);
    select.addEventListener("input", function (event) {
        resetState();
        input.value = select.value.replaceAll(";", "\n");
        updateFunctionInput(true);
    });
    input.addEventListener("input", function (event) {
        select.value = initialExpr;
        updateFunctionInput();
    });
    window.addEventListener("keydown", function (event) {
        if (event.keyCode == 13 && (event.altKey || event.ctrlKey)) {
            event.preventDefault();
            updateFunctionInput(true);
        }
        else if (event.keyCode == 191 && event.ctrlKey) {
            let control = document.getElementById("control");
            let fps = document.getElementById("fps");
            if (control.style.display == "none")
                fps.style.display = control.style.display = "block";
            else fps.style.display = control.style.display = "none";
        }
    });
    input.value = select.value.replaceAll(";", "\n");

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