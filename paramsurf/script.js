// 3D Implicit Surface Grapher

const NAME = "spirula.paramsurf.";

const builtinFunctions = [
    ["Unit Sphere", "x=cos(2piu)sin(piv);y=sin(2piu)sin(piv);z=cos(piv)"],
    ["Bouquet", "r=(2-sin(piv^2))cos(5piu)^2sin(5piv);x=rcos(2piu)sin(piv);y=rsin(2piu)sin(piv);z=-rcos(piv)"],
    ["Torus", "r=0.5+0.05pow(1-pow((sin(10piv)-0.5sin(32piu))/1.5,2),20);x=cos(2piu)(1+rcos(2piv));y=sin(2piu)(1+rcos(2piv));z=rsin(2piv)"],
    ["Flower", "r(u)=0.5asin(0.99sin(10piu))+0.4;x=r(u)cos(2piu)(2+0.2r(u)^2cos(2piv));y=r(u)sin(2piu)(2+0.2r(u)^2cos(2piv));z=0.3|r(u)|^0.5sin(2piv)"],
    ["Conch 1", "n=1+0.02exp(sin(40piln(v)+10piu));x=v^2.2sin(4piln(v))(0.95+cos(2piu))n;y=v^2.2cos(4piln(v))(0.95+cos(2piu))n;z=v^2.2(sin(2piu)n-1.5)+1"],
    ["Conch 2", "t=1-|ln(u)|^3;n=0.005ucos(100piv)+0.015exp(1.5sin(8pit));c1=cos(2piv)+.2sin(2piv)*sin(2piv);c2=-1.3*sin(2piv)+cos(2piv)*cos(2piv);b=.37;r=(1+n)(.5+.8*c1+.3*c2)/(.7+.7e^-.4z);x=exp(bt)rsin(pi*t);y=exp(bt)rcos(pi*t);z=exp(bt)(2.5*(exp(-bt)-1)+.8c2-.2*c1)"],
    ["Conch 3", "n=1+0.015exp(sin(40piln(v)+10piu));x=v^2.2sin(4piln(v))(0.95+cos(2piu))n&#32;0.9e^(0.5z);y=v^2.2cos(4piln(v))(0.95+cos(2piu))n&#32;0.9e^(0.5z);z=v^2.2(1.5sin(2piu)n-2)+1"],
    ["Conch 4", "n=1+cos(piu)^2(exp(8cos(20piln(v))-9.6)+0.01exp(sin(105piln(v));k=0.7;s=0.5;x=sv^ksin(4piln(v))(0.95+cos(2piu))n;y=sv^kcos(4piln(v))(0.95+cos(2piu))n;z=sv^k(sin(2piu)n-6)+3.5s"],
    ["Trefoil", "y=sin(6piu)/(4+2cos(2piv));x=-(cos(2piu)-2cos(4piu))(2+cos(2piv))(2+cos(2piv+2pi/3))/16;z=-(sin(2piu)+2sin(4piu))/(4+2cos(2piv+2pi/3))"],
    ["Arc Clam", "c1=1.4u^1.5(1+0.01sin(60piv))sin(piv);c2=2u^1.5(1+0.01sin(60piv))(1-.2exp(-10sin(piv)))u^1.5(-cos(piv)+0.2cos(3piv)-0.1sin(2piv)+0.2sin(piv));x=(1+0.05u^2-exp(-5u))^2cos(2piu)c1-0.5;z=-sin(2piu)c1;y=(2u-1.4u^2)c2"],
    ["Jellyfish", "r=(v(1-v)+sin(piv))(1+0.05(1-v^2)exp(2sin(48piu))+0.1sin(7piu));x=cos(2piu)r;z=sin(2piu)r;y=1-cos(piv)-4v(1-v)sin(iTime(0))^2-0.5/(1-v)^0.5"],
    ["Parametric Curve", "x0(t)=t(cos(4pit)-cos(4pit)cos(60pit);y0(t)=t(sin(4pit)-sin(4pit)cos(60pit);z0(t)=t(sin(60pit)-1)+0.5;h=0.005;x1(t)=(x0(t+h)-x0(t-h))/(2h);y1(t)=(y0(t+h)-y0(t-h))/(2h);z1(t)=(z0(t+h)-z0(t-h))/(2h);x2(t)=(x0(t+h)+x0(t-h)-2x0(t))/h^2;y2(t)=(y0(t+h)+y0(t-h)-2y0(t))/h^2;z2(t)=(z0(t+h)+z0(t-h)-2z0(t))/h^2;l2(t)=hypot(x2(t),y2(t),z2(t));x3(t)=y1(t)z2(t)-y2(t)z1(t);y3(t)=z1(t)x2(t)-z2(t)x1(t);z3(t)=x1(t)y2(t)-x2(t)y1(t);l3(t)=hypot(x3(t),y3(t),z3(t));r=0.025;x=x0(u)+r(x2(u)/l2(u)cos(2piv)+x3(u)/l3(u)sin(2piv));y=y0(u)+r(y2(u)/l2(u)cos(2piv)+y3(u)/l3(u)sin(2piv));z=z0(u)+r(z2(u)/l2(u)cos(2piv)+z3(u)/l3(u)sin(2piv))"],
];


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
        'x': true,
        'y': true,
        'z': true
    };

    // init parameters
    initParameters([
        new GraphingParameter("sQuality", "select-quality"),
        new GraphingParameter("bLight", "checkbox-light"),
        new GraphingParameter("bYup", "checkbox-yup"),
        new GraphingParameter("sGrid", "select-grid"),
        new GraphingParameter("sColor", "select-color"),
        // new GraphingParameter("bTransparency", "checkbox-transparency"),
        // new GraphingParameter("bDiscontinuity", "checkbox-discontinuity"),
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
        new UniformSlider("rTheta", "slider-theta", -0.5 * Math.PI, 1.5 * Math.PI, Math.PI / 6.0),
        new UniformSlider("rPhi", "slider-phi", 0, Math.PI, Math.PI / 6.0),
    ]);
    UpdateFunctionInputConfig.complexMode = false;
    UpdateFunctionInputConfig.implicitMode = false;
    UpdateFunctionInputConfig.valMode = false;
    UpdateFunctionInputConfig.warnNaN = true;
    UpdateFunctionInputConfig.warnNumerical = false;

    // config code generator
    CodeGenerator.langs.glsl.fun = "vec3 {%funname%}(float u, float v) {\n\
{%funbody%}\n\
    return vec3({%x%}, {%y%}, {%z%});\n\
}";

    // init viewport
    resetState({
        rz: -0.9 * Math.PI,
        rx: -0.4 * Math.PI,
        scale: 0.5
    }, false);

    // main
    initMain([
        "../shaders/vert-pixel.glsl",
        "../shaders/functions.glsl",
        "../shaders/frag-pool.glsl",
        "vert.glsl",
        "frag.glsl",
        "../shaders/frag-imggrad.glsl",
        "../shaders/frag-aa.glsl"
    ]);
};
