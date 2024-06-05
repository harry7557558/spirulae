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

// GLSL
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
        },
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
        },
        {
            name: 'mf_bessel_j0',
            source: "float mf_bessel_j0(float x) {\n\
    x = abs(x);\n\
    const float A01 = -0.22334141550835468f;\n\
    const float A02 = -0.18054514613169334f;\n\
    const float A03 = 0.047655819492146555f;\n\
    const float A04 = -0.0024383224605644127f;\n\
    const float B01 = -0.2234104067240744f;\n\
    const float B02 = 0.06997488447829185f;\n\
    const float B03 = -0.009545108494228093f;\n\
    const float B04 = 0.0011020589286710896f;\n\
    const float C01 = -0.12645960753014673f;\n\
    const float C02 = -0.046982403187758204f;\n\
    const float D01 = 0.12546821167569544f;\n\
    const float D02 = -0.08179017949118085f;\n\
    if (x < 4.2f) {\n\
        return (1.0f + x * (A01 + x * (A02 + x * (A03 + x * A04)))) / \n\
               (1.0f + x * (B01 + x * (B02 + x * (B03 + x * B04))));\n\
    } else {\n\
        float inv_x = 1.0f / x;\n\
        return sqrt(inv_x / 3.14159265) * \n\
               ((1.0f + inv_x * (C01 + inv_x * C02)) * cos(x) + \n\
                (1.0f + inv_x * (D01 + inv_x * D02)) * sin(x));\n\
    }\n\
}"
        },
        {
            name: 'mf_bessel_j1',
            source: "float mf_bessel_j1(float x) {\n\
    float s = sign(x); x = abs(x);\n\
    const float A11 = 0.5000532505934573f;\n\
    const float A12 = -0.07119189008625842f;\n\
    const float A13 = -0.03516544965310418f;\n\
    const float A14 = 0.005137712441402014f;\n\
    const float B11 = -0.14169754004287138f;\n\
    const float B12 = 0.05321374041943971f;\n\
    const float B13 = -0.006074191793869077f;\n\
    const float B14 = 0.0008890431150018836f;\n\
    const float C11 = -0.37578090667550257f;\n\
    const float C12 = 0.13415846822338878f;\n\
    const float D11 = 0.3771741874195154f;\n\
    const float D12 = 0.08328593955487182f;\n\
    if (x < 4.7f) {\n\
        return s * (x * (A11 + x * (A12 + x * (A13 + x * A14)))) / \n\
               (1.0f + x * (B11 + x * (B12 + x * (B13 + x * B14))));\n\
    } else {\n\
        float inv_x = 1.0f / x;\n\
        return -s * sqrt(inv_x / 3.14159265) * \n\
               ((1.0f + inv_x * (C11 + inv_x * C12)) * cos(x) - \n\
                (1.0f + inv_x * (D11 + inv_x * D12)) * sin(x));\n\
    }\n\
}"
        },
        {
            name: 'mf_bessel_j2',
            source: "float mf_bessel_j2(float x) {\n\
    x = abs(x);\n\
    const float A22 = 0.12515704623184004f;\n\
    const float A23 = -0.029939064720165425f;\n\
    const float A24 = 0.0010672441356451344f;\n\
    const float B21 = -0.23414231622686957f;\n\
    const float B22 = 0.08321793931659045f;\n\
    const float B23 = -0.012670220025970099f;\n\
    const float B24 = 0.0015767563111494629f;\n\
    const float C21 = 1.874412399273724f;\n\
    const float C22 = -0.8101992991186221f;\n\
    const float C23 = 0.3015954731134034f;\n\
    const float D21 = -1.871274305839778f;\n\
    const float D22 = -0.8861009908575821f;\n\
    if (x < 4.0f) {\n\
        return (x * x * (A22 + x * (A23 + x * A24))) / \n\
               (1.0f + x * (B21 + x * (B22 + x * (B23 + x * B24))));\n\
    } else {\n\
        float inv_x = 1.0f / x;\n\
        return -sqrt(inv_x / 3.14159265) * \n\
               ((1.0f + inv_x * (C21 + inv_x * (C22 + inv_x * C23))) * cos(x) + \n\
                (1.0f + inv_x * (D21 + inv_x * D22)) * sin(x));\n\
    }\n\
}"
        },
        {
            name: 'mf_bessel_j3',
            source: "float mf_bessel_j3(float x) {\n\
    float s = sign(x); x = abs(x);\n\
    const float A33 = 0.020910819133348472f;\n\
    const float A34 = -0.005072094376038419f;\n\
    const float A35 = 0.0002802765938927514f;\n\
    const float B31 = -0.2330616229268751f;\n\
    const float B32 = 0.06455328873550212f;\n\
    const float B33 = -0.008312028977714348f;\n\
    const float B34 = 0.0007466861514973682f;\n\
    const float C31 = -4.376749965939438f;\n\
    const float C32 = -7.327544311795212f;\n\
    const float C33 = 2.8595505732173425f;\n\
    const float D31 = 4.374149309521666f;\n\
    const float D32 = -7.3507982430716545f;\n\
    const float D33 = -3.7324735035522663f;\n\
    if (x < 5.0f) {\n\
        return s * (x * x * x * (A33 + x * (A34 + x * A35))) / \n\
               (1.0f + x * (B31 + x * (B32 + x * (B33 + x * B34))));\n\
    } else {\n\
        float inv_x = 1.0f / x;\n\
        return s * sqrt(inv_x / 3.14159265) * \n\
               ((1.0f + inv_x * (C31 + inv_x * (C32 + inv_x * C33))) * cos(x) - \n\
                (1.0f + inv_x * (D31 + inv_x * (D32 + inv_x * D33))) * sin(x));\n\
    }\n\
}"
        },
        {
            name: 'mf_bessel_j4',
            source: "float mf_bessel_j4(float x) {\n\
    x = abs(x);\n\
    const float A44 = 0.002644492060608329f;\n\
    const float A45 = -0.0006004507528516955f;\n\
    const float A46 = 0.00003320308950860871f;\n\
    const float B41 = -0.20296731043978247f;\n\
    const float B42 = 0.04338600070178919f;\n\
    const float B43 = -0.0035265908540099847f;\n\
    const float B44 = 0.00013712907221840123f;\n\
    const float B45 = 0.000012746991211123013f;\n\
    const float C41 = 7.881701792737443f;\n\
    const float C42 = -27.37611266073206f;\n\
    const float C43 = -39.62023054032f;\n\
    const float D41 = -7.865445288974054f;\n\
    const float D42 = -27.479039704046176f;\n\
    const float D43 = 49.286435632834696f;\n\
    if (x < 8.0f) {\n\
        return (x * x * x * x * (A44 + x * (A45 + x * A46))) / \n\
               (1.0f + x * (B41 + x * (B42 + x * (B43 + x * (B44 + x * B45)))));\n\
    } else {\n\
        float inv_x = 1.0f / x;\n\
        return sqrt(inv_x / 3.14159265) * \n\
               ((1.0f + inv_x * (C41 + inv_x * (C42 + inv_x * C43))) * cos(x) + \n\
                (1.0f + inv_x * (D41 + inv_x * (D42 + inv_x * D43))) * sin(x));\n\
    }\n\
}"
        },
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

