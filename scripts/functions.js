"use strict";


const PI = Math.PI;


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
    postfix, code,
    isNumeric, range = Interval(), isCompatible = true
) {
    this.postfix = postfix;
    this.code = code;
    this.isNumeric = isNumeric;  // zero gradient
    this.range = range;  // non-negative
    this.isCompatible = isCompatible;  // has no NAN
}

function EvalLatexObject(postfix, latex, precedence) {
    this.postfix = postfix;
    this.latex = latex;
    this.precedence = precedence;
}



// Built-in functions

function MathFunction(
    // all functions
    names, numArgs, langs,
    // univariate functions only
    // @monotonicFun: a callable function, not null when the function is not both increasing and decreasing
    domain = new Interval(), range = new Interval(), monotonicFun = null
    // multivariable functions
    // assert(this function has zero NAN area when all args have no NAN)
    // otherwise (pow, log) rewrite the subSource function
) {
    this.names = names;
    this.numArgs = numArgs;
    this.langs = langs;
    this.domain = domain;
    this.range = range;
    this.monotonicFun = monotonicFun;
    this.assertArgs = function (args) {
        if (args.length != this.numArgs)
            throw new Error("Incorrect number of arguments for function " + this.names[0]);
    };

    // Generate GLSL code, with NaN check
    this.subSource = function (args, lang) {
        this.assertArgs(args);
        var code = this.langs[lang];
        if (code == undefined)
            throw new Error("Unsupported function `" + this.names[0] + "`");
        var postfix = [];
        var isNumeric = true;
        var isCompatible = true;
        for (var i = 0; i < args.length; i++) {
            var rep = "%" + (i + 1);
            postfix = postfix.concat(args[i].postfix);
            code = code.replaceAll(rep, args[i].code);
            isNumeric = isNumeric && args[i].isNumeric;
            isCompatible = isCompatible && args[i].isCompatible;
        }
        var result = new EvalObject(
            postfix.concat([new Token('function', names[0])]),
            code, isNumeric, new Interval(this.range.x0, this.range.x1), isCompatible);
        if (args.length == 1) {
            const eps = 1e-8;
            if (args[0].range.x0 < this.domain.x0 - eps || args[0].range.x1 > this.domain.x1 + eps)
                result.isCompatible = false;
            if (this.monotonicFun != null &&
                args[0].range.x0 >= this.domain.x0 && args[0].range.x1 <= this.domain.x1)
                result.range = new Interval(
                    this.monotonicFun(args[0].range.x0), this.monotonicFun(args[0].range.x1));
            else result.range = new Interval(this.range.x0, this.range.x1);
        }
        return result;
    };

    // Generate LaTeX
    this.subLatex = function (args) {
        var latex = this.langs.latex;
        if (latex == undefined)
            throw new Error("Use of reserved keyword `" + this.names[0] + "`");
        if (/%0/.test(latex)) {
            var latexes = [];
            for (var i = 0; i < args.length; i++)
                latexes.push(args[i].latex);
            return latex.replaceAll("%0", latexes.join(','));
        }
        this.assertArgs(args);
        for (var i = 0; i < args.length; i++) {
            var repv = "%" + (i + 1);
            latex = latex.replaceAll(repv, args[i].latex);
        }
        return latex;
    }
}


// Built-in functions for both real and complex variables

var BuiltInMathFunctions = {};

