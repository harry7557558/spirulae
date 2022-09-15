// Refactored from script.js's


// Built-in functions

function initBuiltInFunctions(builtinFunctions) {
    let funSelect = document.querySelector("#builtin-functions");
    funSelect.innerHTML += "<option value=''>Load example...</option>";
    for (var i = 0; i < builtinFunctions.length; i++) {
        let fun = builtinFunctions[i];
        funSelect.innerHTML += "<option value=" + fun[1] + ">" + fun[0] + "</option>"
    }
}


// name: start with a lowercase letter
//  - b/c: checkbox (boolean)
//  - s: selector
//  - r: range/slider (??)
function GraphingParameter(name, id) {
    this.element = document.getElementById(id);
    this.name = name;
    this.getValue = function () {
        if (this.name[0] == "b" || this.name[0] == 'c')
            return this.element.checked;
        if (this.name[0] == "s")
            return this.element.value;
        if (this.name[0] == "r")
            return this.element.value;
    };
    this.setValue = function (value) {
        if (this.name[0] == "b" || this.name[0] == 'c')
            this.element.checked = value;
        if (this.name[0] == "s")
            this.element.value = value;
        if (this.name[0] == "r")
            this.element.value = value;
    };
}

var RawParameters = [];

// for saving in the local storage
function parameterToDict(parameters) {
    var dict = {};
    for (var i = 0; i < parameters.length; i++) {
        dict[parameters[i].name] = parameters[i].getValue();
    }
    return dict;
}
function setParameters(parameters, dict) {
    for (var i = 0; i < parameters.length; i++) {
        var name = parameters[i].name;
        if (dict.hasOwnProperty(name) && dict[name] !== "")
            parameters[i].setValue(dict[name]);
    }
}

// init input and parameters, returns parameters
function initParameters(parameters) {
    RawParameters = parameters;
    // set event listeners
    for (var i = 0; i < RawParameters.length; i++) {
        RawParameters[i].element.addEventListener("input", function (event) {
            updateFunctionInput(false);
        });
    }
    // get parameters and input from local storage
    try {
        var params = JSON.parse(localStorage.getItem(NAME + "params"));
        if (params != null) setParameters(RawParameters, params);
    }
    catch (e) { console.error(e); }
    let funSelect = document.getElementById("builtin-functions");
    let funInput = document.getElementById("equation-input");
    var initialExpr = "";
    try {  // check if input is a built-in function
        initialExpr = localStorage.getItem(NAME + "input");
        if (initialExpr == null) throw initialExpr;
        funSelect.childNodes[0].setAttribute("value", initialExpr);
        var selectId = 0;
        for (var i = 1; i < funSelect.childNodes.length; i++) {
            var value = funSelect.childNodes[i].value.replace(/\;/g, '\n');
            if (value == initialExpr.trim())
                selectId = i;
        }
        funSelect.childNodes[selectId].selected = true;
    }
    catch (e) {
        funSelect.childNodes[1].selected = true;
    }
    // event listeners
    document.getElementById("canvas").addEventListener("webglcontextlost", function (event) {
        event.preventDefault();
        setTimeout(function () {  // comment input when WebGL context lost
            var input = funInput.value.split('\n');
            for (var i = 0; i < input.length; i++)
                input[i] = '#' + input[i];
            input = input.join('\n');
            localStorage.setItem(NAME + "input", input);
        }, 100);
    });
    document.getElementById("button-update").addEventListener("click",
        function (event) { updateFunctionInput(true); });
    funSelect.addEventListener("input", function (event) {
        // selecting a new function
        resetState();
        funInput.value = funSelect.value.replaceAll(";", "\n");
        updateFunctionInput(true);
    });
    funInput.addEventListener("input", function (event) {
        // typing
        funSelect.value = initialExpr;
        updateFunctionInput(false);
    });
    window.addEventListener("keydown", function (event) {
        // Ctrl/Alt + Enter update function
        if (event.key == "Enter" && (event.altKey || event.ctrlKey)) {
            event.preventDefault();
            updateFunctionInput(true);
        }
        // Ctrl + / hide control
        else if (event.key == "/" && event.ctrlKey) {
            let control = document.getElementById("control");
            let fps = document.getElementById("fps");
            if (control.style.display == "none")
                fps.style.display = control.style.display = "block";
            else fps.style.display = control.style.display = "none";
        }
    });
    funInput.value = funSelect.value.replaceAll(";", "\n");
}


