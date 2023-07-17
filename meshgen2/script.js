// 3D Implicit Surface Grapher

const NAME = "spirulae.meshgen2.";

// a lot of these are from the Desmos Discord server
// https://discord.gg/hNtrWCTwwa
const builtinFunctions = [
    // ["Circle", "x^2+y^2-1"],
    ["A6 Heart", "(x^2+y^2-1)^3=2x^2y^3"],
    ["Radical Heart", "x^2+(1.3y-sqrt(|x|))^2=1"],
    ["Tooth", "2x^3(x-2)+2x+y^3(y-2)"],
    ["Quatrefoil", "sin(6atan(y,x))-4xy"],
    ["Hyperbolic Plane", "sin(4x/(x^2+y^2))sin(4y/(x^2+y^2))=0"],
    ["Rounded Square", "max(|x|,|y|,x^3-y^3)=1"],
    ["Flower 1", "sqrt(x^2+y^2)=0.7+0.3arcsin(sin(5atan2(y,x)))"],
    ["Flower 2", "r=sqrt(x^2+y^2);a=atan2(y,x);6r=7-3sin(5/2a)^10-5sin(5a)^10"],
    ["Swirl", "r=15root(4,x^2+y^2);xsin(r)+ycos(r)=0.75(x^2+y^2)"],
    ["Wave", "f(x,y)=-xcos(hypot(x,y))-ysin(hypot(x,y))+1-exp(-y-1);f(2x-1,2y)"],
    ["Star 6", "(x^2+y^2)(1+10sin(3atan(x,y))^2)=2"],
    ["Evil 13", "r=sqrt(x^2+y^2);5-2|sin(13/2atan(y,x)-sin(10r))|=4sqrt(r)"],
    ["Abs Spam", "|(|(|x|+|y|)|-2|(|x|-|y|)|+|(|y-x|+|y+x|)-.8|)-.4|=.15"],
    ["Swirls", "x1=3(x+3);y1=3(y+4);cos(hypot(y1sin(x1),x1cos(y1))-atan(y1sin(x1),x1cos(y1)))"],
    ["Puzzle Pieces", "sin(6x)+sin(6y)=(sin(12x)+cos(6y))sin(12y)"],
    ["Tangent", "(y-tan(2x))tan(y)"],
    ["Grid", "cos(10x)cos(10y)=0.7"],
    ["Mesh", "min(cos(10x-cos(5y)),cos(10y+cos(5x)))+0.5"],
    ["Eyes", "a=3(y+x+1);b=3(y-x+1);sin(min(a*sin(b),b*sin(a)))-cos(max(a*cos(b),b*cos(a)))=(3-2y)/9+((2x^2+y^2)/6)^3"],
    ["Fractal Sine", "sin(x)sin(y)+sin(2x)sin(2y)/2+sin(4x)sin(4y)/3+sin(8x)sin(8y)/4+sin(17x)sin(16y)/5+sin(32x)sin(32y)/6"],
    ["Mandelbrot Set", "u(x,y)=x^2-y^2;v(x,y)=2xy;u1(x,y)=u(u(x,y)+x,v(x,y)+y);v1(x,y)=v(u(x,y)+x,v(x,y)+y);u2(x,y)=u(u1(x,y)+x,v1(x,y)+y);v2(x,y)=v(u1(x,y)+x,v1(x,y)+y);u3(x,y)=u(u2(x,y)+x,v2(x,y)+y);v3(x,y)=v(u2(x,y)+x,v2(x,y)+y);u4(x,y)=u(u3(x,y)+x,v3(x,y)+y);v4(x,y)=v(u3(x,y)+x,v3(x,y)+y;u5(x,y)=u(u4(x,y)+x,v4(x,y)+y);v5(x,y)=v(u4(x,y)+x,v4(x,y)+y);u6(x,y)=u(u5(x,y)+x,v5(x,y)+y);v6(x,y)=v(u5(x,y)+x,v5(x,y)+y);sin(log(2,log(2,hypot(u6(x-1/2,y),v6(x-1/2,y))+1)))"],
    ["Super Shape", "#&#32;2/7/3/3,&#32;-2/6/5/1,&#32;-4/4/1/2,&#32;1.5/6/4/3;k=2;m=7;n=3;R=3;r=hypot(hypot(x,y)-R,z);a=atan(y,x);b=atan(hypot(x,y)-R,z);u(x,y,z)=cos(ma)(R+r^ksin(nb));v(x,y,z)=sin(ma)(R+r^ksin(nb));w(x,y,z)=r^kcos(nb);u1(x,y,z)=u(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);v1(x,y,z)=v(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);w1(x,y,z)=w(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);u2(x,y,z)=u(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);v2(x,y,z)=v(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);w2(x,y,z)=w(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);T(x,y,z)=log(hypot(u2(x,y,z),v2(x,y,z),w2(x,y,z)));T(x(R+1),y(R+1),0)=R*(e^-k+k-1)/(1+e^-k)"],
];


