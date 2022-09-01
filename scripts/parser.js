"use strict";

// parse math equations, generate LaTeX and GLSL code

const PI = Math.PI;



// ============================ DEFINITIONS ==============================


function Token(type, str) {
    console.assert(type == 'number' || type == 'variable' ||
        type == 'operator' || type == 'function' || type == null);
    this.type = type;  // type of the token
    this.str = str;  // name of the token represented as a string
    this.numArgs = 0;  // number of arguments for functions
}

function Interval(x0 = -Infinity, x1 = Infinity) {
    this.x0 = Math.min(x0, x1);
    this.x1 = Math.max(x0, x1);
    if (!isFinite(this.x0)) this.x0 = -Infinity;
    if (!isFinite(this.x1)) this.x1 = Infinity;
    this.isPositive = function () {
        return this.x0 >= 0.;
    };
    this.isNegative = function () {
        return this.x1 <= 0.;
    };
    this.containsZero = function () {
        return this.x0 <= 0. && this.x1 >= 0.;
    };
}

function EvalObject(
    postfix, glsl,
    isNumeric, range = Interval(), isCompatible = true
) {
    this.postfix = postfix;
    this.glsl = glsl;
    this.isNumeric = isNumeric;  // zero gradient
    this.range = range;  // non-negative
    this.isCompatible = isCompatible;  // has no NAN
}

function EvalLatexObject(postfix, latex, precedence) {
    this.postfix = postfix;
    this.latex = latex;
    this.precedence = precedence;
}