// Error/warning messages
function messageError(msg) {
    let container = document.getElementById("error-message");
    container.style.display = "inline-block";
    container.style.backgroundColor = "rgba(255,255,0,1.0)";
    container.style.color = "red";
    container.innerHTML = msg;
}
function messageWarning(msg) {
    let container = document.getElementById("error-message");
    container.style.display = "inline-block";
    container.style.backgroundColor = "rgba(0,0,0,0.4)";
    container.style.color = "orange";
    container.innerHTML = msg;
}
function messageUpdate() {
    let container = document.getElementById("error-message");
    container.style.display = "inline-block";
    container.style.backgroundColor = "#00000000";
    container.style.color = "white";
    container.innerHTML = "Parameter(s) may have been changed. Click \"update\" to recompile shader.";
}
function messageNone(event) {
    if (event) event.preventDefault();
    let container = document.getElementById("error-message");
    container.style.display = "none";
    container.style.backgroundColor = "#00000000";
}
document.getElementById("error-message").addEventListener("click", messageNone);
document.getElementById("error-message").addEventListener("contextmenu", messageNone);


// Main

var UpdateFunctionInputConfig = {
    complexMode: false,
    equationMode: true,
    warnNaN: true,
    warnNumerical: false,
};

var WarningStack = [];

function updateFunctionInput(forceRecompile = false) {
    let checkboxLatex = document.getElementById("checkbox-latex");
    let checkboxAutoCompile = document.getElementById("checkbox-auto-compile");
    let texContainer = document.getElementById("mathjax-preview");
    if (!checkboxLatex.checked) texContainer.innerHTML = "";
    var parameters = parameterToDict(RawParameters);
    var expr = document.getElementById("equation-input").value;
    try {
        localStorage.setItem(NAME + "input", expr);
        localStorage.setItem(NAME + "params", JSON.stringify(parameters));
    } catch (e) { console.error(e); }
    WarningStack = [];

    // parse input
    var parsed = null;
    try {
        try {
            parsed = parseInput(expr);
        } catch (e) {
            texContainer.style.color = "red";
            throw e;
        }
        var errmsg = "";
        if (parsed.postfix.length == 0) errmsg = "No function to graph.";
        if (parsed.postfix.length > 1) errmsg = "Multiple main equations found.";
        parsed.postfix.push([]);
        parsed.postfix = parsed.postfix[0];
        if (UpdateFunctionInputConfig.complexMode) {
            var variables = getVariables(parsed.postfix, false);
            if (variables.has('x') && variables.has('z'))
                errmsg = "Cannot have both x and z as the independent variable.";
        }
        var extraVariables = getVariables(parsed.postfix, true);
        extraVariables.delete('e');
        extraVariables.delete('π');
        if (extraVariables.size != 0) errmsg = "Definition not found: " + Array.from(extraVariables);
        if (!UpdateFunctionInputConfig.equationMode) {
            for (var i = 0; i < parsed.latex.length; i++)
                parsed.latex[i] = parsed.latex[i].replace(/=0$/, '');
        }
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
        if (checkboxLatex.checked) {
            console.log(parsed.latex.join(' \\\\\n'));
            updateLatex(parsed.latex, "white");
        }
        glsl = postfixToGlsl(parsed.postfix);
        if (UpdateFunctionInputConfig.complexMode) {
            glsl.glsl = glsl.glsl.replace(/([^\w])mf_/g, "$1mc_");
            glsl.glsl = glsl.glsl.replace(/float/g, "vec2");
        }
        console.log(glsl.glsl);
        if (UpdateFunctionInputConfig.warnNaN && !glsl.isCompatible)
            console.warn("Graph may be incorrect on some devices.");
        if (UpdateFunctionInputConfig.warnNumerical && /m[fc]g?_(ln)?((gamma)|(zeta))/.test(glsl.glsl))
            console.warn("Function evaluation involves numerical approximation and may be inconsistent across devices.");
        if (WarningStack.length != 0)
            messageWarning(WarningStack.join('\n'));
        updateShaderFunction(glsl.glsl, glsl.glslgrad, parameters);
    } catch (e) {
        console.error(e);
        messageError(e);
        updateShaderFunction(null);
        if (checkboxLatex.checked)
            updateLatex(parsed.latex, "red");
    }
}


function initMain(preloadShaderSources) {
    initGreekLetters();

    // https://stackoverflow.com/a/49248484
    function myCustomWarn(...args) {
        var messages = args.join('\n');
        if (WarningStack.indexOf(messages) == -1)
            WarningStack.push(messages);
        return console.oldWarn(...args);
    };
    console.oldWarn = console.warn;
    console.warn = myCustomWarn;

    // load shaders and init WebGL
    loadShaderSources(preloadShaderSources, function () {
        console.log("shaders loaded");
        try {
            state.name = NAME + "state";
            initWebGL();
            updateFunctionInput(true);
            initRenderer();
        } catch (e) {
            console.error(e);
            document.body.innerHTML = "<h1 style='color:red;'>" + e + "</h1>";
        }
    });

    // MathJax - do this at the end
    initMathjax();
}