BuiltInMathFunctions.rawMathFunctionsShared = [
    new MathFunction(['CONST'], 1, {
        latex: '%1',
        glsl: '%1',
        glslc: 'vec2(%1,0)',
    }),
    new MathFunction(['iTime'], 1, {
        latex: '\\mathrm{iTime}',
        glsl: '(iTime)',
        glslc: 'vec2((iTime),0)',
    }),
    new MathFunction(['ADD'], 2, {
        latex: '%1+%2',
        glsl: '%1+%2',
        glslc: '%1+%2',
    }),
    new MathFunction(['SUB'], 2, {
        latex: '%1-%2',
        glsl: '%1-%2',
        glslc: '%1-%2',
    }),
    new MathFunction(['MUL'], 2, {
        latex: '%1\\cdot %2',
        glsl: '%1*%2',
        glslc: 'vec2(%1.x*%2.x-%1.y*%2.y,%1.x*%2.y+%1.y*%2.x)',
    }),
    new MathFunction(['DIV'], 2, {
        latex: '\\frac{%1}{%2}',
        glsl: '%1/%2',
        glslc: 'vec2(%1.x*%2.x+%1.y*%2.y, %1.y*%2.x-%1.x*%2.y)/dot(%2,%2)',
    }),
    new MathFunction(['sqrt'], 1, {
        latex: '\\sqrt{%1}',
        glsl: 'sqrt(%1)',
        glslc: 'mc_sqrt(%1)',
    }, new Interval(0, Infinity), new Interval(0, Infinity), Math.sqrt),
    new MathFunction(['cbrt'], 1, {
        latex: '\\sqrt[3]{%1}',
        glsl: 'sign(%1)*pow(abs(%1),1./3.)',
        glslc: 'mc_cbrt(%1)',
    }, Math.cbrt),
    new MathFunction(['nthroot', 'root'], 2, {
        latex: '\\sqrt[{%1}]{%2}',
        glsl: 'pow(%2,1.0/%1)',
        glslc: 'mc_root(%1,%2)',
    }),
    new MathFunction(['pow'], 2, {
        latex: '\\left(%1\\right)^{%2}',
        glsl: 'pow(%1,%2)',
        glslc: 'mc_pow(%1, %2)',
    }),
    new MathFunction(['exp'], 1, {
        latex: '\\exp\\left(%1\\right)',
        glsl: 'exp(%1)',
        glslc: 'mc_exp(%1)',
    }, new Interval(), new Interval(0, Infinity), Math.exp),
    new MathFunction(['log', 'ln'], 1, {
        latex: '\\ln\\left(%1\\right)',
        glsl: 'log(%1)',
        glslc: 'mc_ln(%1)',
    }, new Interval(0, Infinity), new Interval(), Math.log),
    new MathFunction(['sin'], 1, {
        latex: '\\sin\\left(%1\\right)',
        glsl: 'sin(%1)',
        glslc: 'mc_sin(%1)',
    }, new Interval(), new Interval(-1, 1)),
    new MathFunction(['cos'], 1, {
        latex: '\\cos\\left(%1\\right)',
        glsl: 'cos(%1)',
        glslc: 'mc_cos(%1)',
    }, new Interval(), new Interval(-1, 1)),
    new MathFunction(['tan'], 1, {
        latex: '\\tan\\left(%1\\right)',
        glsl: 'tan(%1)',
        glslc: 'mc_tan(%1)',
    }),
    new MathFunction(['csc'], 1, {
        latex: '\\csc\\left(%1\\right)',
        glsl: '1.0/sin(%1)',
        glslc: 'mc_csc(%1)',
    }),
    new MathFunction(['sec'], 1, {
        latex: '\\sec\\left(%1\\right)',
        glsl: '1.0/cos(%1)',
        glslc: 'mc_sec(%1)',
    }),
    new MathFunction(['cot'], 1, {
        latex: '\\cot\\left(%1\\right)',
        glsl: 'cos(%1)/sin(%1)',
        glslc: 'mc_cot(%1)',
    }),
    new MathFunction(['sinh'], 1, {
        latex: '\\sinh\\left(%1\\right)',
        glsl: 'sinh(%1)',
        glslc: 'mc_sinh(%1)',
    }, new Interval(), new Interval(), Math.sinh),
    new MathFunction(['cosh'], 1, {
        latex: '\\cosh\\left(%1\\right)',
        glsl: 'cosh(%1)',
        glslc: 'mc_cosh(%1)',
    }, new Interval(), new Interval(1, Infinity)),
    new MathFunction(['tanh'], 1, {
        latex: '\\tanh\\left(%1\\right)',
        glsl: 'tanh(%1)',
        glslc: 'mc_tanh(%1)',
    }, new Interval(), new Interval(-1, 1), Math.tanh),
    new MathFunction(['csch'], 1, {
        latex: '\\mathrm{csch}\\left(%1\\right)',
        glsl: '1.0/sinh(%1)',
        glslc: 'mc_csch(%1)',
    }),
    new MathFunction(['sech'], 1, {
        latex: '\\mathrm{sech}\\left(%1\\right)',
        glsl: '1.0/cosh(%1)',
        glslc: 'mc_sech(%1)',
    }, new Interval(), new Interval(0, 1)),
    new MathFunction(['coth'], 1, {
        latex: '\\mathrm{coth}\\left(%1\\right)',
        glsl: '1.0/tanh(%1)',
        glslc: 'mc_coth(%1)',
    }),
    new MathFunction(['arcsin', 'arsin', 'asin'], 1, {
        latex: '\\arcsin\\left(%1\\right)',
        glsl: 'asin(%1)',
        glslc: 'mc_arcsin(%1)',
    }, new Interval(-1, 1), new Interval(-0.5 * PI, 0.5 * PI), Math.asin),
    new MathFunction(['arccos', 'arcos', 'acos'], 1, {
        latex: '\\arccos\\left(%1\\right)',
        glsl: 'acos(%1)',
        glslc: 'mc_arccos(%1)',
    }, new Interval(-1, 1), new Interval(0.0, PI), Math.acos),
    new MathFunction(['arctan', 'artan', 'atan'], 1, {
        latex: '\\arctan\\left(%1\\right)',
        glsl: 'atan(%1)',
        glslc: 'mc_arctan(%1)',
    }, new Interval(), new Interval(-0.5 * PI, 0.5 * PI), Math.atan),
    new MathFunction(['arccot', 'arcot', 'acot'], 1, {
        latex: '\\mathrm{arccot}\\left(%1\\right)',
        glsl: '1.5707963267948966-atan(%1)',
        glslc: 'mc_arccot(%1)',
    }, new Interval(), new Interval(-0.5 * PI, 0.5 * PI), (x) => 0.5 * PI - Math.atan(x)),
    new MathFunction(['arcsec', 'arsec', 'asec'], 1, {
        latex: '\\mathrm{arcsec}\\left(%1\\right)',
        glsl: 'acos(1.0/%1)',
        glslc: 'mc_arcsec(%1)',
    }, new Interval(0, 0), new Interval(0, PI)),
    new MathFunction(['arccsc', 'arcsc', 'acsc'], 1, {
        latex: '\\mathrm{arccsc}\\left(%1\\right)',
        glsl: 'acsc(1.0/%1)',
        glslc: 'mc_arccsc(%1)',
    }, new Interval(0, 0), new Interval(-0.5 * PI, 0.5 * PI)),
    new MathFunction(['arcsinh', 'arsinh', 'asinh'], 1, {
        latex: '\\mathrm{arcsinh}\\left(%1\\right)',
        glsl: 'asinh(%1)',
        glslc: 'mc_arcsinh(%1)',
    }, new Interval(), new Interval(), Math.asinh),
    new MathFunction(['arccosh', 'arcosh', 'acosh'], 1, {
        latex: '\\mathrm{arccosh}\\left(%1\\right)',
        glsl: 'acosh(%1)',
        glslc: 'mc_arccosh(%1)',
    }, new Interval(1, Infinity), new Interval(0, Infinity), Math.acosh),
    new MathFunction(['arctanh', 'artanh', 'atanh'], 1, {
        latex: '\\mathrm{arctanh}\\left(%1\\right)',
        glsl: 'atanh(%1)',
        glslc: 'mc_arctanh(%1)',
    }, new Interval(-1, 1), new Interval(), Math.atanh),
    new MathFunction(['arccoth', 'arcoth', 'acoth'], 1, {
        latex: '\\mathrm{arccoth}\\left(%1\\right)',
        glsl: 'atanh(1.0/%1)',
        glslc: 'mc_arccoth(%1)',
    }),
    new MathFunction(['arcsech', 'arsech', 'asech'], 1, {
        latex: '\\mathrm{arcsech}\\left(%1\\right)',
        glsl: 'acosh(1.0/%1)',
        glslc: 'mc_arcsech(%1)',
    }, new Interval(0, 1), new Interval(0, Infinity), (x) => Math.acosh(1 / x)),
    new MathFunction(['arccsch', 'arcsch', 'acsch'], 1, {
        latex: '\\mathrm{arccsch}\\left(%1\\right)',
        glsl: 'asinh(1.0/%1)',
        glslc: 'mc_arccsch(%1)',
    }, new Interval(), new Interval()),
];