function MathFunction(
    // all functions
    names, numArgs, latex, glsl,
    // univariate functions only
    // @monotonicFun: a callable function, not null when the function is not both increasing and decreasing
    domain = new Interval(), range = new Interval(), monotonicFun = null
    // multivariable functions
    // assert(this function has zero NAN area when all args have no NAN)
    // otherwise (pow, log) rewrite the subGlsl function
) {
    this.names = names;
    this.numArgs = numArgs;
    this.latex = latex;
    this.glsl = glsl;
    this.domain = domain;
    this.range = range;
    this.monotonicFun = monotonicFun;
    this.subGlsl = function (args) {
        if (args.length != this.numArgs)
            throw "Incorrect number of arguments for function " + this.names[0];
        var glsl = this.glsl;
        var postfix = [];
        var isNumeric = true;
        var isCompatible = true;
        for (var i = 0; i < args.length; i++) {
            var rep = "%" + (i + 1);
            postfix = postfix.concat(args[i].postfix);
            glsl = glsl.replaceAll(rep, args[i].glsl);
            isNumeric = isNumeric && args[i].isNumeric;
            isCompatible = isCompatible && args[i].isCompatible;
        }
        var result = new EvalObject(
            postfix.concat([new Token('function', names[0])]),
            glsl, isNumeric, new Interval(), isCompatible);
        if (args.length == 1) {
            const eps = 1e-8;
            if (args[0].range.x0 < this.domain.x0 - eps || args[0].range.x1 > this.domain.x1 + eps)
                result.isCompatible = false;
            if (args[0].range.x0 >= this.domain.x0 && args[0].range.x1 <= this.range.x1) {
                if (this.monotonicFun != null) result.range = new Interval(
                    this.monotonicFun(args[0].range.x0), this.monotonicFun(args[0].range.x1));
            }
            else result.range = new Interval(this.range.x0, this.range.x1);
        }
        return result;
    };
    this.subLatex = function (args) {
        if (/%0/.test(this.latex)) {
            var latexes = [];
            for (var i = 0; i < args.length; i++)
                latexes.push(args[i].latex);
            return this.latex.replaceAll("%0", latexes.join(','));
        }
        if (args.length != this.numArgs)
            throw "Incorrect number of arguments for function " + this.names[0];
        var latex = this.latex;
        for (var i = 0; i < args.length; i++) {
            var repv = "%" + (i + 1);
            latex = latex.replaceAll(repv, args[i].latex);
        }
        return latex;
    }
}
const mathFunctions = (function () {
    const funs0 = [
        new MathFunction(['if'], 3, '\\operatorname{if}\\left\\{%1>0:%2,%3\\right\\}', 'mf_if(%1,%2,%3)'),
        new MathFunction(['mod'], 2, '\\operatorname{mod}\\left(%1,%2\\right)', 'mf_mod(%1,%2)'),
        new MathFunction(['fract', 'frac'], 1, '\\operatorname{frac}\\left(%1\\right)', 'mf_fract(%1)', new Interval(), new Interval(0, 1)),
        new MathFunction(['floor'], 1, '\\lfloor{%1}\\rfloor', 'mf_floor(%1)', new Interval(), new Interval(), Math.floor),
        new MathFunction(['ceil'], 1, '\\lceil{%1}\\rceil', 'mf_ceil(%1)', new Interval(), new Interval(), Math.ceil),
        new MathFunction(['round'], 1, '\\operatorname{round}\\left(%1\\right)', 'mf_round(%1)', new Interval(), new Interval(), Math.round),
        new MathFunction(['abs'], 1, '\\left|%1\\right|', 'mf_abs(%1)', new Interval(), new Interval(0, Infinity)),
        new MathFunction(['sign', 'sgn'], 1, '\\operatorname{sign}\\left(%1\\right)', 'mf_sign(%1)', new Interval(), new Interval(-1, 1), (x) => x > 0. ? 1. : x < 0. ? -1. : 0.),
        new MathFunction(['max'], 0, '\\max\\left(%0\\right)', 'mf_max(%1,%2)'),
        new MathFunction(['min'], 0, '\\min\\left(%0\\right)', 'mf_min(%1,%2)'),
        new MathFunction(['clamp'], 3, '\\operatorname{clamp}\\left(%1,%2,%3\\right)', 'mf_clamp(%1,%2,%3)'),
        new MathFunction(['lerp', 'mix'], 3, '\\operatorname{lerp}\\left(%1,%2,%3\\right)', 'mf_lerp(%1,%2,%3)'),
        new MathFunction(['sqrt'], 1, '\\sqrt{%1}', 'mf_sqrt(%1)', new Interval(0, Infinity), new Interval(0, Infinity), Math.sqrt),
        new MathFunction(['cbrt'], 1, '\\sqrt[3]{%1}', 'mf_cbrt(%1)', Math.cbrt),
        new MathFunction(['pow'], 2, '\\left(%1\\right)^{%2}', 'mf_pow(%1,%2)'),
        new MathFunction(['exp'], 1, '\\exp\\left(%1\\right)', 'mf_exp(%1)', new Interval(), new Interval(0, Infinity), Math.exp),
        new MathFunction(['log', 'ln'], 1, '\\ln\\left(%1\\right)', 'mf_ln(%1)', new Interval(0, Infinity), new Interval(), Math.log),
        new MathFunction(['log'], 2, '\\log_{%1}\\left(%2\\right)', 'mf_log(%1,%2)'),
        new MathFunction(['sin'], 1, '\\sin\\left(%1\\right)', 'mf_sin(%1)', new Interval(), new Interval(-1, 1)),
        new MathFunction(['cos'], 1, '\\cos\\left(%1\\right)', 'mf_cos(%1)', new Interval(), new Interval(-1, 1)),
        new MathFunction(['tan'], 1, '\\tan\\left(%1\\right)', 'mf_tan(%1)'),
        new MathFunction(['csc'], 1, '\\csc\\left(%1\\right)', 'mf_csc(%1)'),
        new MathFunction(['sec'], 1, '\\sec\\left(%1\\right)', 'mf_sec(%1)'),
        new MathFunction(['cot'], 1, '\\cot\\left(%1\\right)', 'mf_cot(%1)'),
        new MathFunction(['sinh'], 1, '\\sinh\\left(%1\\right)', 'mf_sinh(%1)', new Interval(), new Interval(), Math.sinh),
        new MathFunction(['cosh'], 1, '\\cosh\\left(%1\\right)', 'mf_cosh(%1)', new Interval(), new Interval(1, Infinity)),
        new MathFunction(['tanh'], 1, '\\tanh\\left(%1\\right)', 'mf_tanh(%1)', new Interval(), new Interval(-1, 1), Math.tanh),
        new MathFunction(['csch'], 1, '\\mathrm{csch}\\left(%1\\right)', 'mf_csch(%1)'),
        new MathFunction(['sech'], 1, '\\mathrm{sech}\\left(%1\\right)', 'mf_sech(%1)', new Interval(), new Interval(0, 1)),
        new MathFunction(['coth'], 1, '\\mathrm{coth}\\left(%1\\right)', 'mf_coth(%1)'),
        new MathFunction(['arcsin', 'arsin', 'asin'], 1, '\\arcsin\\left(%1\\right)', 'mf_arcsin(%1)', new Interval(-1, 1), new Interval(-0.5 * PI, 0.5 * PI), Math.asin),
        new MathFunction(['arccos', 'arcos', 'acos'], 1, '\\arccos\\left(%1\\right)', 'mf_arccos(%1)', new Interval(-1, 1), new Interval(0.0, PI), Math.acos),
        new MathFunction(['arctan', 'artan', 'atan'], 1, '\\arctan\\left(%1\\right)', 'mf_arctan(%1)', new Interval(), new Interval(-0.5 * PI, 0.5 * PI), Math.atan),
        new MathFunction(['atan2', 'arctan', 'artan', 'atan'], 2, '\\operatorname{atan2}\\left(%1,%2\\right)', 'mf_atan2(%1,%2)'),
        new MathFunction(['arccot', 'arcot', 'acot'], 1, '\\mathrm{arccot}\\left(%1\\right)', 'mf_arccot(%1)', new Interval(), new Interval(-0.5 * PI, 0.5 * PI), (x) => 0.5 * PI - Math.atan(x)),
        new MathFunction(['arcsinh', 'arsinh', 'asinh'], 1, '\\mathrm{arcsinh}\\left(%1\\right)', 'mf_arcsinh(%1)', new Interval(), new Interval(), Math.asinh),
        new MathFunction(['arccosh', 'arcosh', 'acosh'], 1, '\\mathrm{arccosh}\\left(%1\\right)', 'mf_arccosh(%1)', new Interval(1, Infinity), new Interval(0, Infinity), Math.acosh),
        new MathFunction(['arctanh', 'artanh', 'atanh'], 1, '\\mathrm{arctanh}\\left(%1\\right)', 'mf_arctanh(%1)', new Interval(-1, 1), new Interval(), Math.atanh),
        new MathFunction(['arccoth', 'arcoth', 'acoth'], 1, '\\mathrm{arccoth}\\left(%1\\right)', 'mf_arccoth(%1)'),
    ];
    var funs = {};
    for (var i = 0; i < funs0.length; i++) {
        for (var j = 0; j < funs0[i].names.length; j++) {
            var name = funs0[i].names[j];
            if (funs[name] == undefined) funs[name] = {};
            funs[name]['' + funs0[i].numArgs] = funs0[i];
        }
    }
    funs['pow']['2'].subGlsl = function (args) {
        if (args.length != 2)
            throw "Incorrect number of arguments for function " + this.names[0];
        return powEvalObjects(args[0], args[1]);
    };
    funs['log']['2'].subGlsl = function (args) {
        if (args.length != 2)
            throw "Incorrect number of arguments for function " + this.names[0];
        return divEvalObjects(
            funs['ln']['1'].subGlsl([args[1]]),
            funs['ln']['1'].subGlsl([args[0]]));
    }
    funs['max']['0'].subGlsl = funs['min']['0'].subGlsl = function (args) {
        if (args.length < 2)
            throw "To few argument for function " + this.names[0];
        while (args.length >= 2) {
            var args1 = [];
            for (var i = 0; i + 1 < args.length; i += 2) {
                var glsl = this.glsl.replaceAll("%1", args[i].glsl).replaceAll("%2", args[i + 1].glsl);
                args1.push(new EvalObject(
                    args[i].postfix.concat(args[i + 1].postfix).concat([new Token('function', this.names[0])]),
                    glsl, args[i].isNumeric && args[i + 1].isNumeric,
                    this.names[0] == 'max' ? new Interval(
                        Math.max(args[i].range.x0, args[i + 1].range.x0),
                        Math.max(args[i].range.x1, args[i + 1].range.x1),
                    ) : new Interval(
                        Math.min(args[i].range.x0, args[i + 1].range.x0),
                        Math.min(args[i].range.x1, args[i + 1].range.x1),
                    ),
                    args[i].isCompatible && args[i + 1].isCompatible));
            }
            if (args.length % 2 == 1) args1.push(args[args.length - 1]);
            args = args1;
        }
        return args[0];
    };
    return funs;
})();

