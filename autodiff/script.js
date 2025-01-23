const Presets = [
    // R³ -> R
    {
        name: "R³ -> R, C/C++ float",
        lang: "cppf",
        codeFun: `float fun(float x, float y, float z) {
    float {%funbody%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R, C/C++ double",
        lang: "cppd",
        codeFun: `double fun(double x, double y, double z) {
    double {%funbody%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R, C++/Eigen float",
        lang: "cppf",
        codeFun: `float fun(const Eigen::Vector3f& p) {
    float x = p.x(), y = p.y(), z = p.z();
    float {%funbody%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R, C++/Eigen double",
        lang: "cppd",
        codeFun: `double fun(const Eigen::Vector3d& p) {
    double x = p.x(), y = p.y(), z = p.z();
    double {%funbody%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R, C++/GLM",
        lang: "cppf",
        codeFun: `float fun(const glm::vec3& p) {
    float x = p.x, y = p.y, z = p.z;
    float {%funbody%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R, GLSL",
        lang: "glsl",
        codeFun: `float fun(in vec3 p) {
    float x = p.x, y = p.y, z = p.z;
    float {%funbody%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    // R³ -> R with gradient
    {
        name: "R³ -> R with gradient, C/C++ float",
        lang: "cppf",
        codeFun: `float fun(float x, float y, float z, float *dvdx, float *dvdy, float *dvdz) {
    float {%funbody%};
    *dvdx={%v;x%}, *dvdy={%v;y%}, *dvdz={%v;z%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R with gradient, C/C++ double",
        lang: "cppd",
        codeFun: `double fun(double x, double y, double z, double *dvdx, double *dvdy, double *dvdz) {
    double {%funbody%};
    *dvdx={%v;x%}, *dvdy={%v;y%}, *dvdz={%v;z%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R with gradient, C/C++ double, cozy",
        lang: "cppd",
        codeFun: `double fun(
    double x, double y, double z,
    double *dvdx, double *dvdy, double *dvdz
) {
{%funbody%}
    *dvdx = {%v;x%}, *dvdy = {%v;y%}, *dvdz = {%v;z%};
    return {%v%};
}`,
        codeDef: `    double {%varname%} = {%expr%};`,
        codeJoiner: `
`,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R with gradient, C++/Eigen float",
        lang: "cppf",
        codeFun: `float fun(const Eigen::Vector3f& p, Eigen::Vector3f& grad) {
    float x = p.x(), y = p.y(), z = p.z();
    float {%funbody%};
    grad = Eigen::Vector3f({%v;x%}, {%v;y%}, {%v;z%});
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R with gradient, C++/Eigen double",
        lang: "cppd",
        codeFun: `double fun(const Eigen::Vector3d& p, Eigen::Vector3d& grad) {
    double x = p.x(), y = p.y(), z = p.z();
    double {%funbody%};
    grad = Eigen::Vector3d({%v;x%}, {%v;y%}, {%v;z%});
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R with gradient, C++/GLM",
        lang: "cppf",
        codeFun: `float fun(const glm::vec3& p, glm::vec3& grad) {
    float x = p.x, y = p.y, z = p.z;
    float {%funbody%};
    grad = glm::vec3({%v;x%}, {%v;y%}, {%v;z%});
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R with gradient, GLSL",
        lang: "glsl",
        codeFun: `float fun(in vec3 p, out vec3 grad) {
    float x = p.x, y = p.y, z = p.z;
    float {%funbody%};
    grad = vec3({%v;x%}, {%v;y%}, {%v;z%});
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    // R³ -> R with gradient and Hessian
    {
        name: "R³ -> R with gradient and Hessian, C/C++ float",
        lang: "cppf",
        codeFun: `float fun(float x, float y, float z, float *grad, float *hess) {
    float {%funbody%};
    grad[0]={%v;x%}, grad[1]={%v;y%}, grad[2]={%v;z%};
    hess[0]={%v;x,x%}, hess[1]={%v;x,y%}, hess[2]={%v;x,z%}, hess[3]={%v;x,y%}, hess[4]={%v;y,y%}, hess[5]={%v;y,z%}, hess[6]={%v;x,z%}, hess[7]={%v;y,z%}, hess[8]={%v;z,z%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R with gradient and Hessian, C/C++ double",
        lang: "cppd",
        codeFun: `double fun(double x, double y, double z, double *grad, double *hess) {
    double {%funbody%};
    grad[0]={%v;x%}, grad[1]={%v;y%}, grad[2]={%v;z%};
    hess[0]={%v;x,x%}, hess[1]={%v;x,y%}, hess[2]={%v;x,z%}, hess[3]={%v;x,y%}, hess[4]={%v;y,y%}, hess[5]={%v;y,z%}, hess[6]={%v;x,z%}, hess[7]={%v;y,z%}, hess[8]={%v;z,z%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R with gradient and Hessian, C++/Eigen float",
        lang: "cppf",
        codeFun: `float fun(const Eigen::Vector3f& p, Eigen::Vector3f& grad, Eigen::Matrix3f& hess) {
    float x = p.x(), y = p.y(), z = p.z();
    float {%funbody%};
    grad = Eigen::Vector3f({%v;x%}, {%v;y%}, {%v;z%});
    hess << {%v;x,x%}, {%v;x,y%}, {%v;x,z%}, {%v;x,y%}, {%v;y,y%}, {%v;y,z%}, {%v;x,z%}, {%v;y,z%}, {%v;z,z%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R with gradient and Hessian, C++/Eigen double",
        lang: "cppd",
        codeFun: `double fun(const Eigen::Vector3d& p, Eigen::Vector3d& grad, Eigen::Matrix3d& hess) {
    double x = p.x(), y = p.y(), z = p.z();
    double {%funbody%};
    grad = Eigen::Vector3d({%v;x%}, {%v;y%}, {%v;z%});
    hess << {%v;x,x%}, {%v;x,y%}, {%v;x,z%}, {%v;x,y%}, {%v;y,y%}, {%v;y,z%}, {%v;x,z%}, {%v;y,z%}, {%v;z,z%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R with gradient and Hessian, C++/GLM",
        lang: "cppf",
        codeFun: `float fun(const glm::vec3& p, glm::vec3& grad, glm::mat3& hess) {
    float x = p.x, y = p.y, z = p.z;
    float {%funbody%};
    grad = glm::vec3({%v;x%}, {%v;y%}, {%v;z%});
    hess = glm::mat3({%v;x,x%}, {%v;x,y%}, {%v;x,z%}, {%v;x,y%}, {%v;y,y%}, {%v;y,z%}, {%v;x,z%}, {%v;y,z%}, {%v;z,z%});
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    {
        name: "R³ -> R with gradient and Hessian, GLSL",
        lang: "glsl",
        codeFun: `float fun(in vec3 p, out vec3 grad, out mat3 hess) {
    float x = p.x, y = p.y, z = p.z;
    float {%funbody%};
    grad = vec3({%v;x%}, {%v;y%}, {%v;z%});
    hess = mat3({%v;x,x%}, {%v;x,y%}, {%v;x,z%}, {%v;x,y%}, {%v;y,y%}, {%v;y,z%}, {%v;x,z%}, {%v;y,z%}, {%v;z,z%});
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y, z",
        varsD: "v",
    },
    // R² -> R
    {
        name: "R² -> R, C/C++ float",
        lang: "cppf",
        codeFun: `float fun(float x, float y) {
    float {%funbody%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y",
        varsD: "v",
    },
    {
        name: "R² -> R, C/C++ double",
        lang: "cppd",
        codeFun: `double fun(double x, double y) {
    double {%funbody%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y",
        varsD: "v",
    },
    {
        name: "R² -> R, C++/GLM",
        lang: "cppf",
        codeFun: `float fun(const glm::vec2& p) {
    float x = p.x, y = p.y;
    float {%funbody%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y",
        varsD: "v",
    },
    {
        name: "R² -> R, GLSL",
        lang: "glsl",
        codeFun: `float fun(in vec2 p) {
    float x = p.x, y = p.y;
    float {%funbody%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y",
        varsD: "v",
    },
    // R² -> R with gradient
    {
        name: "R² -> R with gradient, C/C++ float",
        lang: "cppf",
        codeFun: `float fun(float x, float y, float *dvdx, float *dvdy) {
    float {%funbody%};
    *dvdx={%v;x%}, *dvdy={%v;y%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y",
        varsD: "v",
    },
    {
        name: "R² -> R with gradient, C/C++ double",
        lang: "cppd",
        codeFun: `double fun(double x, double y, double *dvdx, double *dvdy) {
    double {%funbody%};
    *dvdx={%v;x%}, *dvdy={%v;y%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y",
        varsD: "v",
    },
    {
        name: "R² -> R with gradient, C/C++ double, cozy",
        lang: "cppd",
        codeFun: `double fun(
    double x, double y,
    double *dvdx, double *dvdy
) {
{%funbody%}
    *dvdx = {%v;x%}, *dvdy = {%v;y%};
    return {%v%};
}`,
        codeDef: `    double {%varname%} = {%expr%};`,
        codeJoiner: `
`,
        varsI: "x, y",
        varsD: "v",
    },
    {
        name: "R² -> R with gradient, C++/GLM",
        lang: "cppf",
        codeFun: `float fun(const glm::vec2& p, glm::vec2& grad) {
    float x = p.x, y = p.y;
    float {%funbody%};
    grad = glm::vec2({%v;x%}, {%v;y%});
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y",
        varsD: "v",
    },
    {
        name: "R² -> R with gradient, GLSL",
        lang: "glsl",
        codeFun: `float fun(in vec2 p, out vec2 grad) {
    float x = p.x, y = p.y;
    float {%funbody%};
    grad = vec2({%v;x%}, {%v;y%});
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y",
        varsD: "v",
    },
    // R² -> R with gradient and Hessian
    {
        name: "R² -> R with gradient and Hessian, C/C++ float",
        lang: "cppf",
        codeFun: `float fun(float x, float y, float *grad, float *hess) {
    float {%funbody%};
    grad[0]={%v;x%}, grad[1]={%v;y%};
    hess[0]={%v;x,x%}, hess[1]={%v;x,y%}, hess[2]={%v;x,y%}, hess[3]={%v;y,y%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y",
        varsD: "v",
    },
    {
        name: "R² -> R with gradient and Hessian, C/C++ double",
        lang: "cppd",
        codeFun: `double fun(double x, double y, double *grad, double *hess) {
    double {%funbody%};
    grad[0]={%v;x%}, grad[1]={%v;y%};
    hess[0]={%v;x,x%}, hess[1]={%v;x,y%}, hess[2]={%v;x,y%}, hess[3]={%v;y,y%};
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y",
        varsD: "v",
    },
    {
        name: "R² -> R with gradient and Hessian, C++/GLM",
        lang: "cppf",
        codeFun: `float fun(const glm::vec2& p, glm::vec2& grad, glm::mat2& hess) {
    float x = p.x, y = p.y;
    float {%funbody%};
    grad = glm::vec2({%v;x%}, {%v;y%});
    hess = glm::mat2({%v;x,x%}, {%v;x,y%}, {%v;x,y%}, {%v;y,y%});
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y",
        varsD: "v",
    },
    {
        name: "R² -> R with gradient and Hessian, GLSL",
        lang: "glsl",
        codeFun: `float fun(in vec2 p, out vec2 grad, out mat2 hess) {
    float x = p.x, y = p.y;
    float {%funbody%};
    grad = vec2({%v;x%}, {%v;y%});
    hess = mat2({%v;x,x%}, {%v;x,y%}, {%v;x,y%}, {%v;y,y%});
    return {%v%};
}`,
        codeDef: `{%varname%}={%expr%}`,
        codeJoiner: `, `,
        varsI: "x, y",
        varsD: "v",
    },
];



function setPreset(preset) {
    document.getElementById("lang").value = preset.lang;
    document.getElementById("code-fun").value = preset.codeFun;
    document.getElementById("code-def").value = preset.codeDef;
    document.getElementById("code-joiner").value = preset.codeJoiner;
    document.getElementById("vars-i").value = preset.varsI;
    document.getElementById("vars-d").value = preset.varsD;
    update();
}

function initPresets() {
    var select = document.getElementById("presets");
    for (var i = 0; i < Presets.length; i++) {
        var opt = document.createElement("option");
        opt.value = i;
        opt.textContent = Presets[i].name;
        if (opt.textContent == "R³ -> R with gradient and Hessian, C++/Eigen float")
            opt.selected = true;
        select.appendChild(opt);
    }
    function update() {
        var value = parseInt(select.value);
        setPreset(Presets[value]);
    };
    select.addEventListener("input", update);
    update();
}



function getVarsI() {
    var s = document.getElementById("vars-i").value;
    s = s.split(',');
    var r = {};
    for (var i = 0; i < s.length; i++) {
        var v = s[i].trim();
        r[v] = v;
    }
    return r;
}

function getVarsD() {
    var s = document.getElementById("vars-d").value;
    s = s.split(',');
    var r = {};
    for (var i = 0; i < s.length; i++)
        r[s[i].trim()] = true;
    return r;
}

function update() {
    MathParser.IndependentVariables = getVarsI();
    MathParser.DependentVariables = getVarsD();
    var lang = document.getElementById("lang").value;
    let langpack = CodeGenerator.langs[lang];
    langpack.config = {
        fun: document.getElementById("code-fun").value,
        def: document.getElementById("code-def").value,
        prefix: 'v',
        joiner: document.getElementById("code-joiner").value,
    };
    let code = document.getElementById("code");
    var expr = document.getElementById("expr").value;
    var parsed = null;
    try {
        parsed = MathParser.parseInput(expr);
        var expr = {};
        for (var varname in MathParser.DependentVariables)
            if (parsed.hasOwnProperty(varname))
                expr[varname] = parsed[varname];
        var source = CodeGenerator.postfixToSource([expr], [''], lang);
        code.style.color = "black";
        code.textContent = source.source;
    }
    catch (e) {
        code.style.color = "red";
        document.getElementById("code").textContent = e;
    }
}

window.onload = function() {
    initPresets();
    BuiltInMathFunctions.initMathFunctions(
        BuiltInMathFunctions.rawMathFunctionsShared
            .concat(BuiltInMathFunctions.rawMathFunctionsR)
    );
    MathParser.initGreekLetters();
    update();
    document.getElementById("lang").oninput = update;
    document.getElementById("code-fun").oninput = update;
    document.getElementById("code-def").oninput = update;
    document.getElementById("code-joiner").oninput = update;
    document.getElementById("vars-i").oninput = update;
    document.getElementById("vars-d").oninput = update;
    document.getElementById("expr").oninput = update;
}