function initLangpack() {
    CodeGenerator.langs.glsl.presets.implicit2 = {
        fun: "float {%funname%}(float x, float y) {\n\
{%funbody%}\n\
    return {%val%};\n\
}",
        prefix: 'v',
        def: "    float {%varname%} = {%expr%};",
        joiner: "\n"
    };
    CodeGenerator.langs.glsl.presets.implicit2_compact = {
        fun: "float {%funname%}(float x, float y) {\n\
    float {%funbody%};\n\
    return {%val%};\n\
}",
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };
    CodeGenerator.langs.glsl.presets.implicit2g = {
        fun: "vec3 {%funname%}(float x, float y) {\n\
{%funbody%}\n\
    return vec3({%val;x%}, {%val;y%}, {%val%});\n\
}",
        prefix: 'v',
        def: "    float {%varname%} = {%expr%};",
        joiner: "\n"
    };
    CodeGenerator.langs.glsl.presets.implicit2g_compact = {
        fun: "vec3 {%funname%}(float x, float y) {\n\
    float {%funbody%};\n\
    return vec4({%val;x%}, {%val;y%}, {%val%});\n\
}",
        prefix: 'v',
        def: "{%varname%}={%expr%}",
        joiner: ", "
    };
}


document.body.onload = function (event) {
    console.log("onload");

    // init built-in functions
    initBuiltInFunctions(builtinFunctions);

    // init parser
    BuiltInMathFunctions.initMathFunctions(
        BuiltInMathFunctions.rawMathFunctionsShared
            .concat(BuiltInMathFunctions.rawMathFunctionsR)
    );
    MathParser.IndependentVariables = {
        'x': "x",
        'y': "y"
    };

    // init code generator
    initLangpack();
    CodeGenerator.langs.glsl.config = CodeGenerator.langs.glsl.presets.implicit2_compact;

    // init parameters
    initParameters([
        new GraphingParameter("bGrid", "checkbox-edge",
            function(value) {
                Module.ccall('setMeshShowEdges', null, ['number'], [value]);
            }),
        new GraphingParameter("bNormal", "checkbox-normal",
            function(value) {
                Module.ccall('setMeshSmoothShading', null, ['number'], [value]);
            }),
        new GraphingParameter("bClosed", "checkbox-closed",
            function(value) {
                Module.ccall('setMeshBothLeafs', null, ['number'], [value]);
            }),
        new GraphingParameter("cLatex", "checkbox-latex"),
        new GraphingParameter("cAutoUpdate", "checkbox-auto-compile"),
    ]);
    UpdateFunctionInputConfig.complexMode = false;
    UpdateFunctionInputConfig.implicitMode = true;
    UpdateFunctionInputConfig.warnNaN = true;

    // main
    initMain([]);

    // init model export
    ModelExporter.init();
};


window.ModelExporter = {
    assertModelNonempty: function() {
        let isEmpty = Module.ccall('isModelEmpty', 'int', [], []);
        if (isEmpty) {
            alert("Model is empty.");
            return true;
        }
        return false;
    },
    downloadFile: function(ptr, filename, type) {
        let size = Module.ccall('getFileSize', 'int', [], []);
        let resultArray = new Uint8Array(Module.HEAPU8.buffer, ptr, size);
        let resultBuffer = resultArray.slice().buffer;
        console.log(size + " bytes");
        let link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([resultBuffer], { type: type }));
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    },
    downloadSTL: function() {
        if (ModelExporter.assertModelNonempty()) return;
        let ptr = Module.ccall('generateSTL', 'int', [], []);
        ModelExporter.downloadFile(ptr, 'meshgen2.stl', 'model/stl');
    },
    downloadPLY: function() {
        if (ModelExporter.assertModelNonempty()) return;
        let ptr = Module.ccall('generatePLY', 'int', [], []);
        // ModelExporter.downloadFile(ptr, 'meshgen2.ply', 'application/octet-stream');
        ModelExporter.downloadFile(ptr, 'meshgen2.ply', 'model/stl');
    },
    downloadOBJ: function() {
        if (ModelExporter.assertModelNonempty()) return;
        let ptr = Module.ccall('generateOBJ', 'int', [], []);
        ModelExporter.downloadFile(ptr, 'meshgen2.obj', 'model/obj');
    },
    downloadGLB: function() {
        if (ModelExporter.assertModelNonempty()) return;
        let ptr = Module.ccall('generateGLB', 'int', [], []);
        ModelExporter.downloadFile(ptr, 'meshgen2.glb', 'model/gltf-binary');
    },
    init: function() {
        document.getElementById("export-stl").onclick = ModelExporter.downloadSTL;
        document.getElementById("export-ply").onclick = ModelExporter.downloadPLY;
        document.getElementById("export-obj").onclick = ModelExporter.downloadOBJ;
        document.getElementById("export-glb").onclick = ModelExporter.downloadGLB;
    }
};
