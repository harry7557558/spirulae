// Parse function strings into postfix

"use strict";


let MathParser = {
    // independent variables, one letter, can be reassigned
    IndependentVariables: {
        'x': "x",
        'y': "y",
        'z': "z"
    },
    isIndependentVariable: function (name) {
        return MathParser.IndependentVariables.hasOwnProperty(name);
    },
    // dependent variables, one letter
    DependentVariables: { 'val': true },  // name: bool required, number for groups
    DependentFunctions: {},
    isDependentVariable: function (name) {
        let dvars = MathParser.DependentVariables;
        if (dvars.hasOwnProperty(name))
            return true;
        for (var i in dvars) {
            if (/^\d/.test(i)) {
                if (dvars[i].hasOwnProperty(name))
                    return true;
            }
        }
        return false;
    },
    isDependentFunction: function (name) {
        return MathParser.DependentFunctions.hasOwnProperty(name);
    },
    // imaginary unit i, j
    ImaginaryUnits: {
        "i": "i",
        "j": "j"
    },
    isImaginaryUnit: function (name) {
        return MathParser.ImaginaryUnits.hasOwnProperty(name);
    },
    // always use complex arithmetic for nan functions
    complexMode: false,
    // regex to match a variable/function name
    reVarname: /^[A-Za-zΑ-Ωα-ω]((_[A-Za-zΑ-Ωα-ω\d]+)|(_?\d[A-Za-zΑ-Ωα-ω\d]*))?$/,
    matchFunction: function (funstr) {
        var match = /^([A-Za-zΑ-Ωα-ω0-9_]+)\s*\(([A-Za-zΑ-Ωα-ω0-9_\s\,]+)\)$/.exec(funstr);
        if (match == null) return false;
        if (!MathParser.reVarname.test(match[1])) return false;
        if (match[1] == "e" || match[1] == "π") return false;
        if (MathParser.isImaginaryUnit(match[1])) return false;
        var matches = [match[1]];
        match = match[2].split(',');
        for (var i = 0; i < match.length; i++) {
            var name = match[i];
            if (!MathParser.reVarname.test(name)) return false;
            if (name.length >= 2 && name[1] != "_")
                name = name[0] + "_" + name.substring(1, name.length);
            matches.push(name);
        }
        return matches;
    },
    // greek letters
    greekLetters: [],
};


// Initialize Greek letter list, called after initing functions
MathParser.initGreekLetters = function () {
    // Greek letters, omitted confusable ones
    const GREEK = [
        ["α", "alpha"],
        ["β", "beta"],
        ["γ", "gamma"],
        ["δ", "delta"],
        ["ε", "epsilon"],
        ["η", "eta"],
        ["θ", "theta"],
        ["λ", "lambda"],
        ["μ", "mu"],
        ["π", "pi"],
        ["ρ", "rho"],
        ["σ", "sigma"],
        ["τ", "tau"],
        ["φ", "phi"],
        ["ψ", "psi"],
        ["ω", "omega"],
        ["Δ", "Delta"],
        ["Λ", "Lambda"],
        ["Φ", "Phi"],
        ["Ψ", "Psi"],
        ["Ω", "Omega"],
    ];
    for (var i = 0; i < GREEK.length; i++) {
        var unicode = GREEK[i][0];
        var name = GREEK[i][1];
        var interfere = [];
        for (var funname in MathFunctions) {
            if (funname.indexOf(name) != -1)
                interfere.push(funname);
        }
        if (interfere.length > 0)
            console.log("The Greek letter " + name + " is omitted due to conflict with function name(s) " + interfere.join(', '));
        else MathParser.greekLetters.push([name, unicode])
    }
    MathParser.greekLetters.sort((a, b) => b[0].length - a[0].length);
}


