// Generate source code from postfix notations produced by parser.js

"use strict";

let CodeGenerator = {
    /* Supported programming languages
        @fun: function definition
        @defs: how to define an expression
        @inherit: inherit math function definitions from these languages if not specified
        @extensions: additional required functions/definitions, don't inherit
    */
    langsOrder: ['glsl', 'glslc', 'cppf', 'cppd', 'js'],
    langs: {}
};

// scalar-valued GLSL
CodeGenerator.langs.glsl = {
    inherit: [],
    config: null,
    presets: {
        // example only
        implicit3: {
            fun: "float {%funname%}(float x, float y, float z) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
            prefix: 'v',
            def: "    float {%varname%} = {%expr%};",
            joiner: "\n"
        },
        implicit3_compact: {
            fun: "float {%funname%}(float x, float y, float z) {\n\
    float {%funbody%};\n\
    return {%val%};\n\
}",
            prefix: 'v',
            def: "{%varname%}={%expr%}",
            joiner: ", "
        },
        implicit3g: {
            fun: "vec4 {%funname%}(float x, float y, float z) {\n\
{%funbody%}\n\
    return vec4({%val;x%}, {%val;y%}, {%val;z%}, {%val%});\n\
}",
            prefix: 'v',
            def: "    float {%varname%} = {%expr%};",
            joiner: "\n"
        },
        implicit3g_compact: {
            fun: "vec4 {%funname%}(float x, float y, float z) {\n\
    float {%funbody%};\n\
    return vec4({%val;x%}, {%val;y%}, {%val;z%}, {%val%});\n\
}",
            prefix: 'v',
            def: "{%varname%}={%expr%}",
            joiner: ", "
        },
    },
    extensions: [
        {
            name: 'erf',
            source: "float mf_erf(float x) {\n\
    float t = 1.0/(1.0+0.3275911*abs(x));\n\
    float k = t*(0.254829592+t*(-0.284496736+t*(1.421413741+t*(-1.453152027+t*1.061405429))));\n\
    return sign(x)*(1.0-k*exp(-x*x));\n\
}"
        },
        {
            name: 'erfc',
            source: "float mf_erfc(float x) {\n\
    if (x <= 1.0) return 1.0-mf_erf(x);\n\
    float v = exp(-1.00382243*x*x+0.13228106*x+0.63881364-1.83299332*log(x+1.41509185));\n\
    if (x >= 2.0) return v;\n\
    return mix(1.0-mf_erf(x),v,smoothstep(1.0,2.0,x));\n\
}"
        },
        {
            name: 'erfinv',
            source: "float mf_erfinv(float x) {\n\
    float u = log(1.0-x*x);\n\
    float c = 0.5*u+4.3307;\n\
    return sign(x)*sqrt(sqrt(c*c-u/0.147)-c);\n\
}"
        },
        {
            name: 'mf_lgamma_1',
            source: "float mf_lgamma_1(float x) {\n\
    return (x-0.48925102)*log(x)-x+0.05778111/x+0.97482605-0.06191856*log(log(x+1.0)+1.0);\n\
}"
        },
        {
            name: 'gamma',
            source: "float mf_gamma(float x) {\n\
    const float pi = 3.14159265358979;\n\
    if (x >= 1.0) return exp(mf_lgamma_1(x));\n\
    if (x < 0.0) return pi/sin(pi*x)*exp(-mf_lgamma_1(1.0-x));\n\
    float s = min(1.0-x, 1.0);\n\
    s = s*s*s*(10.0-s*(15.0-6.0*s));\n\
    return exp(mix(mf_lgamma_1(x), log(pi/sin(pi*x))-mf_lgamma_1(1.0-x), s));\n\
}"
        },
        {
            name: 'loggamma',
            source: "float mf_loggamma(float x) {\n\
    const float pi = 3.14159265358979;\n\
    if (x >= 1.0) return mf_lgamma_1(x);\n\
    if (x < 0.0) return log(pi/abs(sin(pi*x)))-mf_lgamma_1(1.0-x);\n\
    float s = min(1.0-x, 1.0);\n\
    s = s*s*s*(10.0-s*(15.0-6.0*s));\n\
    return mix(mf_lgamma_1(x), log(pi/abs(sin(pi*x)))-mf_lgamma_1(1.0-x), s);\n\
}"
        },
        {
            name: 'beta',
            source: "float mf_beta(float x, float y) {\n\
    const float pi = 3.14159265358979;\n\
    if (x == round(x) && x <= 0.0) x += min(1e-6*(abs(x)+1.0), 1e-2);\n\
    if (y == round(y) && y <= 0.0) y += min(1e-6*(abs(y)+1.0), 1e-2);\n\
    float c = mf_loggamma(x)+mf_loggamma(y)-mf_loggamma(x+y);\n\
    float s = sign(sin(pi*min(x,0.5)))*sign(sin(pi*min(y,0.5)))*sign(sin(pi*min(x+y,0.5)));\n\
    return s*exp(c);\n\
}"
        },
        {
            name: 'permutation',
            source: "float mf_permutation(float x, float y) {\n\
    const float pi = 3.14159265358979;\n\
    if (x == round(x)) x += min(1e-6*(abs(x)+1.0), 1e-2);\n\
    if (y == round(y)) y -= min(1e-6*(abs(y)+1.0), 1e-2);\n\
    float c = mf_loggamma(x+1.0)-mf_loggamma(x-y+1.0);\n\
    float s = sign(sin(pi*min(x+1.0,0.5)))*sign(sin(pi*min(x-y+1.0,0.5)));\n\
    return s*exp(c);\n\
}"
        }
    ],
};