// C++, float
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

// C++, double
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


CodeGenerator.parsePrecomputeExpr = function(s) {
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
            fun.grad = CodeGenerator.parsePrecomputeExpr(fun.langs.D);
        }
    }
}

CodeGenerator.initFunctionComplexVector = function() {
    for (var name in MathFunctions) {
        for (var nparam in MathFunctions[name]) {
            var fun = MathFunctions[name][nparam];
            fun.complex = null;
            if (!fun.langs.hasOwnProperty("C"))
                continue;
            if (typeof fun.langs.C == "string") {
                var expr = CodeGenerator.parsePrecomputeExpr(fun.langs.C);
                fun.complex = [];
                for (var i = 0; i < expr.length; i++) {
                    if (expr[i].type == "unit") {
                        var j = i+2;
                        while (j < expr.length && expr[j].type == "unit") j += 2;
                        for (var _ = j; _ >= i; _--)
                            fun.complex.push(expr[_]);
                        i = j;
                    }
                    else fun.complex.push(expr[i]);
                }
            }
            else {
                var real = CodeGenerator.parsePrecomputeExpr(fun.langs.C[0]);
                var imag = CodeGenerator.parsePrecomputeExpr(fun.langs.C[1]);
                var i = new Token("unit", "i");
                fun.complex = real.concat(imag).concat([i]);
            }
        }
    }
    for (var name in MathFunctions) {
        for (var nparam in MathFunctions[name]) {
            var fun = MathFunctions[name][nparam];
            for (var ncomp = 2; ncomp <= 4; ncomp++) {
                var vecname = 'vec' + ncomp;
                fun[vecname] = null;
                if (!fun.langs.hasOwnProperty(vecname))
                    continue;
                fun[vecname] = [];
                if (typeof fun.langs[vecname] == "string") {
                    var p = CodeGenerator.parsePrecomputeExpr(fun.langs[vecname]);
                    fun[vecname] = fun[vecname].concat(p);
                    continue;
                }
                for (var i = 0; i < ncomp; i++) {
                    var p = CodeGenerator.parsePrecomputeExpr(fun.langs[vecname][i]);
                    fun[vecname] = fun[vecname].concat(p);
                    if (i > 0) {
                        var u = new Token('unit', new String(i));
                        fun[vecname].push(i);
                    }
                }
            }
        }
    }
}


