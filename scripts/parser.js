// Parse function strings into postfix

"use strict";


let MathParser = {
    // independent variables, can be reassigned
    IndependentVariables: {
        'x': "x",
        'y': "y",
        'z': "z"
    },
    isIndependentVariable: function (name) {
        return MathParser.IndependentVariables.hasOwnProperty(name);
    },
    // regex to match a variable/function name
    reVarname: /^[A-Za-zΑ-Ωα-ω]((_[A-Za-zΑ-Ωα-ω\d]+)|(_?\d[A-Za-zΑ-Ωα-ω\d]*))?$/,
    matchFunction: function (funstr) {
        var match = /^([A-Za-zΑ-Ωα-ω0-9_]+)\s*\(([A-Za-zΑ-Ωα-ω0-9_\s\,]+)\)$/.exec(funstr);
        if (match == null) return false;
        if (!MathParser.reVarname.test(match[1])) return false;
        if (match[1] == "e" || match[1] == "π") return false;
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


// Parse a human math expression to postfix notation
MathParser.exprToPostfix = function (expr, mathFunctions) {
    expr = MathParser.balanceParenthesis(expr);

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
                if ((/\)/.test(expr1[expr1.length - 1]) && /[A-Za-zΑ-Ωα-ω_\d\.\(]/.test(v[j]))
                    || (j != 0 && /[A-Za-zΑ-Ωα-ω_\d\.\)]/.test(v[j - 1]) && /\(/.test(v[j]))) expr1 += "*";
                else if (!has_ && /[A-Za-zΑ-Ωα-ω\d\.]/.test(expr1[expr1.length - 1]) && /[A-Za-zΑ-Ωα-ω]/.test(v[j]) && v[j] != "_")
                    expr1 += "*";
                else if (!has_ && /[A-Za-zΑ-Ωα-ω]/.test(expr1[expr1.length - 1]) && /\d/.test(v[j]))
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
            if (/[A-Za-zΑ-Ωα-ω_\d]{2}/.test(expr1[expr1.length - 1] + expr[i + 1]))
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
        while (i < expr.length && /[A-Za-zΑ-Ωα-ω0-9_\.]/.test(expr[i])) {
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

    // replace operators with functions
    if (false) for (var i = 0; i < queue.length; i++) {
        if (queue[i].type == 'operator') {
            queue[i].type = 'function';
            queue[i].numArgs = 2;
            queue[i].str = {
                '+': 'Add', '-': 'Sub',
                '*': 'Mul', '/': 'Div',
                '^': 'pow'
            }[queue[i].str];
        }
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
MathParser.parseLine = function (line) {
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
                    left: MathParser.balanceParenthesis(left),
                    right: MathParser.balanceParenthesis(right)
                };
            }
            // definition
            else {
                if (left == "π")
                    throw new Error("You can't use constant 'π' as a variable name.");
                if (left == "e")
                    throw new Error("You can't use constant 'e' as a variable name.");
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


// Parse input (all lines)
// Generate postfix expression and LaTeX
MathParser.parseInput = function (input) {
    // accept different comments
    input = input.replaceAll('%', '#').replaceAll('//', '#');
    // split to arrays
    input = input.replace(/\r?\n/g, ';');
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
    }

    // read each line of input
    var functions_str = {};
    var variables_str = {};
    var mainEqusLr = [];  // main equation left/right
    for (var i = 0; i < input.length; i++) {
        var res = MathParser.parseLine(input[i]);
        if (res.type == "main") {
            mainEqusLr.push(res.main);
        }
        else if (res.type == "function") {
            var fun = res.function;
            if (functions_str[fun.name] != undefined)
                throw "Multiple definitions of function " + fun[0];
            functions_str[fun.name] = fun;
        }
        else if (res.type == "variable") {
            var variable = res.variable;
            if (variables_str[variable.name] != undefined)
                throw "Multiple definitions of variable " + left;
            variables_str[variable.name] = variable.string;
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
                    // console.warn("Function definition possibly not properly resolved.");
                    stack.push(variable.postfix);  // ???
                }
                else {
                    if (variable.resolving) throw "Recursive variable definition is not supported.";
                    variable.resolving = true;
                    var res = dfs(variable.postfix, variables)[0];
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
                        variables1[fun.args[j]] = {
                            'postfix': stack[stack.length - fun.numArgs + j],
                            'isFunParam': true,
                            'resolving': false
                        };
                    }
                    for (var j = 0; j < fun.numArgs; j++)
                        stack.pop();
                    if (fun.resolving) throw "Recursive function definition is not supported.";
                    fun.resolving = true;
                    var res = dfs(fun.postfix, variables1)[0];
                    fun.resolving = false;
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
        if (stack.length != 1) throw "Result stack size is not 1";
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
            left = postfixToLatex(MathParser.exprToPostfix(left, functions));
            right = postfixToLatex(MathParser.exprToPostfix(right, functions));
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


// Convert a post-polish math expression to GLSL code
function postfixToGlsl(queue, lang) {
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
                code: evalobj.code,
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
            var obj = new EvalObject([token],
                s,
                true, new Interval(Number(s), Number(s)), true);
            obj.code = MathFunctions['CONST']['1'].subSource([obj], lang).code;
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
                s = Math.E + "";
                isNumeric = true;
                interval.x0 = interval.x1 = Math.E;
            }
            else if (token.str == "π") {
                s = Math.PI + "";
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
            v.code = "v" + id;
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
            var v = fun.subSource(args, lang);
            var id = addSubtree(v);
            v.postfix = [new Token('variable', id)];
            v.code = "v" + id;
            stack.push(v);
        }
        else {
            throw "Unrecognized token " + equ[i];
        }
    }
    if (stack.length != 1) throw "Result stack length is not 1";
    // get result
    var result = {
        code: [],
        codegrad: [],
        isCompatible: stack[0].isCompatible
    };
    var toGrad = function (code) {
        return code.replace(/([^A-Za-z]?)mf_/g, "$1mfg_");
    };
    for (var i = 0; i < intermediates.length; i++) {
        let intermediate = intermediates[i];
        var v = "float v" + intermediate.id + " = " + intermediate.code + ";";
        var g = "vec4 v" + intermediate.id + " = " + toGrad(intermediate.code) + ";";
        result.code.push(v);
        result.codegrad.push(g);
    }
    result.code.push("return " + stack[0].code + ";");
    result.code = result.code.join('\n');
    result.codegrad.push("return " + toGrad(stack[0].code) + ";");
    result.codegrad = result.codegrad.join('\n');
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
        for (var i = 0; i < MathParser.greekLetters.length; i++) {
            var gl = MathParser.greekLetters[i];
            varname = varname.replaceAll(gl[1], "\\" + gl[0] + " ");
        }
        varname = varname.replace(" }", "}").replace(" _", "_");
        return varname.trim();
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
            throw "Unrecognized token " + equ[i];
        }
    }
    if (stack.length != 1) throw "Result stack length is not 1";
    return stack[0].latex;
}


// Debug in node.js
if (typeof window === "undefined") {
    BuiltInMathFunctions.initMathFunctions(
        BuiltInMathFunctions.rawMathFunctionsShared);
    var input = "iTime(0)";
    var result = parseInput(input);
    // var result = MathParser.exprToPostfix(input, MathFunctions);
    console.log(result.postfix);
}