// complex-valued GLSL
CodeGenerator.langs.glslc = {
    inherit: [],
    config: null,
    presets: {
        complex: {
            fun: "vec2 {%funname%}(vec2 z) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
            prefix: 'v',
            def: "    vec2 {%varname%} = {%expr%};",
            joiner: "\n"
        },
    },
    extensions: [
        {
            name: 'mc_gamma',
            source: ""
        },
        {
            name: 'mc_lgamma',
            source: ""
        },
        {
            name: 'mc_zeta',
            source: "#define NO_AA"
        },
        {
            name: 'mc_lzeta',
            source: "#define NO_AA"
        }
    ],
};

// scalar-valued C++, float
CodeGenerator.langs.cppf = {
    inherit: ['glsl'],
    config: null,
    presets: {
        implicit3: {
            fun: "float {%funname%}(float x, float y, float z) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
            prefix: 'v',
            def: "    float {%varname%} = {%expr%};",
            joiner: "\n"
        },
        implicit3_compact: {
            fun: "float {%funname%}(float x, float y, float z) {\n\
    float {%funbody%};\n\
    return {%val%};\n\
}",
            prefix: 'v',
            def: "{%varname%}={%expr%}",
            joiner: ", "
        },
        implicit3g: {
            fun: "float {%funname%}(float x, float y, float z, float *gx, float *gy, float *gz) {\n\
{%funbody%}\n\
    *gx = {%val;x%}, *gy = {%val;y%}, *gz = {%val;z%};\n\
    return {%val%};\n\
}",
            prefix: 'v',
            def: "    float {%varname%} = {%expr%};",
            joiner: "\n"
        },
        implicit3g_compact: {
            fun: "float {%funname%}(float x, float y, float z, float *gx, float *gy, float *gz) {\n\
    float {%funbody%};\n\
    *gx = {%val;x%}, *gy = {%val;y%}, *gz = {%val;z%};\n\
    return {%val%};\n\
}",
            prefix: 'v',
            def: "{%varname%}={%expr%}",
            joiner: ", "
        },
    },
    extensions: [
        {
            name: 'iTime',
            source: "float iTime = 0.0f;"
        },
        {
            name: 'erfinv',
            source: "float erfinv(float x) {\n\
    float u = log(1.0f-x*x);\n\
    float c = 0.5f*u+4.3307f;\n\
    return (x>0.0f?1.0f:-1.0f)*sqrt(sqrt(c*c-u/0.147f)-c);\n\
}"
        }
    ],
};