// test if the variable name is an independent variable
function isIndependentVariable(name) {
    return name == 'x' || name == 'y' || name == 'z';
}


// ============================ PARSING ==============================

// Balance parenthesis, used to be part of exprToPostfix()
function balanceParenthesis(expr) {
    expr = expr.trim().replace(/\[/g, '(').replace(/\]/g, ')');
    if (expr == "") throw "Empty expression";
    var exprs = [{ str: "", parenCount: 0, absCount: 0 }];
    for (var i = 0; i < expr.length; i++) {
        if (expr[i] == "(") {
            exprs.push({ str: expr[i], parenCount: 1, absCount: 0 });
        }
        else if (expr[i] == ")") {
            if (exprs[exprs.length - 1].parenCount <= 0) throw "Mismatched parenthesis";
            //if (exprs[exprs.length - 1].absCount % 2 != 0) throw "Mismatched absolute value vertical bar";
            var app = exprs[exprs.length - 1].str;
            for (var j = 0; j < exprs[exprs.length - 1].parenCount; j++)
                app += ")";
            exprs.pop();
            exprs[exprs.length - 1].str += app;
        }
        else if (expr[i] == "|") {
            if (exprs[exprs.length - 1].absCount % 2 == 0) {
                exprs[exprs.length - 1].str += "abs(";
                exprs[exprs.length - 1].parenCount += 1;
            }
            else {
                exprs[exprs.length - 1].str += ")";
                exprs[exprs.length - 1].parenCount -= 1;
            }
            exprs[exprs.length - 1].absCount += 1;
        }
        else {
            exprs[exprs.length - 1].str += expr[i];
        }
    }
    while (exprs.length != 0) {
        let back = exprs[exprs.length - 1];
        if (back.parenCount < 0) throw "Mismatched parenthesis";
        while (back.parenCount > 0)
            back.str += ")", back.parenCount -= 1;
        if (exprs.length <= 1) break;
        exprs.pop(); exprs[exprs.length - 1].str += back.str;
    }
    return exprs[0].str;
}