// Built-in real-only functions
BuiltInMathFunctions.rawMathFunctionsR = [
    new MathFunction(['abs'], 1, {
        latex: '\\left|%1\\right|',
        glsl: 'abs(%1)'
    }, new Interval(), new Interval(0, Infinity)),
    new MathFunction(['if'], 3, {
        latex: '\\operatorname{if}\\left\\{%1>0:%2,%3\\right\\}',
        glsl: '%1>0.?%2:%3'
    }),
    new MathFunction(['mod'], 2, {
        latex: '\\operatorname{mod}\\left(%1,%2\\right)',
        glsl: 'mod(%1,%2)'
    }),
    new MathFunction(['fract', 'frac'], 1, {
        latex: '\\operatorname{frac}\\left(%1\\right)',
        glsl: 'fract(%1)'
    }, new Interval(), new Interval(0, 1)),
    new MathFunction(['floor'], 1, {
        latex: '\\lfloor{%1}\\rfloor',
        glsl: 'floor(%1)'
    }, new Interval(), new Interval(), Math.floor),
    new MathFunction(['ceil'], 1, {
        latex: '\\lceil{%1}\\rceil',
        glsl: 'ceil(%1)'
    }, new Interval(), new Interval(), Math.ceil),
    new MathFunction(['round'], 1, {
        latex: '\\operatorname{round}\\left(%1\\right)',
        glsl: 'round(%1)'
    }, new Interval(), new Interval(), Math.round),
    new MathFunction(['sign', 'sgn'], 1, {
        latex: '\\operatorname{sign}\\left(%1\\right)',
        glsl: 'sign(%1)'
    }, new Interval(), new Interval(-1, 1), (x) => x > 0. ? 1. : x < 0. ? -1. : 0.),
    new MathFunction(['max'], 0, {
        latex: '\\max\\left(%0\\right)',
        glsl: 'max(%1,%2)'
    }),
    new MathFunction(['min'], 0, {
        latex: '\\min\\left(%0\\right)',
        glsl: 'min(%1,%2)'
    }),
    new MathFunction(['clamp'], 3, {
        latex: '\\operatorname{clamp}\\left(%1,%2,%3\\right)',
        glsl: 'clamp(%1,%2,%3)'
    }),
    new MathFunction(['lerp', 'mix'], 3, {
        latex: '\\operatorname{lerp}\\left(%1,%2,%3\\right)',
        glsl: 'mix(%1,%2,%3)'
    }),
    new MathFunction(['log10'], 1, {
        latex: '\\log_{10}\\left(%1\\right)',
        glsl: '0.43429448190325176*log(%1)',
    }, new Interval(0, Infinity), new Interval(), Math.log10),
    new MathFunction(['log2'], 1, {
        latex: '\\log_{2}\\left(%1\\right)',
        glsl: '1.4426950408889634*log(%1)',
    }, new Interval(0, Infinity), new Interval(), Math.log2),
    new MathFunction(['log'], 2, {
        latex: '\\log_{%1}\\left(%2\\right)',
        glsl: 'log(%2)/log(%1)'
    }),
    new MathFunction(['powint'], 2, {
        latex: '\\left(%1\\right)^{%2}',
        glsl: '(mod(abs(%2)+0.5,2.)<1.?1.:sign(%1))*pow(abs(%1),%2)'
    }),
    new MathFunction(['hypot'], 0, {
        latex: "\\sqrt{\\left(%1\\right)^2+\\left(%2\\right)^2}",
        glsl: "length(vec2(%1,%2))"
    }, new Interval(), new Interval(0, Infinity)),
    new MathFunction(['hypot1'], 1, {
        glsl: "%1"
    }, new Interval(), new Interval(0, Infinity)),
    new MathFunction(['hypot2'], 2, {
        glsl: "length(vec2(%1,%2))"
    }, new Interval(), new Interval(0, Infinity)),
    new MathFunction(['hypot3'], 3, {
        glsl: "length(vec3(%1,%2,%3))"
    }, new Interval(), new Interval(0, Infinity)),
    new MathFunction(['hypot4'], 4, {
        glsl: "length(vec4(%1,%2,%3,%4))"
    }, new Interval(), new Interval(0, Infinity)),
    new MathFunction(['atan2', 'arctan', 'artan', 'atan'], 2, {
        latex: '\\mathrm{atan2}\\left(%1,%2\\right)',
        glsl: 'atan(%1,%2)'
    }, new Interval(), new Interval(-PI, PI)),
    new MathFunction(['erf'], 1, {
        latex: '\\mathrm{erf}\\left(%1\\right)',
        glsl: 'mf_erf(%1)'
    }, new Interval(), new Interval(-1, 1)),
    new MathFunction(['inverf', 'erfinv'], 1, {
        latex: '\\mathrm{erf}^{-1}\\left(%1\\right)',
        glsl: 'mf_erfinv(%1)'
    }, new Interval(-1, 1), new Interval()),
];