// scalar-valued C++, double
CodeGenerator.langs.cppd = {
    inherit: ['glsl', 'cppf'],
    config: null,
    presets: {
        implicit3: {
            fun: "double {%funname%}(double x, double y, double z) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
            prefix: 'v',
            def: "    double {%varname%} = {%expr%};",
            joiner: "\n"
        },
        implicit3_compact: {
            fun: "double {%funname%}(double x, double y, double z) {\n\
    double {%funbody%};\n\
    return {%val%};\n\
}",
            prefix: 'v',
            def: "{%varname%}={%expr%}",
            joiner: ", "
        },
        implicit3g: {
            fun: "double {%funname%}(double x, double y, double z, double *gx, double *gy, double *gz) {\n\
{%funbody%}\n\
    *gx = {%val;x%}, *gy = {%val;y%}, *gz = {%val;z%};\n\
    return {%val%};\n\
}",
            prefix: 'v',
            def: "    double {%varname%} = {%expr%};",
            joiner: "\n"
        },
        implicit3g_compact: {
            fun: "double {%funname%}(double x, double y, double z, double *gx, double *gy, double *gz) {\n\
    double {%funbody%};\n\
    *gx = {%val;x%}, *gy = {%val;y%}, *gz = {%val;z%};\n\
    return {%val%};\n\
}",
            prefix: 'v',
            def: "{%varname%}={%expr%}",
            joiner: ", "
        },
    },
    extensions: [
        {
            name: 'iTime',
            source: "double iTime = 0.0;"
        },
        {
            name: 'erfinv',
            source: "double erfinv(double x) {\n\
    float u = log(1.0-x*x);\n\
    float c = 0.5*u+4.3307;\n\
    return (x>0.?1.:-1.)*sqrt(sqrt(c*c-u/0.147)-c);\n\
}"
        }
    ],
};

// JavaScript
CodeGenerator.langs.js = {
    inherit: ['cppd'],
    config: null,
    presets: {
        implicit2: {
            fun: "function(x, y) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
            prefix: 'v',
            def: "    var {%varname%} = {%expr%};",
            joiner: "\n"
        },
        ode2: {
            fun: [
                "function(x, y) {\n\
{%funbody%}\n\
    return { x: {%x_t%}, y: {%y_t%} };\n\
}",
                "function(x, y) {\n\
{%funbody%}\n\
    return { x: 1.0, y: {%y_x%} };\n\
}"],
            prefix: 'v',
            def: "    var {%varname%} = {%expr%};",
            joiner: "\n"
        },
    },
    extensions: [
        {
            name: 'erfinv',
            source: "double erfinv(double x) {\n\
    float u = log(1.0-x*x);\n\
    float c = 0.5*u+4.3307;\n\
    return (x>0.?1.:-1.)*sqrt(sqrt(c*c-u/0.147)-c);\n\
}"
        }
    ],
};


CodeGenerator.parseGradient = function(s) {
    var parsed = MathParser.exprToPostfix(s, MathFunctions);
    for (var i = 0; i < parsed.length; i++)
        if (parsed[i].type == 'variable')
            parsed[i].str = parsed[i].str.replace("_", "@");
    return parsed;
}

CodeGenerator.initFunctionGradients = function () {
    for (var name in MathFunctions) {
        for (var nparam in MathFunctions[name]) {
            var fun = MathFunctions[name][nparam];
            fun.grad = null;
            if (!fun.langs.hasOwnProperty("D"))
                continue;
            if (typeof(fun.langs.D) == "function") {
                fun.grad = fun.langs.D;
                continue;
            }
            fun.grad = CodeGenerator.parseGradient(fun.langs.D);
        }
    }
}


