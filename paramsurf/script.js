// 3D Implicit Surface Grapher

const NAME = "spirulae.paramsurf.";

const builtinFunctions = [
    ["Nautilus", "x=ucos(2piln(u))(1+cos(2piv));y=usin(2piln(u))(1+cos(2piv));z=usin(2piv)"],
    ["Bouquet", "r=(2-sin(piv^2))cos(5piu)^2sin(5piv);x=rcos(2piu)sin(piv);y=rsin(2piu)sin(piv);z=-rcos(piv)"],
    ["Twist", "x=cos(4piu)(cos(2piu)(sqrt(2)+cos(2piv))+sin(2piu)sin(2piv)cos(2piv));y=-sin(4piu)(cos(2piu)(sqrt(2)+cos(2piv))+sin(2piu)sin(2piv)cos(2piv));z=-sin(2piu)(sqrt(2)+cos(2piv))+cos(2piu)sin(2piv)cos(2piv)"],
    ["Torus", "r=0.5+0.05pow(1-pow((sin(10piv)-0.5sin(32piu))/1.5,2),20);x=cos(2piu)(1+rcos(2piv));y=sin(2piu)(1+rcos(2piv));z=rsin(2piv)"],
    ["Flower", "r(u)=0.5asin(0.99sin(10piu))+0.4;x=r(u)cos(2piu)(2+0.2r(u)^2cos(2piv));y=r(u)sin(2piu)(2+0.2r(u)^2cos(2piv));z=0.3|r(u)|^0.5sin(2piv)"],
    ["Trefoil", "y=sin(6piu)/(2+cos(2piv));x=-(cos(2piu)-2cos(4piu))(2+cos(2piv))(2+cos(2piv+2pi/3))/8;z=-(sin(2piu)+2sin(4piu))/(2+cos(2piv+2pi/3))"],
    ["Complex Exp", "x=2(2u-1);y=2(2v-1);z=1/5clamp(e^(-5x)cos(5y),-5,5)"],
    ["Peaks", "x=4(2u-1);y=4(2v-1);z=(1+x)^2e^(-x^2-(1-y)^2)-3(x^3-x/5+y^5)e^(-x^2-y^2)-1/10e^(-(1-x)^2-y^2)"],
    ["Conch 1", "n=1+0.02exp(sin(40piln(v)+10piu));x=v^2.2sin(4piln(v))(0.95+cos(2piu))n;y=v^2.2cos(4piln(v))(0.95+cos(2piu))n;z=v^2.2(sin(2piu)n-1.5)+1"],
    ["Conch 2", "t=1-|ln(u)|^3;n=0.005ucos(100piv)+0.015exp(1.5sin(8pit));c1=cos(2piv)+.2sin(2piv)*sin(2piv);c2=-1.3*sin(2piv)+cos(2piv)*cos(2piv);b=.37;r=(1+n)(.5+.8*c1+.3*c2)/(.7+.7e^-.4z);x=exp(bt)rsin(pi*t);y=exp(bt)rcos(pi*t);z=exp(bt)(2.5*(exp(-bt)-1)+.8c2-.2*c1)"],
    ["Conch 3", "n=1+0.015exp(sin(40piln(v)+10piu));x=v^2.2sin(4piln(v))(0.95+cos(2piu))n&#32;0.9e^(0.5z);y=v^2.2cos(4piln(v))(0.95+cos(2piu))n&#32;0.9e^(0.5z);z=v^2.2(1.5sin(2piu)n-2)+1"],
    ["Conch 4", "n=1+cos(piu)^2(exp(8cos(20piln(v))-9.6)+0.01exp(sin(105piln(v));k=0.7;s=0.5;x=sv^ksin(4piln(v))(0.95+cos(2piu))n;y=sv^kcos(4piln(v))(0.95+cos(2piu))n;z=sv^k(sin(2piu)n-6)+3.5s"],
    ["Conch 5", "c1(t)=0.5+cos(t);c2(t)=1.2sin(t)-0.2(1/2-1/2sin(t+0.1))^60cos(10(t+0.1));k=0.618;o=2.85;x=v^ksin(2pilnv)c1(2piu);y=v^kcos(2pilnv)c1(2piu);z=v^k(c2(2piu)-o)+0.65o"],
    ["Sea Urchin", "t=0.5+0.5cos(20piu);r=sin(pi(0.1+0.8v))+0.02sin(3piu);s_w=0.1t^2exp(sin(30piu)^10);%T(x)=ln(e^(2x)+1)/2;T(x)=(x+sqrt(x^2+1))/2;s_s=0.05(1-t)^2T(5(cos(60piu)+sin(30piv)-0.5))^0.5;s=(sqrt(v(1-v))+0.1)(s_w+s_s);x=cos(2piu)(r+s);y=sin(2piu)(r+s);z=0.8cos(0.9piv)(1+s)"],
    ["Arc Clam", "c1=1.4u^1.5(1+0.01sin(60piv))sin(piv);c2=2u^1.5(1+0.01sin(60piv))(1-.2exp(-10sin(piv)))u^1.5(-cos(piv)+0.2cos(3piv)-0.1sin(2piv)+0.2sin(piv));x=(1+0.05u^2-exp(-5u))^2cos(2piu)c1-0.5;z=-sin(2piu)c1;y=(2u-1.4u^2)c2"],
    ["Jellyfish", "r=(v(1-v)+sin(piv))(1+0.05(1-v^2)exp(2sin(48piu))+0.1sin(7piu));x=cos(2piu)r;z=sin(2piu)r;y=1-cos(piv)-4v(1-v)sin(iTime(0))^2-0.5/(1-v)^0.5"],
    ["Membrane", "r=v;theta=2piu;t=2iTime(0);#&#32;(0,1)&#32;mode;lambda01=2.40483;z01=cos(lambda01t)besselJ0(lambda01r);#&#32;(0,2)&#32;mode;lambda02=5.52008;z02=cos(lambda02t)besselJ0(lambda02r);#&#32;(1,2)&#32;mode;lambda12=7.01559;z12=sin(lambda12t)besselJ1(lambda12r)cos(theta);#&#32;(2,3)&#32;mode;lambda23=11.6198;z23=sin(lambda23t)besselJ2(lambda23r)sin(2theta);#&#32;surface;x=2rcos(theta);y=2rsin(theta);z=0.8z01+0.2z02+0.2z12+0.1z23"],
    ["Parametric Curve", "x0(t)=t(cos(4pit)-cos(4pit)cos(60pit);y0(t)=t(sin(4pit)-sin(4pit)cos(60pit);z0(t)=t(sin(60pit)-1)+0.5;h=0.005;x1(t)=(x0(t+h)-x0(t-h))/(2h);y1(t)=(y0(t+h)-y0(t-h))/(2h);z1(t)=(z0(t+h)-z0(t-h))/(2h);x2(t)=(x0(t+h)+x0(t-h)-2x0(t))/h^2;y2(t)=(y0(t+h)+y0(t-h)-2y0(t))/h^2;z2(t)=(z0(t+h)+z0(t-h)-2z0(t))/h^2;l2(t)=hypot(x2(t),y2(t),z2(t));x3(t)=y1(t)z2(t)-y2(t)z1(t);y3(t)=z1(t)x2(t)-z2(t)x1(t);z3(t)=x1(t)y2(t)-x2(t)y1(t);l3(t)=hypot(x3(t),y3(t),z3(t));r=0.025;x=x0(u)+r(x2(u)/l2(u)cos(2piv)+x3(u)/l3(u)sin(2piv));y=y0(u)+r(y2(u)/l2(u)cos(2piv)+y3(u)/l3(u)sin(2piv));z=z0(u)+r(z2(u)/l2(u)cos(2piv)+z3(u)/l3(u)sin(2piv))"],
    ["Cups", "t=2v-1;w=3t(1-t^2);a=10ln(1-t^2);x=t+wsin(a)cos(piu);y=t+wcos(a)cos(piu);z0=2tcos(piu)(1+0.1usin(40piw^10)-0.1u);z=-3+exp(0.8z0)"],
    ["Boy's Surface", "w=vexp(2piiu);g1=-3/2Im(w(1-w^4)/(w^6+sqrt(5)w^3-1));g2=-3/2Re(w(1+w^4)/(w^6+sqrt(5)w^3-1));g3=Im((1+w^6)/(w^6+sqrt(5)w^3-1))-1/2;s=1/(g1^2+g2^2+g3^2);x=sg1;y=sg2;z=sg3+1/2"],
];