// Built-in complex-only functions
BuiltInMathFunctions.rawMathFunctionsC = [
    new MathFunction(['real', 're'], 1, {
        latex: '\\Re\\left(%1\\right)',
        glslc: 'vec2(%1.x,0)',
    }),
    new MathFunction(['imaginary', 'imag', 'im'], 1, {
        latex: '\\Im\\left(%1\\right)',
        glslc: 'vec2(%1.y,0)',
    }),
    new MathFunction(['magnitude', 'mag', 'length', 'abs'], 1, {
        latex: '\\left|%1\\right|',
        glslc: 'vec2(length(%1),0)',
    }),
    new MathFunction(['argument', 'arg'], 1, {
        latex: '\\arg\\left(%1\\right)',
        glslc: 'vec2(atan(%1.y,%1.x),0)',
    }),
    new MathFunction(['conjugate', 'conj'], 1, {
        latex: '\\overline{%1}',
        glslc: 'vec2(%1.x,-%1.y)',
    }),
    new MathFunction(['inverse', 'inv'], 1, {
        latex: '\\left(%1\\right)^{-1}',
        glslc: 'vec2(%1.x,-%1.y)/dot(%1,%1)',
    }),
    new MathFunction(['gamma'], 1, {
        latex: '\\Gamma\\left(%1\\right)',
        glslc: 'mc_gamma(%1)',
    }),
    new MathFunction(['loggamma', 'lgamma', 'lngamma'], 1, {
        latex: '\\ln\\Gamma\\left(%1\\right)',
        glslc: 'mf_lngamma(%1)',
    }),
    new MathFunction(['zeta'], 1, {
        latex: '\\zeta\\left(%1\\right)',
        glslc: 'mf_zeta(%1)',
    }),
    new MathFunction(['logzeta', 'lnzeta', 'lzeta'], 1, {
        latex: '\\ln\\zeta\\left(%1\\right)',
        glslc: 'mf_lnzeta(%1)',
    }),
];

