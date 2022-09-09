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
function activateParameters(parameters, callback) {
    for (var i = 0; i < parameters.length; i++) {
        parameters[i].element.addEventListener("input", function (event) {
            callback(false);
        });
    }
}

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
function initParameters(rawParameters, callback) {
    // get parameters and input from local storage
    try {
        var params = JSON.parse(localStorage.getItem(NAME + "params"));
        if (params != null) setParameters(rawParameters, params);
    }
    catch (e) { console.error(e); }
    let funSelect = document.getElementById("builtin-functions");
    let input = document.getElementById("equation-input");
    var initialExpr = "";
    try {
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
    document.getElementById("button-update").addEventListener("click",
        function (event) { callback(true); });
    funSelect.addEventListener("input", function (event) {
        // selecting a new function
        resetState();
        input.value = funSelect.value.replaceAll(";", "\n");
        callback(true);
    });
    input.addEventListener("input", function (event) {
        // typing
        funSelect.value = initialExpr;
        callback(false);
    });
    window.addEventListener("keydown", function (event) {
        // Ctrl/Alt + Enter update function
        if (event.key == "Enter" && (event.altKey || event.ctrlKey)) {
            event.preventDefault();
            callback(true);
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
    input.value = funSelect.value.replaceAll(";", "\n");
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