function initLangpack() {
    CodeGenerator.langs.glsl.presets.paramsurf_compact = {
        fun: [
            "vec3 {%funname%}(float u, float v) {\n\
    float {%funbody%};\n\
    return vec3({%x%}, {%y%}, {%z%});\n\
}"
        ],
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };
    CodeGenerator.langs.glsl.presets.paramsurfg_compact = {
        fun: [
            "vec3 {%funname%}(float u, float v) {\n\
    float {%funbody%};\n\
    return vec3({%x%}, {%y%}, {%z%});\n\
}\n\
mat3 {%funname%}G(float u, float v) {\n\
    float {%funbody%};\n\
    return mat3({%x%}, {%y%}, {%z%}, {%x;u%}, {%y;u%}, {%z;u%}, {%x;v%}, {%y;v%}, {%z;v%});\n\
}"
        ],
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };
    CodeGenerator.langs.glsl.presets.paramsurfh_compact = {
        fun: [
            "vec3 {%funname%}(float u, float v) {\n\
    float {%funbody%};\n\
    return vec3({%x%}, {%y%}, {%z%});\n\
}\n\
mat3 {%funname%}H(float u, float v, out mat3 r2uv) {\n\
    float {%funbody%};\n\
    r2uv = mat3({%x;u,u%}, {%y;u,u%}, {%z;u,u%}, {%x;u,v%}, {%y;u,v%}, {%z;u,v%}, {%x;v,v%}, {%y;v,v%}, {%z;v,v%});\n\
    return mat3({%x%}, {%y%}, {%z%}, {%x;u%}, {%y;u%}, {%z;u%}, {%x;v%}, {%y;v%}, {%z;v%});\n\
}"
        ],
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };

    let funs = [
        CodeGenerator.langs.glsl.presets.paramsurf_compact.fun,
        CodeGenerator.langs.glsl.presets.paramsurfg_compact.fun,
        CodeGenerator.langs.glsl.presets.paramsurfh_compact.fun,
    ];
    for (var fi = 0; fi < 3; fi++) {
        let fun = funs[fi];
        for (var ci = 0; ci < 4; ci++) {
            for (var vi = 0; vi < 2; vi++) {
                if (ci == 0 && vi == 0)
                    continue;
                let src = fun[0];
                if (vi == 1) src = src
                    .replaceAll('{%x', "{%val[0]")
                    .replaceAll('{%y', "{%val[1]")
                    .replaceAll('{%z', "{%val[2]");
                if (ci > 0) {
                    let cs = ['rgb', 'hsv', 'hsl'][ci-1];
                    src = "#define CUSTOM_COLOR "+cs+"2rgb\n\
vec3 {%funname%}Color(float u, float v) {\n\
    float {%funbody%};\n\
    return vec3({%c[0]%},{%c[1]%},{%c[2]%});\n\
}\n".replaceAll("{%c[", "{%c_"+cs+"[") + src;
                }
                fun.push(src);
            }
        }
    }
}