// Uninitialized list of math functions
let MathFunctions = {};



// Substutitions for specific multivariable functions

let FunctionSubs = {};

FunctionSubs.addEvalObjects = function (a, b, lang) {
    return new EvalObject(
        a.postfix.concat(b.postfix.concat([new Token('operator', '+')])),
        MathFunctions['ADD'][2].langs[lang]
            .replaceAll('%1', a.code).replaceAll('%2', b.code),
        a.isNumeric && b.isNumeric,
        new Interval(a.range.x0 + b.range.x0, a.range.x1 + b.range.x1),
        a.isCompatible && b.isCompatible
    );
}

FunctionSubs.subEvalObjects = function (a, b, lang) {
    var interval = new Interval(
        a.range.x0 - b.range.x1,
        a.range.x1 - b.range.x0);
    return new EvalObject(
        a.postfix.concat(b.postfix.concat([new Token('operator', '-')])),
        a.range.x0 == 0.0 && a.range.x1 == 0.0 ? '-' + b.code :
            MathFunctions['SUB'][2].langs[lang]
                .replaceAll('%1', a.code).replaceAll('%2', b.code),
        a.isNumeric && b.isNumeric,
        interval,
        a.isCompatible && b.isCompatible
    );
}

FunctionSubs.mulEvalObjects = function (a, b, lang) {
    var boundaries = [
        a.range.x0 * b.range.x0, a.range.x0 * b.range.x1,
        a.range.x1 * b.range.x0, a.range.x1 * b.range.x1
    ].filter(x => !isNaN(x));
    return new EvalObject(
        a.postfix.concat(b.postfix.concat([new Token('operator', '*')])),
        MathFunctions['MUL'][2].langs[lang]
            .replaceAll('%1', a.code).replaceAll('%2', b.code),
        a.isNumeric && b.isNumeric,
        new Interval(
            Math.min.apply(null, boundaries),
            Math.max.apply(null, boundaries)
        ),
        a.isCompatible && b.isCompatible
    );
}