// Convert a postfix math expression to LaTeX code
CodeGenerator.postfixToLatex = function (queue) {
    const operators = {
        '-': 1, '+': 1,
        '*': 2, '/': 2,
        '^': 3
    };
    function varnameToLatex(varname) {
        if (varname.length >= 2 && varname[1] != "_")
            varname = varname[0] + "_" + varname.substring(1, varname.length);
        if (/_/.test(varname)) {
            var j = varname.search('_');
            varname = varname.substring(0, j + 1) + "{" + varname.substring(j + 1, varname.length) + "}";
        }
        for (var i = 0; i < MathParser.greekLetters.length; i++) {
            var gl = MathParser.greekLetters[i];
            varname = varname.replaceAll(gl[1], "\\" + gl[0] + " ");
            varname = varname.replaceAll('\\phi', '\\varphi');
        }
        varname = varname.replace(" }", "}").replace(" _", "_");
        return varname.trim();
    }
    var stack = [];
    for (var i = 0; i < queue.length; i++) {
        var token = queue[i];
        // number
        if (token.type == 'number') {
            var s = token.str.replace(/\.0*$/, "");
            if (s == "" || s[0] == ".") s = "0" + s;
            stack.push(new EvalLatexObject([token], s, Infinity));
        }
        // variable
        else if (token.type == "variable") {
            var s = varnameToLatex(token.str);
            if (s == "e") s = "\\operatorname{e}";
            if (s == "π") s = "\\pi";
            stack.push(new EvalLatexObject([token], s, Infinity));
        }
        // operators
        else if (token.type == "operator") {
            var precedence = operators[token.str];
            var v1 = stack[stack.length - 2];
            var v2 = stack[stack.length - 1];
            stack.pop(); stack.pop();
            var tex1 = v1.latex, tex2 = v2.latex;
            if (token.str != "/") {
                if (precedence > v1.precedence)
                    tex1 = "\\left(" + tex1 + "\\right)";
                if (precedence >= v2.precedence)
                    tex2 = "\\left(" + tex2 + "\\right)";
            }
            var latex = "";
            if (token.str == "-") {
                if (v1.latex == "0") latex = "-" + tex2;
                else latex = tex1 + "-" + tex2;
            }
            else if (token.str == "+") {
                latex = tex1 + "+" + tex2;
            }
            else if (token.str == "*") {
                if (/^[\{\s]*[\d\.]/.test(tex2))
                    latex = "{" + tex1 + "}\\cdot{" + tex2 + "}";
                else latex = "{" + tex1 + "}{" + tex2 + "}";
            }
            else if (token.str == "/") {
                latex = "\\frac{" + tex1 + "}{" + tex2 + "}";
            }
            else if (token.str == "^") {
                latex = "{" + tex1 + "}^{" + tex2 + "}";
                if (token.str == "^" && tex1 == "\\operatorname{e}" && false)
                    latex = MathFunctions['exp']['1'].subLatex([v2]);
            }
            else throw new Error("Unrecognized operator" + token.str);
            var obj = new EvalLatexObject(
                v1.postfix.concat(v2.postfix).concat([token]),
                latex, precedence);
            stack.push(obj);
        }
        // function
        else if (token.type == 'function') {
            var numArgs = token.numArgs;
            var args = [];
            for (var j = numArgs; j > 0; j--)
                args.push(stack[stack.length - j]);
            for (var j = 0; j < numArgs; j++)
                stack.pop();
            var fun = MathFunctions[token.str];
            if (fun != undefined) {
                if (fun['' + numArgs] == undefined) fun = fun['0'];
                else fun = fun['' + numArgs];
                if (fun == undefined) throw new Error(
                    "Incorrect number of function arguments for function `" + token.str + "`");
                stack.push(new EvalLatexObject(
                    args.concat([token]), fun.subLatex(args), Infinity));
            }
            else {
                var argsLatex = [];
                for (var j = 0; j < numArgs; j++) argsLatex.push(args[j].latex);
                stack.push(new EvalLatexObject(
                    args.concat([token]),
                    varnameToLatex(token.str) + "\\left(" + argsLatex.join(',') + "\\right)",
                    Infinity
                ));
            }
        }
        else {
            throw new Error("Unrecognized token `" + equ[i] + "`");
        }
    }
    if (stack.length != 1)
        throw new Error("Result stack length is not 1");
    return stack[0].latex;
}


// Convert a single postfix math expression to source code, used by `postfixToSource`
CodeGenerator._postfixToSource = function (queues, funname, lang, grads, extensionMap) {
    let langpack = this.langs[lang];
    let constexpr = MathFunctions['CONST'][1].langs[lang];

    // handle repeated evaluations
    var subtreesLength = 0;
    var subtrees = {};  // key and id in intermediates
    var intermediates = [];  // EvalObjects

    // may return an object, or a string id for intermediates look up
    function addSubtree(evalobj, evalobjAlt, diffvar = null) {
        // returns object
        if (MathParser.isIndependentVariable(evalobj.code))
            return evalobj;
        if (evalobj.range.x0 == evalobj.range.x1) {
            let constexpr = MathFunctions['CONST'][1].langs[lang];
            var x = evalobj.range.x0;
            var xr = 1e-8 * Math.round(1e8 * x);
            if (Math.abs(x - xr) < 1e-12) x = xr;
            evalobj.code = constexpr.replaceAll("%1",
                x == Math.round(x) ? x.toFixed(1) : new String(x));
            if (evalobj.code[0] == '-')
                evalobj.code = '(' + evalobj.code + ')';
            return evalobj;
        }
        // returns id
        let postfix = evalobj.postfix, postfixAlt = null;
        var key = [], keyAlt = [];
        for (var i = 0; i < postfix.length; i++)
            key.push(postfix[i].str);
        key = key.join(',');
        if (evalobjAlt != null) {
            postfixAlt = evalobjAlt.postfix;
            for (var i = 0; i < postfixAlt.length; i++)
                keyAlt.push(postfixAlt[i].str);
            keyAlt = keyAlt.join(',');
        }
        // check if feasible
        var feasible = true;
        if (subtrees.hasOwnProperty(key) && diffvar !== null) {
            var intm = intermediates[Number(subtrees[key].slice(1))].obj;
            if (!intm.grad.hasOwnProperty(diffvar))
                intm.grad[diffvar] = evalobj.grad[diffvar];
                // feasible = false;
        }
        if (subtrees.hasOwnProperty(keyAlt) && diffvar !== null) {
            var intm = intermediates[Number(subtrees[keyAlt].slice(1))].obj;
            if (!intm.grad.hasOwnProperty(diffvar))
                intm.grad[diffvar] = evalobjAlt.grad[diffvar];
                // feasible = false;
        }
        if (!subtrees.hasOwnProperty(key) &&
            (evalobjAlt == null || !subtrees.hasOwnProperty(keyAlt))
        ) {
            if (evalobj.code[0] == '$'
                && /\d+/.test(evalobj.code.slice(1))) {
                    if (Number(evalobj.code.slice(1)) < intermediates.length)
                        return '$' + evalobj.code.slice(1);
                }
            var id = '$' + subtreesLength;
            subtrees[key] = id;
            intermediates.push({
                id: id,
                obj: { ...evalobj }
            });
            subtreesLength += 1;
        }
        return subtrees.hasOwnProperty(key) ?
            subtrees[key] : subtrees[keyAlt];
    }

    function subFunctionGradient(fun, funArgs, diffvar) {
        if (fun.grad === null) {
            throw new Error("Function `" + fun.names[0] + "` does not support differentiation.");
        }
        var fungrad = typeof(fun.grad) == "function" ?
            CodeGenerator.parseGradient(fun.grad(funArgs.length)) :
            fun.grad.slice();

        // handle function gradient
        var dfunArgs = [];
        for (var i = 0; i < funArgs.length; i++) {
            if (!funArgs[i].grad.hasOwnProperty(diffvar))
                throw new Error("Internal error: funarg has no grad.");
            dfunArgs.push(funArgs[i].grad[diffvar]);
        }
        var stack1 = [];
        for (var i = 0; i < fungrad.length; i++) {
            if (fungrad[i].type == "variable" && /@/.test(fungrad[i].str)) {
                var parts = fungrad[i].str.split('@');
                var parami = Number(parts[1]) - 1;
                if (parts[0] == 'g') stack1.push(dfunArgs[parami]);
                else stack1.push(funArgs[parami]);
            }
            // else if (fungrad[i].type == "variable" && /\$\d+/.test(fungrad[i].str)) {
            //     stack1.push(fungrad[i]);
            // }
            else addToken(stack1, { ...fungrad[i] }, null);
        }
        if (stack1.length != 1)
            throw new Error("Result1 stack length is not 1");
        return stack1[0];
    }

    function addToken(stack, token, diffvar) {
        var obj = null, objAlt = null, fun = null;
        var funArgs = [];
        // ??
        if (token.type == "variable" && /@/.test(token.str)) {
            throw new Error();
        }
        // number
        else if (token.type == 'number') {
            var s = token.str;
            if (!/\./.test(s)) s += '.';
            obj = new EvalObject([token],
                constexpr.replaceAll("%1", s),
                true, new Interval(Number(s), Number(s)), true);
            // grad
            if (diffvar !== null || true) {
                obj.grad[diffvar] = new EvalObject(
                    [new Token("number", '0.0')],
                    constexpr.replaceAll("%1", "0.0"),
                    true, new Interval(0, 0), true);
            }
            stack.push(obj);
            return;
        }
        // variable
        else if (token.type == "variable") {
            var s = token.str;
            var isNumeric = false;
            var interval = new Interval();
            if (MathParser.isIndependentVariable(s)) {
                s = MathParser.IndependentVariables[s];
            }
            else if (s == "e") {
                s = constexpr.replaceAll("%1", Math.E);
                isNumeric = true;
                interval.x0 = interval.x1 = Math.E;
            }
            else if (s == "π") {
                s = constexpr.replaceAll("%1", Math.PI);
                isNumeric = true;
                interval.x0 = interval.x1 = Math.PI;
            }
            else {
                throw "Undeclared variable " + s;
            }
            obj = new EvalObject(
                [token], s, isNumeric, interval, true);
            // grad
            if (diffvar !== null || true) {
                var g = s == diffvar ? 1.0 : 0.0;
                obj.grad[diffvar] = new EvalObject(
                    [new Token("number", g.toFixed(1))],
                    constexpr.replaceAll("%1", g.toFixed(1)),
                    true, new Interval(g, g), true);
            }
            stack.push(obj);
            return;
        }
        // operators
        else if (token.type == "operator") {
            var v1 = stack[stack.length - 2];
            var v2 = stack[stack.length - 1];
            stack.pop(); stack.pop();
            // get object
            if (token.str == "^") {
                obj = FunctionSubs.powEvalObjects(v1, v2, lang);
                fun = MathFunctions[v2.isNumeric ? "powconst" : "pow"][2];
            }
            else if (token.str == "+") {
                obj = FunctionSubs.addEvalObjects(v1, v2, lang);
                objAlt = FunctionSubs.addEvalObjects(v2, v1, lang);
                fun = MathFunctions["ADD"][2];
            }
            else if (token.str == "-") {
                obj = FunctionSubs.subEvalObjects(v1, v2, lang);
                fun = MathFunctions["SUB"][2];
            }
            else if (token.str == "*") {
                obj = FunctionSubs.mulEvalObjects(v1, v2, lang);
                objAlt = FunctionSubs.mulEvalObjects(v2, v1, lang);
                fun = MathFunctions["MUL"][2];
            }
            else if (token.str == "/") {
                obj = FunctionSubs.divEvalObjects(v1, v2, lang);
                fun = MathFunctions[v2.isNumeric ? "divconst" : "DIV"][2];
            }
            if (diffvar !== null) {
                obj.grad[diffvar] = subFunctionGradient(fun, [v1, v2], diffvar);
                if (objAlt !== null)
                    objAlt.grad[diffvar] = subFunctionGradient(fun, [v2, v1], diffvar);
            }
            var id = addSubtree(obj, objAlt, diffvar);
            if (typeof(id) == "string") {
                obj.postfix = [new Token('variable', id)];
                obj.code = id;
            }
            else obj = id;
        }
        // function
        else if (token.type == 'function') {
            fun = MathFunctions[token.str];
            var numArgs = token.numArgs;
            for (var j = numArgs; j > 0; j--)
                funArgs.push(stack[stack.length - j]);
            for (var j = 0; j < numArgs; j++)
                stack.pop();
            if (fun['' + numArgs] == undefined) fun = fun['0'];
            else fun = fun['' + numArgs];
            if (fun == undefined) throw new Error(
                "Incorrect number of arguments for function `" + token.str + "`");
            if (fun.langs.hasOwnProperty(lang + 'Ext')) {
                let exts = fun.langs[lang + 'Ext'];
                for (var _ = 0; _ < exts.length; _++)
                    extensionMap[exts[_]].used = true;
            }
            obj = fun.subSource(funArgs, lang);
            if (fun.names[0] == "iTime")
                obj.isNumeric = false;
            if (diffvar !== null)
                obj.grad[diffvar] = subFunctionGradient(fun, funArgs, diffvar);
            var id = addSubtree(obj, null, diffvar);
            if (typeof(id) == "string") {
                obj.postfix = [new Token('variable', id)];
                obj.code = id;
            }
        }
        else {
            throw new Error("Unrecognized token `" + token + "`");
        }

        stack.push(obj);
        return;
    }

    function getObjectGradient(obj, diffvar) {
        if (obj.grad.hasOwnProperty(diffvar))
            return obj.grad[diffvar];
        var stack = [];
        function addPostfixToStack(postfix) {
            for (var ti = 0; ti < postfix.length; ti++) {
                var token = postfix[ti];
                if (token.type == 'variable' && /\$\d+/.test(token.str)) {
                    var id = Number(token.str.slice(1));
                    addPostfixToStack(intermediates[id].obj.postfix);
                    intermediates[id].obj.grad[diffvar] = stack[stack.length-1];
                }
                else addToken(stack, { ...token }, diffvar);
            }
        }
        addPostfixToStack(obj.postfix);
        if (stack.length != 1)
            throw new Error("Result stack length is not 1");
        return stack[0].grad[diffvar];
    }

    // postfix evaluation
    var qmap = {};
    var isCompatible = true;
    for (var qi in queues) {
        var queue = queues[qi];
        var stack = [];  // EvalObject objects
        for (var i = 0; i < queue.length; i++) {
            addToken(stack, { ...queue[i] }, null);
        }
        if (stack.length != 1)
            throw new Error("Result stack length is not 1");
        // console.log(stack[0]);
        qmap[qi] = stack[0];
        isCompatible = isCompatible && stack[0].isCompatible;
    }
    // console.log(subtrees);
    // console.log(intermediates);

    // gradient evaluation
    grads.sort(function (a, b) {
        return a.diff.length - b.diff.length;
    });
    for (var gi in grads) {
        var varname = grads[gi].varname;
        var diffs = grads[gi].diff;
        var nd = diffs.length;
        // console.log(varname+';'+diffs.join(','));
        var grad = nd == 1 ?
            getObjectGradient(qmap[varname], diffs[0]) :
            getObjectGradient(qmap[varname+';'+diffs.slice(0,nd-1).join(',')], diffs[nd-1]);
        // console.log(grad);
        qmap[varname+';'+diffs.join(',')] = grad;
    }
    // console.log(qmap);

    // check what intermediates are used
    var used = new Array(intermediates.length).fill(false);
    var rescode = [];
    for (var qi in qmap) {
        rescode.push(qmap[qi].code);
    }
    var visited = [];
    for (var i = 0; i < rescode.length; i++) {
        var matches = rescode[i].match(/\$\d+/g);
        if (matches == null) continue;
        for (var c = 0; c < matches.length; c++) {
            var id = Number(matches[c].slice(1));
            used[id] = true;
            visited.push(id);
        }
    }
    var i0 = 0, i1 = visited.length;
    while (i0 < i1) {
        for (var i = i0; i < i1; i++) {
            var s = intermediates[visited[i]].obj.code;
            var matches = s.match(/\$\d+/g);
            if (matches == null) continue;
            for (var c = 0; c < matches.length; c++) {
                var id = Number(matches[c].slice(1));
                if (!used[id]) {
                    used[id] = true;
                    visited.push(id);
                }
            }
        }
        i0 = i1, i1 = visited.length;
    }
    var nused = 0;
    var usedPsa = new Array(used.length);
    for (var i = 0; i < used.length; i++) {
        usedPsa[i] = nused;
        nused += Number(used[i]);
    }
    function replaceUsed(s) {
        var matches = s.match(/\$\d+/g);
        if (matches == null) return s;
        matches.sort((a, b) => b.length - a.length);
        for (var c = 0; c < matches.length; c++) {
            var t = usedPsa[Number(matches[c].slice(1))];
            s = s.replaceAll(matches[c], langpack.config.prefix + t);
        }
        return s;
    }

    // get result
    var result = {
        code: '',
        isCompatible: isCompatible
    };
    var lines = [];
    for (var i = 0; i < intermediates.length; i++) {
        if (!used[i]) continue;
        var varname = langpack.config.prefix + usedPsa[i];
        var v = langpack.config.def
            .replaceAll("{%varname%}", varname)
            .replaceAll("{%expr%}", replaceUsed(intermediates[i].obj.code));
        lines.push(v);
    }
    result.code = "";
    if (typeof langpack.config.fun == 'string')
        result.code = langpack.config.fun;
    else {
        for (var fi = 0; fi < langpack.config.fun.length; fi++) {
            var code = langpack.config.fun[fi];
            var isAllHave = true;
            for (var qi in queues) {
                if (code.search("{%"+qi+"%}") == -1)
                    isAllHave = false;
            }
            if (isAllHave) {
                result.code = code;
                break;
            }
        }
    }
    result.code = result.code
        .replaceAll("{%funname%}", funname)
        .replaceAll("{%funbody%}", lines.join(langpack.config.joiner));
    for (var qi in qmap) {
        result.code = result.code.replaceAll("{%" + qi + "%}",
            replaceUsed(qmap[qi].code));
    }
    return result;
}

// Convert a postfix expressions to source code
CodeGenerator.postfixToSource = function (exprs, funnames, lang) {
    if (exprs.length != funnames.length)
        throw new Error("`exprs` and `funnames` have different lengths.");
    let langpack = this.langs[lang];
    if (langpack == undefined)
        throw new Error("Unsupported language `" + lang + "`");

    // get required gradients
    var grads = [];
    var matches = null;
    if (typeof langpack.config.fun == 'string') {
        var matches = langpack.config.fun.match(/\{\%[\w_\,\;]+\%\}/g);
    }
    if (matches != null) {
        var norepeat = {};
        for (var i = 0; i < matches.length; i++) {
            var mi = matches[i];
            mi = mi.slice(2, mi.length - 2);
            if (/;/.test(mi)) {
                if (!norepeat.hasOwnProperty(mi)) {
                    grads.push({
                        varname: mi.split(';')[0],
                        diff: mi.split(';')[1].split(',')
                    });
                    norepeat[mi] = null;
                }
            }
        }
    }

    // extension counter
    var extensionMap = {};
    for (var i = 0; i < langpack.extensions.length; i++) {
        var ext = langpack.extensions[i];
        extensionMap[ext.name] = {
            index: i,
            source: ext.source,
            used: false
        };
    }

    // generate a function for each expression
    var functions = [], isCompatible = [];
    for (var i = 0; i < exprs.length; i++) {
        var r = this._postfixToSource(exprs[i], funnames[i], lang, grads, extensionMap);
        functions.push(r.code);
        isCompatible.push(r.isCompatible);
    }

    // collect used extensions
    var exts = [];
    for (var key in extensionMap) {
        if (extensionMap[key].used)
            exts.push(extensionMap[key]);
    }
    exts.sort((a, b) => (a.index - b.index));
    for (var i = 0; i < exts.length; i++)
        exts[i] = exts[i].source;
    return {
        source: exts.concat(functions).join('\n\n').trim(),
        exts: exts,
        isCompatible: isCompatible,
    };
}