// Balance parenthesis, used to be part of exprToPostfix()
MathParser.balanceParenthesis = function (expr) {
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


// "sinx" -> "sin(x)"
MathParser.addFunctionParenthesis = function (expr) {
    expr = expr.replaceAll(/\s+/g, ' ');
    const MINFL = 2;  // minimum function length
    const MAXFL = 5;  // maximum function length
    var res = "";  // result string
    var fun = "";  // function name, nonempty if inside function
    var pow = "";  // ^2 in sin^2
    var tmp = "";  // temp string
    var close = "";  // close parenthesis
    for (var ci = 0; ci <= expr.length; ci++) {
        var c = ci == expr.length ? '' : expr[ci];
        // console.log(c, expr.slice(ci+1), res, fun, tmp, close, pow);
        if (/[A-Za-z0-9Α-Ωα-ω_\.]/.test(c)) {
            // sin^ 2 -> sin^2
            if (tmp == "" && pow != "" && /[0-9\.]/.test(c)) {
                pow += c;
                var bi = close.indexOf('}')+pow.length;
                close = close.slice(0, bi) + c + close.slice(bi);
                continue;
            }
            tmp += c;
            pow = "";
            // erf inv -> erfinv
            if (fun != "" && MathFunctions.hasOwnProperty(fun+tmp)
                // && MathFunctions[fun+tmp].hasOwnProperty(1)
            ) {
                fun += tmp;
                tmp = "";
                continue;
            }
            // ln arc sin -> ln(arcsin
            if (fun != "" && MathFunctions.hasOwnProperty(tmp)) {
                res += fun + "(";
                close = ")" + close;
                fun = tmp, tmp = "";
                continue;
            }
            // check function name match
            for (var l = MAXFL; l >= MINFL; l--) {
                if (l > tmp.length)
                    continue;
                var name = tmp.slice(tmp.length-l);
                var pre = tmp.slice(0, tmp.length-l);
                if (/_/.test(pre)) continue;
                if (MathFunctions.hasOwnProperty(name) &&
                    MathFunctions[name].hasOwnProperty(1)
                ) {
                    if (fun != "") {
                        // sinxcos -> sin(x)cos(
                        if (tmp.length > l && !/^[\dπ\.]+$/.test(pre)) {
                            res += fun + "(" + pre + close;
                            close = ")";
                            fun = name;
                            tmp = pow = "";
                        }
                        // lnsin -> ln(sin(
                        else {
                            res += fun + "(" + pre;
                            close = ")" + close;
                            fun = name;
                            tmp = pow = "";
                        }
                    }
                    // xsin -> x*sin(
                    else {
                        res += pre;
                        close = ")" + close;
                        fun = name;
                        tmp = pow = "";
                    }
                    break;
                }
            }
        }
        else {
            // sin( -> sin(
            if (c == "(" && fun != "" && tmp == "") {
                if (fun[fun.length-1] != '\b') {
                    res += fun + c;
                    fun += new Array(fun.length+1).fill('\b').join('');
                }
                else res += c;
                // sin^2(...) -> sin(...)^2
                close = close.replace(')', '');
                if (/^\}?\^/.test(close)) {
                    var t = close.slice(0, (close+')').indexOf(')'));
                    close = close.slice(t.length);
                    var depth = 0, i;
                    for (i = ci+1; i < expr.length; i++) {
                        if (expr[i] == '(')
                            depth += 1;
                        if (expr[i] == ')') {
                            depth -= 1;
                            if (depth <= 0) break;
                        }
                    }
                    expr = expr.slice(0, i+1) + t + expr.slice(i+1);
                }
                pow = "";
            }
            // sin(x) ( -> sin(x)*(
            else if (c == "(" && fun == "" && close != "") {
                res += tmp + close + c;
                close = "";
            }
            // sin x -> sin(x
            else if (/\s/.test(c) && fun != "" && tmp == "") {
                continue;
            }
            // sin^
            else if (fun != "" && tmp == "" && (
                    (pow == "" && c == '^') || (pow == "^" && c == "-"))) {
                pow += c;
                if (pow == c) {
                    fun = "{" + fun, c = '}'+c;
                    close = c + close;
                }
                else {
                    var bi = close.indexOf('}')+pow.length;
                    close = close.slice(0, bi) + c + close.slice(bi);
                }
            }
            // ,
            else if (c == ',') {
                tmp += close + c;
                close = "";
                continue;
            }
            // exit function
            else {
                if (fun != "") {
                    res += fun + "(" + tmp + close;
                    close = "";
                }
                else res += tmp;
                if (c == '') {
                    res += close;
                    fun = close = "";
                }
                else res += c;
                tmp = fun = "";
            }
        }
    }
    res = res.replaceAll('{', '(').replaceAll('}', ')');
    var res0 = res;
    res = "";
    for (var i = 0; i < res0.length; i++) {
        if (res0[i] == '\b')
            res = res.slice(0, res.length-1);
        else res += res0[i];
    }
    // console.log(res);
    return res;
}