FunctionSubs.divEvalObjects = function (a, b, lang) {
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
        MathFunctions['DIV'][2].langs[lang]
            .replaceAll('%1', a.code).replaceAll('%2', b.code),
        a.isNumeric && b.isNumeric,
        interval,
        a.isCompatible && b.isCompatible
    );
}

FunctionSubs.powEvalObjects = function (a, b, lang) {
    if (a.code == 'e' || a.code == '' + Math.E) {
        return new EvalObject(
            a.postfix.concat(b.postfix.concat([new Token('operator', '^')])),
            MathFunctions['exp']['1'].subSource([b], lang).code,
            b.isNumeric,
            new Interval(Math.exp(b.range.x0), Math.exp(b.range.x1)),
            b.isCompatible
        )
    }
    var n = b.range.x0 == b.range.x1 ? b.range.x0 : NaN;
    if (n >= -64 && n <= 65536 && n == Math.round(n)) {
        if (n == 0) return new EvalObject(
            [new Token("number", '1.')], "1.",
            true, new Interval(1, 1), a.isCompatible
        );
        if (n == 1) return a;
        var spow = function (a, b) {
            return b % 2 == 0 ? Math.pow(Math.abs(a), b) :
                (a < 0. ? -1. : 1.) * Math.pow(Math.abs(a), b);
        }
        var interval = new Interval(
            n % 2 == 0 && a.range.containsZero() ? 0.0 :
                Math.min(spow(a.range.x0, n), spow(a.range.x1, n)),
            Math.max(spow(a.range.x0, n), spow(a.range.x1, n)));
        var code = MathFunctions.hasOwnProperty('powint') ?
            (n >= 2 && n <= 12 ?
                Array(n).fill(a.code).join('*') :
                MathFunctions['powint']['2'].subSource([a, b], lang).code
            ) : MathFunctions['pow']['2'].langs[lang]
                .replaceAll('%1', a.code).replaceAll('%2', b.code);
        return new EvalObject(
            a.postfix.concat(b.postfix.concat([new Token('operator', '^')])),
            code,
            a.isNumeric, interval, a.isCompatible
        )
    }
    var interval = new Interval();
    if (a.range.isPositive()) interval = new Interval(
        Math.pow(a.range.x0, b.range.x0),
        Math.pow(a.range.x1, b.range.x1)
    );
    return new EvalObject(
        a.postfix.concat(b.postfix.concat([new Token('operator', '^')])),
        MathFunctions['pow'][2].langs[lang]
            .replaceAll('%1', a.code).replaceAll('%2', b.code),
        a.isNumeric && b.isNumeric,
        interval,
        a.isCompatible && a.range.isPositive() && b.isCompatible
    )
}

FunctionSubs.rootEvalObjects = function (args, lang) {
    this.assertArgs(args);
    return new EvalObject(
        args[0].postfix.concat(args[1].postfix)
            .concat([new Token('function', this.names[0])]),
        this.langs[lang].replaceAll("%1", args[0].code).replaceAll("%2", args[1].code),
        args[0].isNumeric && args[1].isNumeric,
        args[1].range.isPositive() ? new Interval(
            Math.pow(args[1].range.x0, 1.0 / args[0].range.x1),
            Math.pow(args[1].range.x1, 1.0 / args[0].range.x0)
        ) : new Interval(),
        args[0].isCompatible && args[1].isCompatible && args[1].range.isPositive()
    );
};