document.body.onload = function (event) {
    console.log("onload");

    // init built-in functions
    initBuiltInFunctions(builtinFunctions);
    IntervalConfig.defaultX0 = 0.0;
    IntervalConfig.defaultX1 = 1.0;

    // init parser
    BuiltInMathFunctions.initMathFunctions(
        BuiltInMathFunctions.rawMathFunctionsShared
            .concat(BuiltInMathFunctions.rawMathFunctionsR)
    );
    MathParser.IndependentVariables = {
        'u': "u",
        'v': "v"
    };
    MathParser.DependentVariables = {
        'val': { type: 'vec3' },
        'c_rgb': { type: 'vec3' },
        'c_hsv': { type: 'vec3' },
        'c_hsl': { type: 'vec3' },
    };
    for (var ci = 0; ci < 4; ci++) {
        for (var vi = 0; vi < 2; vi++) {
            let vars = vi == 1 ? { 'val': true } :
                { x: true, y : true, z : true };
            if (ci > 0)
                vars[['c_rgb', 'c_hsv', 'c_hsl'][ci-1]] = true;
            MathParser.DependentVariables[2*ci+vi] = vars;
        }
    }

    // init code generator
    initLangpack();
    var updateLangpack = function() {
        let c = document.getElementById("select-color").value;
        c = [0, 0, 1, 1, 2][Number(c)];
        let v = document.getElementById("checkbox-autodiff").checked;
        if (!v) c = 0;
        CodeGenerator.langs.glsl.config = CodeGenerator.langs.glsl.presets
            ['paramsurf' + ['','g','h'][c] + '_compact'];
    }
    updateLangpack();
    UpdateFunctionInputConfig.callbackBefore = updateLangpack;

    // init parameters
    initParameters([
        new GraphingParameter("sQuality", "select-quality"),
        new GraphingParameter("bLight", "checkbox-light"),
        new GraphingParameter("bYup", "checkbox-yup"),
        new GraphingParameter("sGrid", "select-grid"),
        new GraphingParameter("sColor", "select-color"),
        new GraphingParameter("bAutodiff", "checkbox-autodiff"),
        new GraphingParameter("bXray", "checkbox-xray"),
        // new GraphingParameter("bDiscontinuity", "checkbox-discontinuity"),
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
        new UniformSlider("rTheta", "slider-theta", -0.5 * Math.PI, 1.5 * Math.PI, Math.PI / 6.0),
        new UniformSlider("rPhi", "slider-phi", 0, Math.PI, Math.PI / 6.0),
    ]);
    UpdateFunctionInputConfig.complexMode = false;
    UpdateFunctionInputConfig.implicitMode = false;
    UpdateFunctionInputConfig.enableMain = false;
    UpdateFunctionInputConfig.warnNaN = true;

    // init viewport
    resetState({
        rz: -0.9 * Math.PI,
        rx: -0.4 * Math.PI,
        scale: 0.5
    }, false);

    // main
    initMain([
        "../shaders/vert-pixel.glsl",
        "../shaders/frag-pool.glsl",
        "vert.glsl",
        "frag.glsl",
        "../shaders/frag-imggrad.glsl",
        "../shaders/frag-aa.glsl",
        "../shaders/complex-zeta.glsl",
        "../shaders/complex.glsl",
    ]);
};