// Parse a human math expression to postfix notation
MathParser.exprToPostfix = function (expr, mathFunctions) {
    expr = MathParser.balanceParenthesis(expr);
    expr = MathParser.addFunctionParenthesis(expr);

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
        else if (/[A-Za-zΑ-Ωα-ω_\d\.\(\)\^]/.test(expr[i]) || eb.pc > 0) {
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

    console.log(expr);
    // multiplication sign
    var expr1 = "";
    for (var i = 0; i < expr.length;) {
        var v = "";
        while (i < expr.length && /[A-Za-zΑ-Ωα-ω_\d\.\(\)]/.test(expr[i])) {
            v += expr[i];
            i++;
        }
        var has_ = false;
        for (var j = 0; j < v.length;) {
            if (expr1.length > 0) {
                var expr1back = expr1[expr1.length-1];
                console.log(v, j, expr1, expr1back, has_);
                if ((/\)/.test(expr1back) && (
                        /[A-Za-zΑ-Ωα-ω_\d\(]/.test(v[j]) ||
                        (v[j]=="." && j+1<v.length && /\d/.test(v[j+1]))
                        )) ||
                    (j != 0 && /[A-Za-zΑ-Ωα-ω_\d\.\)]/.test(v[j-1])
                        && /\(/.test(v[j])))
                    expr1 += "*" , has_ = false;
                else if ((!has_ && (
                        /[A-Za-zΑ-Ωα-ω]/.test(expr1back) ||
                        /\d\.$/.test(expr1)) ||
                        /\d$/.test(expr1)
                    ) && (/[A-Za-zΑ-Ωα-ω]/.test(v[j]) ||
                        (/^\.\d/.test(v.slice(j)) && !/[\d\.]/.test(expr1back)))
                    && v[j] != "_")
                    expr1 += "*", has_ = false;
                else if (!has_ && /[A-Za-zΑ-Ωα-ω]/.test(expr1back)
                        && /\d/.test(v[j]))
                    expr1 += "_", has_ = true;
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
            if (/[A-Za-zΑ-Ωα-ω_\d\)][A-Za-zΑ-Ωα-ω_\d\(]/.test(expr1[expr1.length - 1] + expr[i + 1]))
                expr1 += "*";
            i++;
        }
        else if (i < expr.length) {
            expr1 += expr[i];
            i++;
        }
    }
    expr = expr1;
    console.log(expr);
    
    // unwanted plus sign
    expr = expr.replace(/\(\+/g, "(");
    expr = expr.replace(/^\+/g, "");

    // operators
    expr = expr.replace(/\*\*/g, "^");
    const operators = {
        '+': 1, '-': 1,
        '*': 2, '/': 2,
        '^': 3,
        '.': 4,
    };
    const isLeftAssociative = {
        '+': true, '-': true, '*': true, '/': true,
        '^': false,
        '.': true,
    };

    // console.log("preprocessed", expr);

    // shunting-yard algorithm
    var queue = [], stack = [];  // Token objects
    for (var i = 0; i < expr.length;) {
        // get token
        var token = "";
        while (i < expr.length && (/[A-Za-zΑ-Ωα-ω0-9_]/.test(expr[i])
                || (expr[i] == '.' && ((
                /\d/.test(token[token.length-1]) &&
                    !/_/.test(expr)
                ) || (i+1 < expr.length && /\d/.test(expr[i+1])))
            ))) {
            token += expr[i];
            i++;
        }
        if (token == "") {
            token = expr[i];
            i++;
        }
        // number
        if ((/^[0-9]*\.{0,1}[0-9]*$/.test(token) ||
                /^[0-9]*\.{0,1}[0-9]+$/.test(token)) &&
                token != ".") {
            if (!isFinite(Number(token))) throw "Failed to parse number " + token;
            var num = token.trim('0');
            if (num == "") num = "0";
            if (num[0] == '.') num = "0" + num;
            if (!/\./.test(num)) num += ".";
            if (/\.$/.test(num)) num += "0";
            queue.push(new Token("number", num));
        }
        // function
        else if (mathFunctions[token] != undefined) {
            var fun = new Token("function", token);
            stack.push(fun);
        }
        // imaginary unit
        else if (MathParser.isImaginaryUnit(token)) {
            var imag = new Token("unit", 'i');
            // 0 + 1 i
            queue.push(imag);
            queue.push(new Token("number", '1.0'));
            queue.push(new Token("number", '0.0'));
        }
        // vector subscript
        else if (/^[xyzw]$/.test(token) && stack.length > 0 &&
                stack[stack.length-1].str == ".") {
            var fun = new Token("function", 'VecComp'+token.toUpperCase(), 1);
            stack.pop();
            queue.push(fun);
        }
        // variable name
        else if (/^[A-Za-zΑ-Ωα-ω](_[A-Za-zΑ-Ωα-ω0-9]+)?$/.test(token)) {
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
        else if (operators.hasOwnProperty(token)) {
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
        // console.log("stack", stack.slice());
        // console.log('queue', queue.slice());
    }
    while (stack.length != 0) {
        queue.push(stack[stack.length - 1]);
        stack.pop();
    }
    return queue;
}


// Get a list of variables from a postfix notation
MathParser.getVariables = function (postfix, excludeIndependent) {
    var vars = new Set();
    for (var i = 0; i < postfix.length; i++) {
        if (postfix[i].type == 'variable') {
            if (excludeIndependent &&
                MathParser.isIndependentVariable(postfix[i].str))
                continue;
            vars.add(postfix[i].str);
        }
    }
    return vars;
}


// Parse one line, determines type
MathParser.testLine = function (line) {
    var res = {
        type: "",
        main: { left: "", right: "" },
        variable: { name: "", string: "" },
        function: { name: "", args: [], string: "" },
    };
    line = line.trim();
    if (/\#/.test(line)) line = line.substring(0, line.search('#')).trim();
    if (line == '') return res;
    if (/\=/.test(line)) {
        var lr = line.split('=');
        if (lr.length > 2)
            throw new Error("Multiple equal signs found.");
        var left = lr[0].trim();
        var right = lr[1].trim();
        // variable
        if (MathParser.reVarname.test(left)) {
            if (left.length >= 2 && left[1] != "_") left = left[0] + "_" + left.substring(1, left.length);
            // main equation
            if (MathParser.isIndependentVariable(left)) {
                res.type = "main";
                res.main = {
                    left: left,
                    right: right
                };
            }
            // assign main variable
            else if (MathParser.isDependentVariable(left)) {
                res.type = "mainVariable";
                res.variable = {
                    name: left,
                    string: right
                };
            }
            // definition
            else {
                if (left == "π")
                    throw new Error("You can't use constant 'π' as a variable name.");
                if (left == "e")
                    throw new Error("You can't use constant 'e' as a variable name.");
                if (MathParser.isImaginaryUnit(left))
                    throw new Error("You can't use imaginary unit '" + left + "' as a variable name.");
                res.type = "variable";
                res.variable = { name: left, string: right };
            }
            return res;
        }
        // function
        var functionMatch = MathParser.matchFunction(left);
        if (functionMatch) {
            // main equation
            if (MathFunctions[functionMatch[0]] != undefined) {
                res.type = "main";
                res.main = {
                    left: left,
                    right: MathParser.balanceParenthesis(right)
                };
            }
            // function definition
            else {
                res.type = "function";
                res.function.name = functionMatch[0];
                res.function.args = functionMatch.slice(1);
                res.function.string = right;
            }
            return res;
        }
        // main equation
        res.type = "main";
        if (Number(right) == '0') res.main = {
            left: MathParser.balanceParenthesis(left),
            right: '0'
        };
        else res.main = {
            left: MathParser.balanceParenthesis(left),
            right: MathParser.balanceParenthesis(right)
        };
    }
    // main equation
    else {
        res.type = "main";
        res.main = { left: line, right: '0' };
    }
    return res;
}


MathParser.replaceDesmosCopyPaste = function(input) {
    input = input.replaceAll("\\left(", "(").replaceAll("\\right)", ")");
    input = input.replaceAll("\\left|", "abs(").replaceAll("\\right|", ")");
    input = input.replaceAll(/\\[ \!\,\:\;]/g, " ");
    input = input.replaceAll("\\cdot", "*");
    input = input.replaceAll(/\\(arccos|arcsin|arctan|cos|cosh|cot|coth|csc|exp|ln|log|sec|sin|sinh|tan|tanh|min|max)/g, "$1");
    input = input.replaceAll(/\\operatorname\{(\w+)\}/g, "$1");
    input = input.replaceAll(/\\([Α-Ωα-ω])/g, "$1");
    input = input.replaceAll(/_\{([A-Za-z0-9]+)\}\(/g, "_$1\(");
    input = input.replaceAll(/_\{([A-Za-z0-9]+)\}/g, "_$1 ");

    // \frac
    var sf = input.replaceAll("\\dfrac", "\\frac").split("\\frac");
    input = "";
    var frac = 0, depth = 1, depths = [];
    for (var si = 0; si < sf.length; si++) {
        var s = sf[si];
        if (si != 0) input += "(";
        for (var i = 0; i < s.length; i++) {
            input += s[i];
            if (s[i] == '{' && (i == 0 || s[i-1] != '\\'))
                depth++;
            else if (s[i] == '}' && (i == 0 || s[i-1] != '\\')) {
                depth--;
                if (frac > 0 && depth < Math.abs(depths[frac-1]))
                    throw new Error("LaTeX fraction not match.");
                if (frac > 0 && depth == depths[frac-1])
                    input += "/", depths[frac-1] *= -1;
                else if (frac > 0 && depth == -depths[frac-1])
                    input += ")", frac--, depths.pop();
            }
        }
        if (si + 1 != sf.length) {
            frac++;
            depths.push(depth);
        }
    }

    // \sqrt
    var sf = input.split("\\sqrt[");
    input = "";
    var sqrt = 0, depth = 0, depths = [];
    for (var si = 0; si < sf.length; si++) {
        var s = sf[si];
        for (var i = 0; i < s.length; i++) {
            if (s[i] == '[' && (i == 0 || s[i-1] != '\\'))
                input += "(", depth++;
            else if (s[i] == ']' && (i == 0 || s[i-1] != '\\')) {
                depth--;
                if (sqrt > 0 && depth < depths[sqrt-1])
                    throw new Error("LaTeX sqrt not match.");
                if (sqrt > 0 && depth == depths[sqrt-1]) {
                    input += ",", sqrt--, i++, depths.pop();
                }
                else input += "]";
            }
            else input += s[i];
        }
        if (si + 1 != sf.length) {
            sqrt++;
            depths.push(depth);
            depth++;
            input += "root{";
        }
    }
    input = input.replaceAll(/\\sqrt/g, "sqrt");

    // {} -> ()
    for (var i = 0; i < 2; i++)
        input = input.replaceAll(/([^\\])\{/g, "$1(").replaceAll(/([^\\])\}/g, "$1)");

    // sin^-1, not limited to desmos
    input = input.replaceAll(/((sin|cos|tan|csc|sec|cot)h?)\s*\^\s*[\(\[]?\s*-\s*1\s*\s*[\)\]]?/g, "arc$1");
    // sin^(2) -> sin^2
    input = input.replaceAll(/\^\s*[\(\[]\s*(\-?\s*[\d.]+)\s*[\)\]]/g, "^$1");

    return input;
}


// Parse input (all lines)
// Generate postfix expression and LaTeX
MathParser.parseInput = function (input) {
    // accept different comments
    input = input.replaceAll('%', '#').replaceAll('//', '#').replaceAll('`', '#');

    // copy paste x²+y²+z²–1
    input = input.replace(/[\uff01-\uff5e]/g,
        (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
    input = input.replace(/[˗‐‑‒–⁃−﹘]/g, '-');
    input = input.replace(/[⁎∗·•‧∙⋅⸱]/g, '*');
    input = input.replace(/[⁄∕⟋÷]/g, '/');
    input = input.replace(/[ˆ]/g, '^');
    input = input.replace(/[ℯ]/g, 'e');
    input = input.replace(/[^\^](⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, function (_, s) {
        const a = "⁻⁰¹²³⁴⁵⁶⁷⁸⁹", b = "-0123456789";
        var res = _[0] + '^';
        for (var i = 0; i < s.length; i++)
            res += b[a.indexOf(s[i])];
        return res;
    });

    // split to arrays
    input = input.replace(/\r?\n/g, ';');
    input = input.replace(/\s+/, ' ');
    input = input.trim().trim(';').trim().split(';');

    // replace Greek letters
    for (var i = 0; i < input.length; i++) {
        var hi = input[i].indexOf('#');
        if (hi == -1) hi = input[i].length;
        var before = input[i].substring(0, hi);
        var after = input[i].substring(hi, input[i].length);
        for (var gi = 0; gi < MathParser.greekLetters.length; gi++) {
            var gl = MathParser.greekLetters[gi];
            before = before.replaceAll(gl[0], gl[1]);
        }
        before = before.replace(/\=+/, "=");
        input[i] = before + after;
        // Desmos copy paste
        input[i] = MathParser.replaceDesmosCopyPaste(input[i]);
    }

    // read each line of input
    var functions_str = {};
    var variables_str = {};
    var mainEqusLr = [];  // main equation left/right
    var mainVariables = {};
    for (var i = 0; i < input.length; i++) {
        var res = MathParser.testLine(input[i]);
        if (res.type == "main") {
            mainEqusLr.push(res.main);
            continue;
        }
        if (res.type == "mainVariable") {
            var variable = res.variable;
            if (mainVariables[variable.name] != undefined)
                throw "Multiple definitions of variable `" + variable.name + "`";
            mainVariables[variable.name] = variable.string;
        }
        if (/variable/.test(res.type.toLowerCase())) {
            var variable = res.variable;
            if (variables_str[variable.name] != undefined)
                throw "Multiple definitions of variable `" + variable.name + "`";
            variables_str[variable.name] = variable.string;
            continue;
        }
        if (res.type == "function") {
            var fun = res.function;
            if (functions_str[fun.name] != undefined)
                throw "Multiple definitions of function " + fun[0];
            functions_str[fun.name] = fun;
            continue;
        }
    }

    // parse expressions
    var functions = {};
    for (var funname in MathFunctions)
        functions[funname] = MathFunctions[funname];
    for (var funname in functions_str) {
        let fun = functions_str[funname];
        functions[funname] = {
            'args': fun.args,
            'numArgs': fun.args.length,
            'definition': fun.string,
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
        fun.postfix = MathParser.exprToPostfix(fun.definition, functions);
    }
    var variables = {};
    for (var varname in variables_str) {
        var postfix = MathParser.exprToPostfix(variables_str[varname], functions);
        variables[varname] = {
            'postfix': postfix,
            'isFunParam': false,
            'resolving': false
        };
    }
    var mainEqus = [];
    for (var i = 0; i < mainEqusLr.length; i++) {
        mainEqusLr[i].left = MathParser.exprToPostfix(mainEqusLr[i].left, functions);
        mainEqusLr[i].right = MathParser.exprToPostfix(mainEqusLr[i].right, functions);
        if (mainEqusLr[i].right.length == 1 && Number(mainEqusLr[i].right[0].str) == 0) {
            mainEqus.push(mainEqusLr[i].left);
        }
        else {
            var left = mainEqusLr[i].left;
            var right = mainEqusLr[i].right;
            mainEqus.push(left.concat(right).concat([new Token('operator', '-')]));
        }
    }

    function popStackValue(stack) {
        var i = stack.length - 1;
        if (stack[i].length > 1 ||
            stack[i][0].type == "number" || stack[i][0].type == "variable") {
            var res = stack[i];
            stack.pop();
            return res;
        }
        throw new Error("Top of stack is not value");
    }

    // resolve dependencies
    function dfs(equ, variables) {
        var stack = [];
        for (var i = 0; i < equ.length; i++) {
            if (equ[i].type == 'number') {
                stack.push([equ[i]]);
            }
            else if (equ[i].type == 'unit') {
                if (equ[i+1].type != 'number' || equ[i+2].type != 'number')
                    throw new Error("Unit without number");
                // complex
                stack.push([equ[i+2], equ[i+1], equ[i]]);
                i += 2;
            }
            else if (equ[i].type == 'variable') {
                var variable = variables[equ[i].str];
                if (variable == undefined) {
                    stack.push([equ[i]]);
                }
                else if (variable.isFunParam) {
                    // console.warn("Function definition possibly not properly resolved.");
                    stack.push(variable.postfix);  // ???
                }
                else {
                    if (variable.resolving) throw "Recursive variable definition is not supported.";
                    variable.resolving = true;
                    var res = dfs(variable.postfix, variables);
                    stack.push(res);
                    variable.resolving = false;
                }
            }
            else if (equ[i].type == 'function') {
                // user-defined function
                if (!MathFunctions.hasOwnProperty(equ[i].str)) {
                    let fun = functions[equ[i].str];
                    var variables1 = {};
                    for (var varname in variables)
                        variables1[varname] = variables[varname];
                    if (stack.length < fun.numArgs)
                        throw "No enough arguments for function " + equ[i].str;
                    for (var j = 0; j < fun.numArgs; j++) {
                        variables1[fun.args[fun.numArgs-1-j]] = {
                            'postfix': popStackValue(stack),
                            'isFunParam': true,
                            'resolving': false
                        };
                    }
                    if (fun.resolving) throw "Recursive function definition is not supported.";
                    fun.resolving = true;
                    var res = dfs(fun.postfix, variables1);
                    fun.resolving = false;
                    stack.push(res);
                }
                // built-in function
                else {
                    var params = [];
                    for (var j = equ[i].numArgs; j > 0; j--)
                        params = popStackValue(stack).concat(params);
                    params.push(equ[i]);
                    stack.push(params);
                }
            }
            else if (equ[i].type == 'operator') {
                if (stack.length < 2) throw "No enough tokens in the stack"
                var expr1 = popStackValue(stack);
                var expr2 = popStackValue(stack);
                var expr = expr2.concat(expr1);
                expr.push(equ[i]);
                stack.push(expr);
            }
            else {
                throw "Unrecognized token " + equ[i];
            }
            var totlength = 0;
            for (var j = 0; j < stack.length; j++) totlength += stack[j].length;
            if (totlength >= 1048576) {
                throw "Definitions are nested too deeply (" + totlength + ")";
            }
            // console.log(i+1, stack.slice());
        }
        if (stack.length != 1) throw "Result stack size is not 1";
        return stack[0];
    }
    for (var i = 0; i < mainEqus.length; i++)
        mainEqus[i] = dfs(mainEqus[i], variables);
    var result = {
        val: mainEqus,
    };
    let dvars = MathParser.DependentVariables;
    var groupFound = [], groupPriority = 0;
    var hasGroup = [];
    for (var varname in dvars) {
        if (/^\d/.test(varname)) {
            hasGroup.push(varname);
            var result1 = {};
            var good = true;
            var numVars = 0;
            for (var varname1 in dvars[varname]) {
                if (mainVariables.hasOwnProperty(varname1))
                    result1[varname1] = null;
                else if (varname1 == "val" &&
                    (mainEqus.length == 1 || UpdateFunctionInputConfig.implicitMode))
                    result1[varname1] = mainEqus[0];
                else if (dvars[varname][varname1]) {
                    good = false;
                    break;
                }
                numVars += 1;
            }
            if (good) {
                for (var varname1 in result1) {
                    if (result1[varname1] !== null)
                        continue;
                    result[varname1] = dfs(variables[varname1].postfix, variables);
                }
                if (numVars > groupPriority)
                    groupFound = [];
                if (numVars >= groupPriority) {
                    groupFound.push(varname);
                    groupPriority = varname;
                }
            }
        }
        else {
            if (mainVariables.hasOwnProperty(varname))
                result[varname] = dfs(variables[varname].postfix, variables);
            else if (varname != "val" && (
                dvars[varname] === true || dvars[varname].required === true))
                throw "Definition for `" + varname + "` not found.";
        }
    }
    if (hasGroup.length > 0 && groupFound.length != 1) {
        var groups = [];
        if (groupFound.length > 0)
            hasGroup = groupFound;
        var hasMain = false;
        for (var group in hasGroup) {
            var varnames = [];
            for (var varname in dvars[group])
                varnames.push(varname);
            if (varnames.length == 1 && varnames[0] == "val")
                hasMain = true;
            else
                groups.push('[' + varnames.join(', ') + ']');
        }
        groups = groups.join(', ');
        if (hasMain) {
            var type = dvars.hasOwnProperty('val') &&
                dvars.val.hasOwnProperty('type') ?
                dvars.val.type : 'scalar';
            groups += ", " + (groupFound.length>0?'and':'or') + " one " + type;
        }
        if (groupFound.length > 0)
            throw "Conflicting dependent variable combinations: " + groups;
        throw "Possible dependent variable combinations are: " + groups;
    }

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
            left = CodeGenerator.postfixToLatex(MathParser.exprToPostfix(left, functions));
            right = CodeGenerator.postfixToLatex(MathParser.exprToPostfix(right, functions));
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
    result.latex = latexList;
    // console.log(result);
    return result;
}