FunctionSubs.maxMinEvalObjects = function (args, lang) {
    if (args.length < 2)
        throw "To few argument for function " + this.names[0];
    while (args.length >= 2) {
        var args1 = [];
        for (var i = 0; i + 1 < args.length; i += 2) {
            var code = this.langs[lang]
                .replaceAll("%1", args[i].code)
                .replaceAll("%2", args[i + 1].code);
            args1.push(new EvalObject(
                args[i].postfix.concat(args[i + 1].postfix)
                    .concat([new Token('function', this.names[0])]),
                code, args[i].isNumeric && args[i + 1].isNumeric,
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

FunctionSubs.hypotLatex = function (args) {
    if (args.length < 2)
        throw "To few argument for function " + this.names[0];
    var argss = [];
    for (var i = 0; i < args.length; i++) {
        if (args[i].precedence == Infinity)
            argss.push(args[i].latex + "^{2}");
        else argss.push("\\left(" + args[i].latex + "\\right)^{2}");
    }
    return "\\sqrt{" + argss.join('+') + "}";
};

FunctionSubs.hypotEvalObjects = function (args, lang) {
    if (args.length < 2)
        throw "To few argument for function " + this.names[0];
    while (args.length > 1) {
        var args1 = [];
        let two = new EvalObject([], "", true, new Interval(2, 2), true);
        for (var i = 0; i < args.length; i += 4) {
            var numArgs = Math.min(args.length - i, 4);
            var code = MathFunctions['hypot' + numArgs]['' + numArgs].langs[lang];
            var postfix = [];
            var isNumeric = true, isCompatible = true;
            var eo = FunctionSubs.powEvalObjects(args[i], two, lang);
            for (var _ = 0; _ < numArgs; _++) {
                var arg = args[i + _];
                code = code.replaceAll("%" + (_ + 1), arg.code);
                postfix = postfix.concat(arg.postfix);
                isNumeric &= arg.isNumeric, isCompatible &= arg.isCompatible;
                if (_ > 0) eo = FunctionSubs.addEvalObjects(
                    eo, FunctionSubs.powEvalObjects(args[i + _], two, lang), lang);
            }
            args1.push(new EvalObject(
                postfix.concat([new Token('function', this.names[0])]),
                code,
                isNumeric,
                MathFunctions['sqrt']['1'].subSource([eo], lang).range,
                isCompatible));
        }
        args = args1;
    }
    return args[0];
};

FunctionSubs.atan2EvalObjects = function (args, lang) {
    this.assertArgs(args);
    var ranges = [];
    if (args[1].range.x1 > 0.0) {
        var x0 = args[1].range.x0;
        args[1].range.x0 = Math.max(x0, 0.0);
        ranges.push(MathFunctions['atan'][1].subSource(
            [FunctionSubs.divEvalObjects(args[1], args[0], lang)],
            lang).range);
        args[1].range.x0 = x0;
    }
    if (args[1].range.x0 < 0.0) {
        var x1 = args[1].range.x1;
        args[1].range.x1 = Math.min(x1, 0.0);
        if (args[0].range.x1 > 0.0) {
            var y0 = args[0].range.x0;
            args[0].range.x0 = Math.max(y0, 0.0);
            var range = MathFunctions['atan'][1].subSource(
                [FunctionSubs.divEvalObjects(args[1], args[0], lang)],
                lang).range;
            ranges.push(new Interval(range.x0 + Math.PI, range.x1 + Math.PI));
            args[0].range.x0 = y0;
        }
        if (args[0].range.x0 < 0.0) {
            var y1 = args[0].range.x1;
            args[0].range.x1 = Math.min(y1, 0.0);
            var range = MathFunctions['atan'][1].subSource(
                [FunctionSubs.divEvalObjects(args[1], args[0], lang)],
                lang).range;
            ranges.push(new Interval(range.x0 - Math.PI, range.x1 - Math.PI));
            args[0].range.x1 = y1;
        }
        args[1].range.x1 = x1;
    }
    var range = new Interval();
    range.x0 = Infinity, range.x1 = -Infinity;
    for (var i = 0; i < ranges.length; i++) {
        range.x0 = Math.min(range.x0, ranges[i].x0);
        range.x1 = Math.max(range.x1, ranges[i].x1);
    }
    return new EvalObject(
        args[0].postfix.concat(args[1].postfix)
            .concat([new Token('function', this.names[0])]),
        this.langs[lang].replaceAll("%1", args[0].code).replaceAll("%2", args[1].code),
        args[0].isNumeric && args[1].isNumeric,
        range,
        args[0].isCompatible && args[1].isCompatible
    );
};

FunctionSubs.expLatex = function (args) {
    this.assertArgs(args);
    var pfl = 0;  // number of tokens involved
    for (var i = 0; i < args[0].postfix.length; i++) {
        var pf = args[0].postfix[i];
        pfl += pf.hasOwnProperty("postfix") ? pf.postfix.length : 1;
    }
    // for short ones, use "e^x" instead of "exp(x)"
    if (!/\\d?frac/.test(args[0].latex) && pfl <= 5)
        return "\\operatorname{e}^{" + args[0].latex + "}";
    return this.langs.latex.replaceAll("%1", args[0].latex);
};

FunctionSubs.log2EvalObjects = function (args, lang) {
    this.assertArgs(args);
    return FunctionSubs.divEvalObjects(
        MathFunctions['ln']['1'].subSource([args[1]], lang),
        MathFunctions['ln']['1'].subSource([args[0]], lang),
        lang);
};


// Initialize MathFunctions
// Example: initMathFunctions(rawMathFunctionsShared.concat(rawMathFunctionsC))

BuiltInMathFunctions.initMathFunctions = function (funList) {
    let funs = MathFunctions;
    for (var i = 0; i < funList.length; i++) {
        for (var j = 0; j < funList[i].names.length; j++) {
            var name = funList[i].names[j];
            if (funs[name] == undefined) funs[name] = {};
            funs[name]['' + funList[i].numArgs] = funList[i];
        }
    }
    funs['ADD']['2'].subSource = function (args, lang) {
        this.assertArgs(args);
        return FunctionSubs.addEvalObjects(args[0], args[1], lang);
    };
    funs['SUB']['2'].subSource = function (args, lang) {
        this.assertArgs(args);
        return FunctionSubs.subEvalObjects(args[0], args[1], lang);
    };
    funs['MUL']['2'].subSource = function (args, lang) {
        this.assertArgs(args);
        return FunctionSubs.mulEvalObjects(args[0], args[1], lang);
    };
    funs['DIV']['2'].subSource = function (args, lang) {
        this.assertArgs(args);
        return FunctionSubs.divEvalObjects(args[0], args[1], lang);
    };
    funs['exp']['1'].subLatex = FunctionSubs.expLatex;
    funs['pow']['2'].subSource = function (args) {
        this.assertArgs(args);
        return FunctionSubs.powEvalObjects(args[0], args[1]);
    };
    if (funs['log'].hasOwnProperty('2'))
        funs['log']['2'].subSource = FunctionSubs.log2EvalObjects;
    funs['root']['2'].subSource = funs['nthroot']['2'].subSource
        = FunctionSubs.rootEvalObjects;
    if (funs.hasOwnProperty('max') && funs.hasOwnProperty('min'))
        funs['max']['0'].subSource = funs['min']['0'].subSource
            = FunctionSubs.maxMinEvalObjects;
    if (funs.hasOwnProperty('hypot')) {
        funs['hypot']['0'].subLatex = FunctionSubs.hypotLatex;
        funs['hypot']['0'].subSource = FunctionSubs.hypotEvalObjects;
    }
    if (funs.hasOwnProperty('atan2'))
        funs['atan2']['2'].subSource = funs['arctan']['2'].subSource =
            funs['artan']['2'].subSource = funs['atan']['2'].subSource =
            FunctionSubs.atan2EvalObjects;
}

