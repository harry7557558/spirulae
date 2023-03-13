// Generate source code from postfix notations produced by parser.js

"use strict";

let CodeGenerator = {
    /* Supported programming languages
        @fun: function definition
        @defs: how to define an expression
        @inherit: inherit math function definitions from these languages if not specified
        @extensions: additional required functions/definitions, don't inherit
    */
    langsOrder: ['glsl', 'glslc', 'cppf', 'cppd'],
    langs: {}
};

// scalar-valued GLSL
CodeGenerator.langs.glsl = {
    fun: "float {%funname%}(float x, float y, float z) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
    prefixes: ['v'],
    defs: [
        "    float {%varname%} = {%expr%};"
    ],
    inherit: [],
    extensions: [
        {
            name: 'iTime',
            source: "uniform float iTime;"
        },
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
    fun: "vec2 {%funname%}(vec2 z) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
    prefixes: ['v'],
    defs: [
        "    vec2 {%varname%} = {%expr%};"
    ],
    inherit: [],
    extensions: [
        {
            name: 'iTime',
            source: "uniform float iTime;"
        },
    ],
};

// scalar-valued C++, float
CodeGenerator.langs.cppf = {
    fun: "float {%funname%}(float x, float y, float z) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
    prefixes: ['v'],
    defs: [
        "    float {%varname%} = {%expr%};"
    ],
    inherit: ['glsl'],
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
    fun: "double {%funname%}(double x, double y, double z) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
    prefixes: ['v'],
    defs: [
        "    double {%varname%} = {%expr%};"
    ],
    inherit: ['glsl', 'cppf'],
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
CodeGenerator._postfixToSource = function (queues, funname, lang, extensionMap) {
    let langpack = this.langs[lang];

    // handle repeated evaluations
    var subtreesLength = 0;
    var subtrees = {};
    var intermediates = [];
    function addSubtree(evalobj) {
        let postfix = evalobj.postfix;
        var key = [];
        for (var i = 0; i < postfix.length; i++) key.push(postfix[i].str);
        key = key.join(',');
        if (!subtrees.hasOwnProperty(key)) {
            var id = '$' + subtreesLength;
            subtrees[key] = {
                id: id,
                length: postfix.length,
                postfix: postfix,
            };
            intermediates.push({
                id: id,
                code: evalobj.code,
            });
            subtreesLength += 1;
        }
        return subtrees[key].id;
    }

    // postfix evaluation
    var qmap = {};
    for (var qi in queues) {
        var queue = queues[qi];
        var stack = [];  // EvalObject objects
        for (var i = 0; i < queue.length; i++) {
            var token = queue[i];
            let constexpr = MathFunctions['CONST'][1].langs[lang];
            // number
            if (token.type == 'number') {
                var s = token.str;
                if (!/\./.test(s)) s += '.';
                var obj = new EvalObject([token],
                    constexpr.replaceAll("%1", s),
                    true, new Interval(Number(s), Number(s)), true);
                stack.push(obj);
            }
            // variable
            else if (token.type == "variable") {
                var s = token.str;
                var isNumeric = false;
                var interval = new Interval();
                if (MathParser.isIndependentVariable(token.str)) {
                    s = MathParser.IndependentVariables[token.str];
                }
                else if (token.str == "e") {
                    s = constexpr.replaceAll("%1", Math.E);
                    isNumeric = true;
                    interval.x0 = interval.x1 = Math.E;
                }
                else if (token.str == "π") {
                    s = constexpr.replaceAll("%1", Math.PI);
                    isNumeric = true;
                    interval.x0 = interval.x1 = Math.PI;
                }
                else {
                    throw "Undeclared variable " + token.str;
                }
                stack.push(new EvalObject(
                    [token], s, isNumeric, interval, true));
            }
            // operators
            else if (token.type == "operator") {
                var v = null;
                if (token.str == "^") {
                    var v1 = stack[stack.length - 2];
                    var v2 = stack[stack.length - 1];
                    stack.pop(); stack.pop();
                    v = FunctionSubs.powEvalObjects(v1, v2, lang);
                }
                else {
                    var v1 = stack[stack.length - 2];
                    var v2 = stack[stack.length - 1];
                    stack.pop(); stack.pop();
                    if (token.str == "+")
                        v = FunctionSubs.addEvalObjects(v1, v2, lang);
                    if (token.str == "-")
                        v = FunctionSubs.subEvalObjects(v1, v2, lang);
                    if (token.str == "*")
                        v = FunctionSubs.mulEvalObjects(v1, v2, lang);
                    if (token.str == "/")
                        v = FunctionSubs.divEvalObjects(v1, v2, lang);
                }
                var id = addSubtree(v);
                v.postfix = [new Token('variable', id)];
                v.code = langpack.prefixes[0] + id.slice(1);
                stack.push(v);
            }
            // function
            else if (token.type == 'function') {
                var fun = MathFunctions[token.str];
                var numArgs = token.numArgs;
                var args = [];
                for (var j = numArgs; j > 0; j--)
                    args.push(stack[stack.length - j]);
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
                var v = fun.subSource(args, lang);
                var id = addSubtree(v);
                v.postfix = [new Token('variable', id)];
                v.code = langpack.prefixes[0] + id.slice(1);
                stack.push(v);
            }
            else {
                throw new Error("Unrecognized token `" + token + "`");
            }
        }
        if (stack.length != 1)
            throw new Error("Result stack length is not 1");
        qmap[qi] = stack[0].code;
    }

    // get result
    var result = {
        code: '',
        isCompatible: stack[0].isCompatible
    };
    var lines = [];
    for (var i = 0; i < intermediates.length; i++) {
        let intermediate = intermediates[i];
        var varname = langpack.prefixes[0] + intermediate.id.slice(1);
        var v = langpack.defs[0]
            .replaceAll("{%varname%}", varname)
            .replaceAll("{%expr%}", intermediate.code);
        lines.push(v);
    }
    result.code = langpack.fun
        .replaceAll("{%funname%}", funname)
        .replaceAll("{%funbody%}", lines.join('\n'));
    for (var qi in queues)
        result.code = result.code.replaceAll("{%" + qi + "%}", qmap[qi]);
    return result;
}

// Convert a postfix expressions to source code
CodeGenerator.postfixToSource = function (exprs, funnames, lang) {
    if (exprs.length != funnames.length)
        throw new Error("`exprs` and `funnames` have different lengths.");
    let langpack = this.langs[lang];
    if (langpack == undefined)
        throw new Error("Unsupported language `" + lang + "`");

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
        var r = this._postfixToSource(exprs[i], funnames[i], lang, extensionMap);
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
        isCompatible: isCompatible,
    };
}