// Parse a human math expression to postfix notation
function exprToPostfix(expr, mathFunctions) {
    expr = balanceParenthesis(expr);

    // subtraction sign
    var expr1s = [{ s: "", pc: 0 }];
    var prev_c = null;
    for (var i = 0; i < expr.length; i++) {
        let eb = expr1s[expr1s.length - 1];
        if (expr[i] == "-" && (prev_c == null || /[\(\+\-\*\/\^\,]/.test(prev_c))) {
            expr1s.push({
                s: expr[i],
                pc: 0
            });
        }
        else if (/[A-Za-z_\d\.\(\)\^]/.test(expr[i]) || eb.pc > 0) {
            if (expr[i] == '(') {
                eb.s += expr[i];
                eb.pc += 1;
            }
            else if (expr[i] == ')') {
                while (expr1s[expr1s.length - 1].pc == 0) {
                    var s1 = expr1s[expr1s.length - 1].s;
                    if (/^\-/.test(s1)) s1 = "(0" + s1 + ")";
                    expr1s.pop();
                    expr1s[expr1s.length - 1].s += s1;
                }
                eb = expr1s[expr1s.length - 1];
                eb.s += expr[i];
                eb.pc -= 1;
            }
            else eb.s += expr[i];
        }
        else if (/^\-/.test(eb.s)) {
            var e1 = "(0" + eb.s + ")" + expr[i];
            expr1s.pop();
            expr1s[expr1s.length - 1].s += e1;
        }
        else {
            eb.s += expr[i];
        }
        if (!/\s/.test(expr[i])) prev_c = expr[i];
    }
    while (expr1s.length > 1) {
        var eb = expr1s[expr1s.length - 1];
        expr1s.pop();
        //console.assert(eb.pc == 0);
        if (/^\-/.test(eb.s)) eb.s = "(0" + eb.s + ")";
        expr1s[expr1s.length - 1].s += eb.s;
    }
    expr = expr1s[0].s;

    // multiplication sign
    var expr1 = "";
    for (var i = 0; i < expr.length;) {
        var v = "";
        while (i < expr.length && /[A-Za-z_\d\.\(\)]/.test(expr[i])) {
            v += expr[i];
            i++;
        }
        var has_ = false;
        for (var j = 0; j < v.length;) {
            if (expr1.length > 0) {
                if ((/\)/.test(expr1[expr1.length - 1]) && /[A-Za-z_\d\.\(]/.test(v[j]))
                    || (j != 0 && /[A-Za-z_\d\.\)]/.test(v[j - 1]) && /\(/.test(v[j]))) expr1 += "*";
                else if (!has_ && /[A-Za-z\d\.]/.test(expr1[expr1.length - 1]) && /[A-Za-z]/.test(v[j]) && v[j] != "_")
                    expr1 += "*";
                else if (!has_ && /[A-Za-z]/.test(expr1[expr1.length - 1]) && /\d/.test(v[j]))
                    expr1 += "_";
            }
            var next_lp = v.substring(j, v.length).search(/\(/);
            if (next_lp != -1) {
                var funName = v.substring(j, j + next_lp);
                if (mathFunctions[funName] != undefined) {
                    expr1 += funName;
                    j += funName.length;
                }
            }
            if (v[j] == "_") has_ = true;
            if (v[j] == ")" || v[j] == "(") has_ = false;
            expr1 += v[j];
            j++;
        }
        if (/\s/.test(expr[i])) {
            if (/[A-Za-z_\d]{2}/.test(expr1[expr1.length - 1] + expr[i + 1]))
                expr1 += "*";
            i++;
        }
        else if (i < expr.length) {
            expr1 += expr[i];
            i++;
        }
    }
    expr = expr1;

    // operators
    expr = expr.replace(/\*\*/g, "^");
    const operators = {
        '+': 1, '-': 1,
        '*': 2, '/': 2,
        '^': 3
    };
    const isLeftAssociative = {
        '+': true, '-': true, '*': true, '/': true,
        '^': false
    };

    // console.log("preprocessed", expr);

    // shunting-yard algorithm
    var queue = [], stack = [];  // Token objects
    for (var i = 0; i < expr.length;) {
        // get token
        var token = "";
        while (i < expr.length && /[A-Za-z0-9_\.]/.test(expr[i])) {
            token += expr[i];
            i++;
        }
        if (token == "") {
            token = expr[i];
            i++;
        }
        // number
        if (/^[0-9]*\.{0,1}[0-9]*$/.test(token) || /^[0-9]*\.{0,1}[0-9]+$/.test(token)) {
            if (!isFinite(Number(token))) throw "Failed to parse number " + token;
            var num = token.trim('0');
            if (num == "") num = "0.";
            if (num[0] == '.') num = "0" + num;
            if (!/\./.test(num)) num += ".";
            queue.push(new Token("number", num));
        }
        // function
        else if (mathFunctions[token] != undefined) {
            var fun = new Token("function", token);
            stack.push(fun);
        }
        // variable name
        else if (/^[A-Za-z](_[A-Za-z0-9]+)?$/.test(token)) {
            var variable = new Token("variable", token);
            queue.push(variable);
        }
        // comma to separate function arguments
        else if (token == ",") {
            while (stack[stack.length - 1].str != '(') {
                queue.push(stack[stack.length - 1]);
                stack.pop();
                if (stack.length == 0)
                    throw ("Comma encountered without a function.");
            }
            stack.pop();
            if (stack.length == 0 || stack[stack.length - 1].type != "function")
                throw ("Comma encountered without a function.");
            stack[stack.length - 1].numArgs += 1;
            stack.push(new Token(null, '('));
        }
        // operator
        else if (operators[token] != undefined) {
            while (stack.length != 0 && stack[stack.length - 1].type == "operator" &&
                (operators[stack[stack.length - 1].str] > operators[token] ||
                    (isLeftAssociative[token] && operators[stack[stack.length - 1].str] == operators[token]))) {
                queue.push(stack[stack.length - 1]);
                stack.pop();
            }
            stack.push(new Token("operator", token));
        }
        // parenthesis
        else if (token == "(") {
            stack.push(new Token(null, token));
        }
        else if (token == ")") {
            while (stack[stack.length - 1].str != '(') {
                queue.push(stack[stack.length - 1]);
                stack.pop();
                console.assert(stack.length != 0);
            }
            stack.pop();
            if (stack.length != 0 && stack[stack.length - 1].type == "function") {
                var fun = stack[stack.length - 1];
                stack.pop();
                fun.numArgs += 1;
                queue.push(fun);
            }
        }
        // absolute value
        else if (token == "|") {
            var fun = new Token("function", "abs");
            fun.numArgs = 1;
            if (stack.length >= 2 && stack[stack.length - 1].str != "(" && stack[stack.length - 2].str == "|") {
                queue.push(stack[stack.length - 1]);
                stack.pop(); stack.pop();
                queue.push(fun);
            }
            else if (stack.length >= 1 && stack[stack.length - 1].str == "|") {
                stack.pop();
                queue.push(fun);
            }
            else stack.push(new Token(null, token));
        }
        else {
            throw "Unrecognized token " + token;
        }
    }
    while (stack.length != 0) {
        queue.push(stack[stack.length - 1]);
        stack.pop();
    }
    return queue;
}

// Get a list of variables from a postfix notation
function getVariables(postfix, excludeIndependent) {
    var vars = new Set();
    for (var i = 0; i < postfix.length; i++) {
        if (postfix[i].type == 'variable') {
            if (excludeIndependent && isIndependentVariable(postfix[i].str))
                continue;
            vars.add(postfix[i].str);
        }
    }
    return vars;
}

// Parse console input to postfix notation
function parseInput(input) {
    // split to arrays
    input = input.replaceAll('\r', ';').replaceAll('\n', ';');
    input = input.trim().trim(';').trim().split(';');

    // read each line of input
    let reVarname = /^[A-Za-z]((_[A-Za-z\d]+)|(_?\d[A-Za-z\d]*))?$/;
    var parseFunction = function (funstr) {
        var match = /^([A-Za-z0-9_]+)\s*\(([A-Za-z0-9_\s\,]+)\)$/.exec(funstr);
        if (match == null) return false;
        if (!reVarname.test(match[1])) return false;
        if (match[1] == "e") return false;
        var matches = [match[1]];
        match = match[2].split(',');
        for (var i = 0; i < match.length; i++) {
            var name = match[i];
            if (!reVarname.test(name)) return false;
            if (name.length >= 2 && name[1] != "_")
                name = name[0] + "_" + name.substring(1, name.length);
            matches.push(name);
        }
        return matches;
    };
    var functions_str = {};
    var variables_str = {};
    var mainEqusLr = [];  // main equation left/right
    for (var i = 0; i < input.length; i++) {
        var line = input[i].trim();
        if (/\#/.test(line)) line = line.substring(0, line.search('#')).trim();
        if (line == '') continue;
        if (/\=/.test(line)) {
            var lr = line.split('=');
            var left = lr[0].trim();
            var right = lr[1].trim();
            // variable
            if (reVarname.test(left)) {
                if (left.length >= 2 && left[1] != "_") left = left[0] + "_" + left.substring(1, left.length);
                // main equation
                if (isIndependentVariable(left)) {
                    mainEqusLr.push({ left: balanceParenthesis(left), right: balanceParenthesis(right) });
                }
                // definition
                else {
                    if (variables_str[left] != undefined)
                        throw "Multiple definitions of variable " + left;
                    if (left == "e")
                        throw "You can't use constant 'e' as a variable name.";
                    variables_str[left] = right;
                }
            }
            // function
            else if (parseFunction(left)) {
                var fun = parseFunction(left);
                // main equation
                if (mathFunctions[fun[0]] != undefined) {
                    mainEqusLr.push({ left: left, right: balanceParenthesis(right) });
                }
                // function definition
                else {
                    if (functions_str[fun[0]] != undefined)
                        throw "Multiple definitions of function " + fun[0];
                    functions_str[fun[0]] = {
                        params: fun.slice(1),
                        definition: right
                    };
                }
            }
            // main equation
            else {
                if (Number(right) == '0') mainEqusLr.push({ left: balanceParenthesis(left), right: '0' });
                else mainEqusLr.push({ left: balanceParenthesis(left), right: balanceParenthesis(right) });
            }
        }
        // main equation
        else {
            mainEqusLr.push({ left: line, right: '0' })
        }
    }

    // parse expressions
    var functions = {};
    for (var funname in mathFunctions) functions[funname] = mathFunctions[funname];
    for (var funname in functions_str) {
        let fun = functions_str[funname];
        functions[funname] = {
            'args': fun.params,
            'numArgs': fun.params.length,
            'definition': fun.definition,
            'postfix': null,
            'resolving': false
        }
    }
    for (var funname in functions_str) {
        let fun = functions[funname];
        for (var i = 0; i < fun.numArgs; i++) {
            if (functions_str.hasOwnProperty(fun.args[i]))
                throw "You can't use function name \"" + fun.args[i] + "\" as a function argument name.";
        }
        fun.postfix = exprToPostfix(fun.definition, functions);
    }
    var variables = {};
    for (var varname in variables_str) {
        var postfix = exprToPostfix(variables_str[varname], functions);
        variables[varname] = {
            'postfix': postfix,
            'isFunParam': false,
            'resolving': false
        };
    }
    var mainEqus = [];
    for (var i = 0; i < mainEqusLr.length; i++) {
        mainEqusLr[i].left = exprToPostfix(mainEqusLr[i].left, functions);
        mainEqusLr[i].right = exprToPostfix(mainEqusLr[i].right, functions);
        if (mainEqusLr[i].right.length == 1 && Number(mainEqusLr[i].right[0].str) == 0) {
            mainEqus.push(mainEqusLr[i].left);
        }
        else {
            var left = mainEqusLr[i].left;
            var right = mainEqusLr[i].right;
            mainEqus.push(left.concat(right).concat([new Token('operator', '-')]));
        }
    }

    // resolve dependencies
    function dfs(equ, variables) {
        var stack = [];
        for (var i = 0; i < equ.length; i++) {
            if (equ[i].type == 'number') {
                stack.push([equ[i]]);
            }
            else if (equ[i].type == 'variable') {
                var variable = variables[equ[i].str];
                if (variable == undefined) {
                    stack.push([equ[i]]);
                }
                else if (variable.isFunParam) {
                    stack.push(variable.postfix);  // ???
                }
                else {
                    if (variable.resolving) throw "Recursive definition is not supported.";
                    variable.resolving = true;
                    var res = dfs(variable.postfix, variables)[0];
                    stack.push(res);
                    variable.resolving = false;
                }
            }
            else if (equ[i].type == 'function') {
                // user-defined function
                if (mathFunctions[equ[i].str] == undefined) {
                    let fun = functions[equ[i].str];
                    var variables1 = {};
                    for (var varname in variables)
                        variables1[varname] = variables[varname];
                    if (stack.length < fun.numArgs)
                        throw "No enough arguments for function " + equ[i].str;
                    for (var j = 0; j < fun.numArgs; j++) {
                        variables1[fun.args[j]] = {
                            'postfix': stack[stack.length - fun.numArgs + j],
                            'isFunParam': true,
                            'resolving': false
                        };
                    }
                    for (var j = 0; j < fun.numArgs; j++)
                        stack.pop();
                    var res = dfs(fun.postfix, variables1)[0];
                    stack.push(res);
                }
                // built-in function
                else {
                    var params = [];
                    for (var j = equ[i].numArgs; j > 0; j--)
                        params = params.concat(stack[stack.length - j]);
                    for (var j = 0; j < equ[i].numArgs; j++)
                        stack.pop();
                    params.push(equ[i]);
                    stack.push(params);
                }
            }
            else if (equ[i].type == 'operator') {
                if (stack.length < 2) throw "No enough tokens in the stack"
                var expr = stack[stack.length - 2].concat(stack[stack.length - 1]);
                expr.push(equ[i]);
                stack.pop(); stack.pop();
                stack.push(expr);
            }
            else {
                throw "Unrecognized token " + equ[i];
            }
            var totlength = 0;
            for (var j = 0; j < stack.length; j++) totlength += stack[j].length;
            if (totlength >= 65536) {
                throw "Definitions are nested too deeply."
            }
        }
        if (stack.length != 1) throw "Result stack length is not 1";
        return stack;
    }
    for (var i = 0; i < mainEqus.length; i++)
        mainEqus[i] = dfs(mainEqus[i], variables)[0];

    // latex
    var latexList = [];
    for (var i = 0; i < input.length; i++) {
        var line = input[i].trim();
        var comment = "";
        if (/\#/.test(line)) {
            var j = line.search('#');
            comment = '# ' + line.substr(j + 1, line.length).trim();
            line = line.substring(0, j).trim();
        }
        if (line == '' && comment == '') continue;
        if (line != "") {
            var left = line, right = "0";
            if (/\=/.test(line)) {
                var lr = line.split('=');
                left = lr[0].trim(), right = lr[1].trim();
            }
            left = postfixToLatex(exprToPostfix(left, functions));
            right = postfixToLatex(exprToPostfix(right, functions));
            line = left + "=" + right;
        }
        if (comment != "") {
            comment = comment.replaceAll("\\", "\\\\").replaceAll("$", "\\$");
            comment = comment.replaceAll("{", "\\{").replaceAll("}", "\\}");
            comment = "\\color{#5b5}\\texttt{" + comment + "}";
            if (line != "") comment = "\\quad" + comment;
        }
        latexList.push(line + comment);
    }
    return {
        postfix: mainEqus,
        latex: latexList
    }
}


// ============================ EVALUATION ==============================

// operations of EvabObject
function addEvalObjects(a, b) {
    return new EvalObject(
        a.postfix.concat(b.postfix.concat([new Token('operator', '+')])),
        "mf_add(" + a.glsl + "," + b.glsl + ")",
        a.isNumeric && b.isNumeric,
        new Interval(a.range.x0 + b.range.x0, a.range.x1 + b.range.x1),
        a.isCompatible && b.isCompatible
    );
}
function subEvalObjects(a, b) {
    var interval = new Interval(
        a.range.x0 - b.range.x1,
        a.range.x1 - b.range.x0);
    return new EvalObject(
        a.postfix.concat(b.postfix.concat([new Token('operator', '-')])),
        "mf_sub(" + a.glsl + "," + b.glsl + ")",
        a.isNumeric && b.isNumeric,
        interval,
        a.isCompatible && b.isCompatible
    );
}
function mulEvalObjects(a, b) {
    return new EvalObject(
        a.postfix.concat(b.postfix.concat([new Token('operator', '*')])),
        "mf_mul(" + a.glsl + "," + b.glsl + ")",
        a.isNumeric && b.isNumeric,
        new Interval(
            Math.min(
                a.range.x0 * b.range.x0, a.range.x0 * b.range.x1,
                a.range.x1 * b.range.x0, a.range.x1 * b.range.x1),
            Math.max(
                a.range.x0 * b.range.x0, a.range.x0 * b.range.x1,
                a.range.x1 * b.range.x0, a.range.x1 * b.range.x1)
        ),
        a.isCompatible && b.isCompatible
    );
}
function divEvalObjects(a, b) {
    var interval = new Interval();
    if (b.range.containsZero()) {
        if ((a.range.isPositive() || a.range.isNegative()) && (b.range.isPositive() || b.range.isNegative()))
            interval = new Interval(0,
                a.range.isPositive() == b.range.isPositive() ? Infinity : -Infinity);
    }
    else if (!isFinite(a.range.x0) && isFinite(a.range.x1)) {
        if (b.range.isPositive()) interval = new Interval(
            -Infinity, Math.max(a.range.x1 / b.range.x0, a.range.x1 / b.range.x1));
        if (b.range.isNegative()) interval = new Interval(
            Math.min(a.range.x1 / b.range.x0, a.range.x1 / b.range.x1), Infinity);
    }
    else if (!isFinite(a.range.x1) && isFinite(a.range.x0)) {
        if (b.range.isPositive()) interval = new Interval(
            Math.min(a.range.x0 / b.range.x0, a.range.x0 / b.range.x1), Infinity);
        if (b.range.isNegative()) interval = new Interval(
            -Infinity, Math.max(a.range.x0 / b.range.x0, a.range.x0 / b.range.x1));
    }
    else if (isFinite(a.range.x0) && isFinite(a.range.x1)) {
        interval = new Interval(
            Math.min(
                a.range.x0 / b.range.x0, a.range.x0 / b.range.x1,
                a.range.x1 / b.range.x0, a.range.x1 / b.range.x1),
            Math.max(
                a.range.x0 / b.range.x0, a.range.x0 / b.range.x1,
                a.range.x1 / b.range.x0, a.range.x1 / b.range.x1)
        );
    }
    return new EvalObject(
        a.postfix.concat(b.postfix.concat([new Token('operator', '/')])),
        "mf_div(" + a.glsl + "," + b.glsl + ")",
        a.isNumeric && b.isNumeric,
        interval,
        a.isCompatible && b.isCompatible
    );
}
function powEvalObjects(a, b) {
    if (a.glsl == 'e' || a.glsl == '' + Math.E) {
        return new EvalObject(
            a.postfix.concat(b.postfix.concat([new Token('operator', '^')])),
            "mf_exp(" + b.glsl + ")",
            b.isNumeric,
            new Interval(Math.exp(b.range.x0), Math.exp(b.range.x1)),
            b.isCompatible
        )
    }
    var n = b.range.x0 == b.range.x1 ? b.range.x0 : NaN;
    if (n >= -64 && n <= 65536 && n == Math.round(n)) {
        if (n == 0) return new EvalObject(
            [new Token("number", '1.')], "mf_const(1.)",
            true, new Interval(1, 1), a.isCompatible
        );
        if (n == 1) return a;
        var interval = new Interval(
            n % 2 == 0 && a.range.containsZero() ? 0.0 :
                Math.min(Math.pow(a.range.x0, n), Math.pow(a.range.x1, n)),
            Math.max(Math.pow(a.range.x0, n), Math.pow(a.range.x1, n)));
        if (n >= 2 && n <= 12)
            return new EvalObject(
                a.postfix.concat(b.postfix.concat([new Token('operator', '^')])),
                "mf_pow" + n + "(" + a.glsl + ")",
                a.isNumeric, interval, a.isCompatible
            )
        return new EvalObject(
            a.postfix.concat(b.postfix.concat([new Token('operator', '^')])),
            "mf_powint(" + a.glsl + "," + b.glsl + ")",
            a.isNumeric, interval,
            a.range.containsZero() && n < -4 ? false : a.isCompatible
        )
    }
    var interval = new Interval();
    if (a.range.isPositive()) interval = new Interval(
        Math.pow(a.range.x0, b.range.x0),
        Math.pow(a.range.x1, b.range.x1)
    );
    return new EvalObject(
        a.postfix.concat(b.postfix.concat([new Token('operator', '^')])),
        "mf_pow(" + a.glsl + "," + b.glsl + ")",
        a.isNumeric && b.isNumeric,
        interval,
        a.isCompatible && a.range.isPositive() && b.isCompatible
    )
}

// Convert a post-polish math expression to GLSL code
function postfixToGlsl(queue) {
    // subtree counter
    var subtreesLength = 0;
    var subtrees = {};
    var intermediates = [];
    function addSubtree(evalobj) {
        let postfix = evalobj.postfix;
        var key = [];
        for (var i = 0; i < postfix.length; i++) key.push(postfix[i].str);
        key = key.join(',');
        if (!subtrees.hasOwnProperty(key)) {
            var id = '' + subtreesLength;
            subtrees[key] = {
                id: id,
                length: postfix.length,
                postfix: postfix,
            };
            intermediates.push({
                id: id,
                glsl: evalobj.glsl,
            });
            subtreesLength += 1;
        }
        return subtrees[key].id;
    }
    // postfix evaluation
    var stack = [];  // EvalObject objects
    for (var i = 0; i < queue.length; i++) {
        var token = queue[i];
        // number
        if (token.type == 'number') {
            var s = token.str;
            if (!/\./.test(s)) s += '.';
            stack.push(new EvalObject([token], "mf_const(" + s + ")",
                true, new Interval(Number(s), Number(s)), true));
        }
        // variable
        else if (token.type == "variable") {
            var s = token.str;
            var isNumeric = false;
            var interval = new Interval();
            if (isIndependentVariable(token.str)) {
                if (token.str == 'x') s = "mf_x()";
                if (token.str == 'y') s = "mf_y()";
                if (token.str == 'z') s = "mf_z()";
            }
            else if (token.str == "e") {
                s = "mf_const(" + Math.E + ")";
                isNumeric = true;
                interval.x0 = interval.x1 = Math.E;
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
                v = powEvalObjects(v1, v2);
            }
            else {
                var v1 = stack[stack.length - 2];
                var v2 = stack[stack.length - 1];
                stack.pop(); stack.pop();
                if (token.str == "+") v = addEvalObjects(v1, v2);
                if (token.str == "-") v = subEvalObjects(v1, v2);
                if (token.str == "*") v = mulEvalObjects(v1, v2);
                if (token.str == "/") v = divEvalObjects(v1, v2);
            }
            var id = addSubtree(v);
            v.postfix = [new Token('variable', id)];
            v.glsl = "v" + id;
            stack.push(v);
        }
        // function
        else if (token.type == 'function') {
            var fun = mathFunctions[token.str];
            var numArgs = token.numArgs;
            var args = [];
            for (var j = numArgs; j > 0; j--)
                args.push(stack[stack.length - j]);
            for (var j = 0; j < numArgs; j++)
                stack.pop();
            if (fun['' + numArgs] == undefined) fun = fun['0'];
            else fun = fun['' + numArgs];
            if (fun == undefined)
                throw "Incorrect number of arguments for function " + token.str;
            var v = fun.subGlsl(args);
            var id = addSubtree(v);
            v.postfix = [new Token('variable', id)];
            v.glsl = "v" + id;
            stack.push(v);
        }
        else {
            throw "Unrecognized token " + equ[i];
        }
    }
    if (stack.length != 1) throw "Result stack length is not 1";
    // get result
    var result = {
        glsl: [],
        glslgrad: [],
        isCompatible: stack[0].isCompatible
    };
    for (var i = 0; i < intermediates.length; i++) {
        let intermediate = intermediates[i];
        var v = "float v" + intermediate.id + " = " + intermediate.glsl + ";";
        var g = "vec4 v" + intermediate.id + " = " + intermediate.glsl.replace(/([^A-Za-z]?)mf_/g, "$1mfg_") + ";";
        result.glsl.push(v);
        result.glslgrad.push(g);
    }
    result.glsl.push("return " + stack[0].glsl + ";");
    result.glsl = result.glsl.join('\n');
    result.glslgrad.push("return " + stack[0].glsl + ";");
    result.glslgrad = result.glslgrad.join('\n');
    return result;
}

// Convert a post-polish math expression to LaTeX code
function postfixToLatex(queue) {
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
        return varname;
    }
    var stack = [];
    for (var i = 0; i < queue.length; i++) {
        var token = queue[i];
        // number
        if (token.type == 'number') {
            var s = token.str.replace(/\.$/, "");
            if (s == "" || s[0] == ".") s = "0" + s;
            stack.push(new EvalLatexObject([token], s, Infinity));
        }
        // variable
        else if (token.type == "variable") {
            var s = varnameToLatex(token.str);
            if (s == "e") s = "\\operatorname{e}";
            //else if (!isIndependentVariable(s)) s = "{\\color{red}{" + s + "}}";
            stack.push(new EvalLatexObject([token], s, Infinity));
        }
        // operators
        else if (token.type == "operator") {
            var precedence = operators[token.str];
            var v1 = stack[stack.length - 2];
            var v2 = stack[stack.length - 1];
            stack.pop(); stack.pop();
            var tex1 = v1.latex, tex2 = v2.latex;
            if (token.str != "/" && !(token.str == "^" && tex1 == "\\operatorname{e}")) {
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
            }
            else throw "Unrecognized operator" + token.str;
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
            var fun = mathFunctions[token.str];
            if (fun != undefined) {
                if (fun['' + numArgs] == undefined) fun = fun['0'];
                else fun = fun['' + numArgs];
                if (fun == undefined) throw "Incorrect number of function arguments for " + token.str;
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
            throw "Unrecognized token " + equ[i];
        }
    }
    if (stack.length != 1) throw "Result stack length is not 1";
    return stack[0].latex;
}