// Convert a postfix math expression to LaTeX code
CodeGenerator.postfixToLatex = function (queue) {
    const operators = {
        '-': 1, '+': 1,
        '*': 2, '/': 2, 'dot': 2, 'cross': 2,
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
    function formatNumber(s) {
        s = s.replace(/\.0*$/, "");
        if (s == "" || s[0] == ".") s = "0" + s;
        return s;
    }
    var stack = [];
    for (var i = 0; i < queue.length; i++) {
        var token = queue[i];
        // number
        if (token.type == 'number') {
            var s = formatNumber(token.str);
            stack.push(new EvalLatexObject([token], s, Infinity));
        }
        // unit
        else if (token.type == 'unit') {
            var s = token.str;
            if (s == 'i') {  // complex number
                s = "\\mathfrak{i}";
                var b = formatNumber(queue[i+1].str);
                var a = formatNumber(queue[i+2].str);
                if (b == '1') b = '';
                if (b == '-1') b = '-';
                if (a == '0') a = '';
                if (b.length > 0 && a.lenght > 0 && b[0] != '-') b = '+' + b;
                s = a + b + s;
                if (/[\+\-]/g.test(s)) s = "(" + s + ")";
                stack.push(new EvalLatexObject([token], s, Infinity));
                i += 2;
            }
            else {
                throw new Error();
            }
        }
        // variable
        else if (token.type == "variable") {
            var s = varnameToLatex(token.str);
            if (s == "e") s = "\\operatorname{e}";
            if (s == "π") s = "\\pi";
            stack.push(new EvalLatexObject([token], s, Infinity));
        }
        // operators
        else if (token.type == "operator" ||
            (token.type == "function" &&
                (token.str == "dot" || token.str == "cross"))) {
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
                if (v1.precedence == operators['^'])
                    tex1 = '\\left(' + tex1 + '\\right)';
                latex = "{" + tex1 + "}^{" + tex2 + "}";
                if (token.str == "^" && tex1 == "\\operatorname{e}" && false)
                    latex = MathFunctions['exp']['1'].subLatex([v2]);
            }
            else if (token.str == "dot") {
                latex = "{" + tex1 + "}\\cdot{" + tex2 + "}";
            }
            else if (token.str == "cross") {
                latex = "{" + tex1 + "}\\times{" + tex2 + "}";
            }
            else throw new Error("Unrecognized operator `" + token.str + '`');
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
            if (/^vec[234]$/.test(token.str) && numArgs > 1) {
                fun = MathFunctions['vec'+numArgs];
            }
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


// merge multiple implicit equations
CodeGenerator.mergeImplicitExpressions = function(expressions) {
    var sign = [], mag = [];
    for (var i = 0; i < expressions.length; i++) {
        var expr = expressions[i];
        // sign
        sign = sign.concat(expr);
        sign.push(new Token('function', 'sign', 1));
        if (i > 0)
            sign.push(new Token('operator', '*', 2));
        // magnitude
        mag = mag.concat(expr);
        mag.push(new Token('function', 'abs', 1));
    }
    mag.push(new Token('function', 'min', expressions.length));

    return sign.concat(mag).concat([new Token('operator', '*', 2)]);
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
            CodeGenerator.parsePrecomputeExpr(fun.grad(funArgs.length)) :
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

    function popStackValue(stack) {
        var i = stack.length - 1;
        if (stack[i].code[0] != '\\') {
            var res = [stack[i]];
            stack.pop();
            return res;
        }
        if (stack[i].code == "\\i") {
            var res = [stack[i-2], stack[i-1], stack[i]];
            stack.pop(); stack.pop(); stack.pop();
            return res;
        }
        if (/^\\[123]$/.test(stack[i].code)) {
            var n = 2 * Number(stack[i].code[1]) + 1;
            var res = stack.slice(stack.length-n);
            for (var i = 0; i < n; i++)
                stack.pop();
            return res;
        }
        throw new Error("Unrecognized unit " + stack[i].code);
    }

    function toComplex(v) {
        let zero = new EvalObject([new Token('number', '0')],
            constexpr.replaceAll("%1", '0.0'),
            true, new Interval(0.0, 0.0), true);
        let imag = new EvalObject([new Token('unit', 'i')], "\\i", false);
        return [v[0], zero, imag];
    }
    function toVector(v, n) {
        let zero = new EvalObject([new Token('number', '0')],
            constexpr.replaceAll("%1", '0.0'),
            true, new Interval(0.0, 0.0), true);
        var res = [v[0]];
        for (var i = 1; i < n; i++) {
            res.push(v[0]);
            res.push(new EvalObject([new Token('unit', '\\'+i)], '\\'+i, false));
        }
        return res;
    }

    function addToken(stack, token, diffvar) {
        var obj = null, objAlt = null, fun = null;

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
        else if (token.type == 'unit') {
            obj = new EvalObject([token], '\\'+token.str, false);
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
                if (typeof s == "object") {
                    for (var i = 0; i < s.length; i++)
                        addToken(stack, s[i], diffvar);
                    return;
                }
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
            var v2 = popStackValue(stack);
            var v1 = popStackValue(stack);
            var isComplex1 = v1.length == 3 && v1[2].code == "\\i";
            var isComplex2 = v2.length == 3 && v2[2].code == "\\i";
            if (isComplex1 && isComplex2);
            else if (isComplex1 ^ isComplex2 && v1.length > 1 && v2.length > 1)
                throw new Error("Vectors only support real components.");
            else if (v1.length > 1 && v1.length == v2.length) {
                if (token.str == '*')
                    throw new Error("Cannot multiply a vector by a vector. For dot product of a and b, use dot(a,b).");
                if (token.str == '/')
                    throw new Error("Cannot divide a vector by a vector.");
                if (token.str == '^')
                    throw new Error("Cannot raise a vector to the power of a vector.");
            }
            if (isComplex1 && v2.length == 1)
                v2 = toComplex(v2);
            else if (v1.length > 1 && v2.length == 1 && /[\*\/]/.test(token.str))
                v2 = toVector(v2, (v1.length+1)/2);
            if (v1.length == 1 && isComplex2)
                v1 = toComplex(v1);
            else if (v2.length > 1 && v1.length == 1 && (token.str == "*" ||
                    (token.str == '-' && v1[0].range.x0 == 0 && v1[0].range.x1 == 0)))
                v1 = toVector(v1, (v2.length+1)/2);
            if (v1.length != v2.length) {
                if (v1.length == 1 || v2.length == 1)
                    throw new Error("Mixed vector and scalar in operator `"+token.str+"`.");
                throw new Error("Mixed vectors of different dimensions in operator `"+token.str+"`.");
            }

            // complex
            if (v1.length == 3 && v1[2].code == "\\i") {
                var fun = MathFunctions[{
                    '+': 'ADD', '-': "SUB",
                    '*': 'MUL', '/': 'DIV', '^': 'pow'
                }[token.str]]['2'];
                if (!fun.complex)
                    throw new Error(fun.name[0] + " does not support complex argument.");
                var vmap = {
                    'a@1': v1[0], 'b@1': v1[1],
                    'a@2': v2[0], 'b@2': v2[1]
                };
                for (var i = 0; i < fun.complex.length; i++) {
                    var t = fun.complex[i];
                    if (t.type == "variable" && /@/.test(t.str))
                        stack.push(vmap[t.str]);
                    else addToken(stack, t, diffvar);
                }
                if (!MathParser.complexMode) {
                    var imag = stack[stack.length-2];
                    if (imag.range.x0 == 0.0 && imag.range.x1 == 0.0)
                        stack.pop(), stack.pop();
                }
                return;
            }

            // vector
            if (v1.length > 1) {
                var fun = MathFunctions[{
                    '+': 'ADD', '-': "SUB",
                    '*': 'MUL', '/': 'DIV', '^': 'pow'
                }[token.str]]['2'];
                var ncomps = (v1.length+1)/2;
                var vecname = 'vec'+ncomps;
                for (var i = 0; i < 2*ncomps-1; i++) {
                    if (/^\\\d$/.test(v1[i].code)) {
                        stack.push(v1[i]);
                    }
                    else {
                        stack.push(v1[i]);
                        stack.push(v2[i]);
                        addToken(stack, token, diffvar);
                    }
                }
                return;
            }

            // real scalar
            v1 = v1[0], v2 = v2[0];
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
            var funArgs = [];
            for (var j = numArgs; j > 0; j--)
                funArgs = [popStackValue(stack)].concat(funArgs);

            // real/complex, scalar/vector
            var isRealScalar = true;
            var isComplex = false;
            var comps = [], maxComps = 0;
            for (var i = 0; i < numArgs; i++) {
                if (funArgs[i].length > 1) {
                    isRealScalar = false;
                    if (funArgs[i][funArgs[i].length-1].code == "\\i")
                        isComplex = true;
                }
                var comp = (funArgs[i].length+1)/2;
                comps.push(comp);
                maxComps = Math.max(maxComps, comp);
            }
            var isVec = /^vec[2-4]$/.test(token.str);
            var funType = new Array(numArgs).fill('a').join('');
            if (fun.hasOwnProperty(numArgs) && fun[numArgs].langs.hasOwnProperty("type"))
                funType = fun[numArgs].langs.type;
            var typeMap = {};
            for (var i = 0; i < numArgs; i++) {
                if (isVec) {
                    // if (!isRealScalar && funArgs[i].length == 1)
                    //     funArgs[i] = [funArgs[i]];
                    continue;
                }
                if (isComplex && funArgs[i].length == 1)
                    funArgs[i] = toComplex(funArgs[i]);
                if (typeMap.hasOwnProperty(funType[i])) {
                    if (typeMap[funType[i]] != funArgs[i].length)
                        throw new Error("Mixed vectors with different dimensions in `"
                                + token.str + "`.");
                }
                else typeMap[funType[i]] = funArgs[i].length;
                if (isRealScalar)
                    funArgs[i] = funArgs[i][0];
                else if (funArgs[i].length == 1) {
                    funArgs[i] = toVector(funArgs[i], maxComps);
                }
            }

            // vector function
            // if (isVec && isRealScalar) {
            //     console.log(funArgs.slice());
            //     var n = Number(token.str.slice(3));
            //     if (n != numArgs && numArgs != 1)
            //         throw new Error("Incorrect number of components for "
            //             + token.str + " (" + numArgs + ")");
            //     for (var i = 0; i < n; i++) {
            //         stack.push(funArgs[numArgs==1 ? 0 : i]);
            //         if (i > 0)
            //             addToken(stack, new Token('unit', ''+i));
            //     }
            //     return;
            // }
            // else
            if (isVec) {
                var n = Number(token.str.slice(3));
                if (numArgs > n)
                    throw new Error("Too many arguments for " + token.str + " (" + numArgs + ")");
                var comps = [];
                for (var i = 0; i < numArgs; i++) {
                    if (funArgs[i][funArgs[i].length-1].code == "\\i")
                        throw new Error("Does not support complex vector");
                    comps.push(funArgs[i][0]);
                    for (var _ = 1; _ < funArgs[i].length; _ += 2)
                        comps.push(funArgs[i][_]);
                }
                if (comps.length == 1)
                    comps = new Array(n).fill(comps[0]);
                if (comps.length != n)
                    throw new Error("Vector components don't match for " + token.str);
                for (var i = 0; i < comps.length; i++) {
                    stack.push(comps[i]);
                    if (i > 0)
                        addToken(stack, new Token('unit', ''+i));
                }
                return;
            }
            // typemap vecs must have same type
            else {
                for (var i = 0; i < numArgs; i++) {
                    if (typeMap[funType[i]] != 1 && typeMap[funType[i]] != 2*maxComps-1)
                        throw new Error("Mixed vectors of different lengths in `"
                            + token.str + "`.");
                }
            }

            // complex
            if (isComplex) {
                fun = fun[numArgs];
                if (!fun || !fun.complex)
                    throw new Error("Function `" + token.str + "` does not support complex numbers.");
                for (var i = 0; i < fun.complex.length; i++) {
                    var t = fun.complex[i];
                    if (t.type == "unit") {
                        addToken(stack, t, diffvar);
                    }
                    else if (t.type == "variable" && /[ab]@/.test(t.str)) {
                        var v = t.str.split('@');
                        var ridx = v[0] == 'a' ? 0 : 1;
                        var aidx = Number(v[1]) - 1;
                        stack.push(funArgs[aidx][ridx]);
                    }
                    else if (t.type == "variable" && /z@\d+/.test(t.str)) {
                        var ai = Number(t.str.slice(2))-1;
                        for (var j = 0; j < funArgs[ai].length; j++)
                            stack.push(funArgs[ai][j]);
                    }
                    else addToken(stack, t, diffvar);
                }
                if (!MathParser.complexMode) {
                    var imag = stack[stack.length-2];
                    if (imag.range.x0 == 0.0 && imag.range.x1 == 0.0)
                        stack.pop(), stack.pop();
                }
                return;
            }

            // vector arguments
            if (!isRealScalar) {
                fun = fun[numArgs];
                var vecname = 'vec' + maxComps;
                if (!fun || !fun[vecname])
                    throw new Error("Function `"+token.str+'['+numArgs+"]` does not support `"+vecname+"`.");
                for (var i = 0; i < fun[vecname].length; i++) {
                    var t = fun[vecname][i];
                    if (t.type == "unit") {
                        addToken(stack, t, diffvar);
                    }
                    else if (t.type == "variable" && /[abc]@/.test(t.str)) {
                        var v = t.str.split('@');
                        var aidx = v[0].charCodeAt(0) - 'a'.charCodeAt(0);
                        var ridx = Number(v[1]) - 1;
                        ridx = Math.max(2*ridx-1, 0);
                        stack.push(funArgs[aidx][ridx]);
                    }
                    else addToken(stack, t, diffvar);
                }
                return;
            }

            // real scalar
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
        if (typeof obj != 'object')
            return null;
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
    let dvars = MathParser.DependentVariables;
    for (var qi in queues) {
        var queue = queues[qi];
        var stack = [];  // EvalObject objects
        for (var i = 0; i < queue.length; i++) {
            addToken(stack, { ...queue[i] }, null);
        }
        var vecn = 1;
        if (dvars.hasOwnProperty(qi) && /^(complex|vec2)$/.test(dvars[qi].type))
            vecn = 2;
        if (dvars.hasOwnProperty(qi) && dvars[qi].type === "vec3")
            vecn = 3;
        var res = popStackValue(stack);
        if (res.length > 2*vecn-1 || res.length % 2 != 1) {
            if (vecn == 1 && stack.length == 0)
                throw new Error("Result is not a real scalar.");
            throw new Error("Result stack length is not 1");
        }
        if (vecn == 1) {
            qmap[qi] = res[0];
            continue;
        }
        qmap[qi] = [res[0]];
        isCompatible &= res[0].isCompatible;
        for (var i = 1; i < res.length; i += 2) {
            qmap[qi].push(res[i]);
            isCompatible &= res[i].isCompatible;
        }
        while (qmap[qi].length < vecn)
            // qmap[qi].push(tokenToEvalObject(new Token('number', '0.0')));
            qmap[qi].push(new EvalObject(
                [new Token('number', "0.0")],
                constexpr.replaceAll("%1", "0.0"),
                true, new Interval(0.0, 0.0), true));
        for (var i = 0; i < qmap[qi].length; i++)
            qmap[qi+'['+i+']'] = qmap[qi][i];
        delete qmap[qi];
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
        if (grad)
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
            for (var qi in qmap) {
                if (code.indexOf("{%"+qi+"%}") == -1)
                    isAllHave = false;
            }
            if (isAllHave) {
                result.code = code;
                break;
            }
        }
        if (result.code == "")
            throw new Error("You assigned too many output variables.");
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
    var funs = [];
    if (typeof langpack.config.fun == 'string') {
        funs = langpack.config.fun;
    }
    else {
        for (var i = 0; i < langpack.config.fun.length; i++)
            funs.push(langpack.config.fun[i]);
        funs = funs.join('\n');
    }
    var matches = funs.match(/\{\%[\w_\,\;\[\]]+\%\}/g);
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

