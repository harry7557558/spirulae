// 3D Implicit Surface Grapher

const builtinFunctions = [
    ["A6 Heart", "(x^2+9/4*y^2+z^2-1)^3=(x^2+9/80*y^2)*z^3"],
    ["A6 Fox", "2(x^2+2y^2+z^2)^3-2(9x^2+y^2)z^3=1"],
    ["A5 Star", "4(x^2+2y^2+z^2-1)^2-z(5x^4-10x^2z^2+z^4)=1"],
    ["A7 Genus 2", "2y(y^2-3x^2)(1-z^2)+(x^2+y^2)^2-(9z^2-1)(1-z^2)"],
    ["A4 Goursat", "2(x^4+y^4+z^4)-3(x^2+y^2+z^2)+2"],
    ["A4 Genus 3", "(x^2-1)^2+(y^2-1)^2+(z^2-1)^2+4(x^2y^2+x^2z^2+y^2z^2)+8xyz-2(x^2+y^2+z^2)"],
    ["A6 Spiky 1", "(x^2+y^2+z^2-2)^3+2000(x^2y^2+x^2z^2+y^2z^2)=10"],
    ["A6 Spiky 2", "z^6-5(x^2+y^2)z^4+5(x^2+y^2)^2z^2+2(5x^4-10x^2y^2+y^4)yz-1.002(x^2+y^2+z^2)^3+0.2"],
    ["A6 Barth", "4(x^2-y^2)(y^2-z^2)(z^2-x^2)-3(x^2+y^2+z^2-1)^2"],
    ["A3 Ding-Dong", "x^2+y^2=(1-z)z^2"],
    ['A3 Bridge', "x^2+y^2z+z^2=0.01"],
    ["Radical Heart", "x^2+4y^2+(1.15z-0.6(2(x^2+.05y^2+.001)^0.7+y^2)^0.3+0.3)^2=1"],
    ["Ln Wineglass", "x^2+y^2-ln(z+1)^2-0.02"],
    ["Spheres", "(sin(2x)sin(2y)sin(2z)-0.9)e^(x+y)"],
    ["Noisy Sphere", "x^2+y^2+z^2=1+0.1sin(10x)sin(10y)sin(10z)"],
    ["Noisy Octahedron", "abs(x)+abs(y)+abs(z)-1+0.7cos(10x)cos(10y)cos(10z)"],
    ["Noisy Peanut", "1/((x-1)^2+y^2+z^2)+1/((x+1)^2+y^2+z^2)-1.4-0.02(cos(30x)+cos(30y)cos(30z))"],
    ["Sin Terrace", "z=0.25round(4sin(x)sin(y))"],
    ["Tan Cells", "z=1/((tan(x)tan(y))^2+1)-1/2"],
    ["Tan Forest", "z=.2tan(asin(cos(5x)cos(5y)))+.5sin(10z)"],
    ["Sine Field", "z=100sin(x-sqrt(x^2+y^2))^8sin(y+sqrt(x^2+y^2)-z)^8/(x^2+y^2+50)"],
    ["Sine Tower", "4z+6=1/((sin(4x)sin(4y))^2+0.4sqrt(x^2+y^2+0.005z^2))-4sin(8z)"],
    ["Atan2 Drill", "max(cos(atan(y,x)-20e^((z-1)/4)),x^2+y^2+z/2-1)"],
    ["Atan2 Donut", "(x^2+y^2+z^2+0.9)^2-4(x^2+z^2)=0.1asin(0.9sin(5atan(z,x)+40y))"],
    ["Atan2 Flower", "a=atan2(z,x)+1.571;(x^2+z^2)^2+16y^2=2(x^2+z^2)(sin(2.5a)^2+0.5sin(10a)^2)"],
    ["Log2 Spheres", "m=max(|x|,|y|,|z|);k=3/2-m;n=ceil(log(2,k))-2;(3*2^n-k)^2+(x^2+y^2+z^2-m^2)=4^n"],
    ["Lerp Example", "lerp(max(|x|,|y|,|z|),sqrt(x^2+y^2+z^2),-1)-0.3"],
    ["If Example", "#&#32;warn&#32;that&#32;`if`&#32;can&#32;be&#32;slower&#32;than&#32;`min/max/abs`;z=if(sin(2x),1/5sin(2y),1/2cos(2y))"],
    ["Eyes 1", "n=3ln((x^2+z^2)/(|x|+0.01));sqrt(x^2+z^2)sin(n)^2=10y^2+x^2+0.5z^2-0.3z"],
    ["Eyes 2", "a=3(z+x+1);b=3(z-x+1);sin(min(a*sin(b),b*sin(a)))-cos(max(a*cos(b),b*cos(a)))=(3-2z)/9+((2x^2+z^2)/6)^3+100y^2"],
    ["Spiral 1", "k=0.14;r=1/k*ln(sqrt(x^2+y^2));10((k(xcos(r)+ysin(r))-0.5^2(x^2+y^2))^2+z^2)=x^2+y^2"],
    ["Spiral 2", "k=0.3;r=1/k*ln(sqrt(x^2+y^2));(k*(xcos(r)+ysin(r)))^2+z^2=0.1tanh(x^2+y^2+0.3)-0.01(x^2+y^2)"],
    ["Spiral 3", "k=0.14;r=sqrt(x^2+y^2+0.01^2);r1=1/k*ln(r);10((k(xcos(r1)+ysin(r1))-(0.5r)^2)^2+((z+0.5r-0.5)(r^2+0.1))^2)=r^2"],
    ["Atan2 Spiral", "k=0.15&#32;#&#32;r=e^kt;p=3.1415926&#32;#&#32;pi;#&#32;polar&#32;coordinates;r=2sqrt(x^2+y^2);a=atan(y,x);#&#32;index&#32;of&#32;spiral&#32;layer;n=min((log(r)/k-a)/(2p),1);#&#32;distance&#32;to&#32;logarithmic&#32;spiral;d(n)=abs(e^(k*(2pn+a))-r);d1=min(d(floor(n)),d(ceil(n)));sqrt(d1^2+4z^2)=0.4r^0.7(1+0.01sin(40a))"],
    ["Atomic Orbitals", "r2(x,y,z)=x^2+y^2+z^2;r(x,y,z)=sqrt(r2(x,y,z));x1(x,y,z)=x/r(x,y,z);y1(x,y,z)=y/r(x,y,z);z1(x,y,z)=z/r(x,y,z);d(r0,x,y,z)=r0^2-r2(x,y,z);r00(x,y,z)=d(0.28,x,y,z);r10(x,y,z)=d(-0.49y1(x,y,z),x,y,z);r11(x,y,z)=d(0.49z1(x,y,z),x,y,z);r12(x,y,z)=d(-0.49x1(x,y,z),x,y,z);r20(x,y,z)=d(1.09x1(x,y,z)y1(x,y,z),x,y,z);r21(x,y,z)=d(-1.09y1(x,y,z)z1(x,y,z),x,y,z);r22(x,y,z)=d(0.32(3z1(x,y,z)^2-1),x,y,z);r23(x,y,z)=d(-1.09x1(x,y,z)z1(x,y,z),x,y,z);r24(x,y,z)=d(0.55(x1(x,y,z)^2-y1(x,y,z)^2),x,y,z);max(r00(x,y,z-1.5),r10(x+1,y,z-0.4),r11(x,y,z-0.4),r12(x-1,y,z-0.4),r20(x+2,y,z+1),r21(x+1,y,z+1),r22(x,y,z+1),r23(x-1,y,z+1),r24(x-2,y,z+1))"],
    ["Value Noise", "h(x,y)=fract(126sin(12x+33y+98))-0.5;s(x)=3x^2-2x^3;v00=h(floor(x),floor(y));v01=h(floor(x),floor(y)+1);v10=h(floor(x)+1,floor(y));v11=h(floor(x)+1,floor(y)+1);f(x,y)=mix(mix(v00,v01,s(fract(y))),mix(v10,v11,s(fract(y))),s(fract(x)));v(x,y)=f(x,y)+f(2x,2y)/2+f(4x,4y)/4+f(8x,8y)/8+f(16x,16y)/16;z=ln(1+exp(40(v(x,y)-(0.05(x^2+y^2))^2)))/40"],
    ["Fractal Roots", "u(x,y)=x^2-y^2+z;v(x,y)=2xy;u1(x,y)=u(u(x,y)+x,v(x,y)+y);v1(x,y)=v(u(x,y)+x,v(x,y)+y);u2(x,y)=u(u1(x,y)+x,v1(x,y)+y);v2(x,y)=v(u1(x,y)+x,v1(x,y)+y);log(u2(x,y)^2+v2(x,y)^2)=0"],
    ["Spiky Fractal", "u(x,y,z)=yz;v(x,y,z)=xz;w(x,y,z)=xy;u1(x,y,z)=u(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);v1(x,y,z)=v(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);w1(x,y,z)=w(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);u2(x,y,z)=u(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);v2(x,y,z)=v(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);w2(x,y,z)=w(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);u3(x,y,z)=u(u2(x,y,z)+x,v2(x,y,z)+y,w2(x,y,z)+z);v3(x,y,z)=v(u2(x,y,z)+x,v2(x,y,z)+y,w2(x,y,z)+z);w3(x,y,z)=w(u2(x,y,z)+x,v2(x,y,z)+y,w2(x,y,z)+z);log(u3(x,y,z)^2+v3(x,y,z)^2+w3(x,y,z)^2)=log(0.01)"],
    ["Mandelbrot", "u(x,y)=x^2-y^2;v(x,y)=2xy;u1(x,y)=u(u(x,y)+x,v(x,y)+y);v1(x,y)=v(u(x,y)+x,v(x,y)+y);u2(x,y)=u(u1(x,y)+x,v1(x,y)+y);v2(x,y)=v(u1(x,y)+x,v1(x,y)+y);u3(x,y)=u(u2(x,y)+x,v2(x,y)+y);v3(x,y)=v(u2(x,y)+x,v2(x,y)+y);u4(x,y)=u(u3(x,y)+x,v3(x,y)+y);v4(x,y)=v(u3(x,y)+x,v3(x,y)+y;u5(x,y)=u(u4(x,y)+x,v4(x,y)+y);v5(x,y)=v(u4(x,y)+x,v4(x,y)+y);u6(x,y)=u(u5(x,y)+x,v5(x,y)+y);v6(x,y)=v(u5(x,y)+x,v5(x,y)+y);log(u6(x-1/2,sqrt(y^2+z^2))^2+v6(x-1/2,sqrt(y^2+z^2))^2)=0"],
    ["Burning Ship", "u(x,y)=x^2-y^2;v(x,y)=2abs(xy);u1(x,y)=u(u(x,y)+x,v(x,y)+y);v1(x,y)=v(u(x,y)+x,v(x,y)+y);u2(x,y)=u(u1(x,y)+x,v1(x,y)+y);v2(x,y)=v(u1(x,y)+x,v1(x,y)+y);u3(x,y)=u(u2(x,y)+x,v2(x,y)+y);v3(x,y)=v(u2(x,y)+x,v2(x,y)+y);u4(x,y)=u(u3(x,y)+x,v3(x,y)+y);v4(x,y)=v(u3(x,y)+x,v3(x,y)+y;u5(x,y)=u(u4(x,y)+x,v4(x,y)+y);v5(x,y)=v(u4(x,y)+x,v4(x,y)+y);u6(x,y)=u(u5(x,y)+x,v5(x,y)+y);v6(x,y)=v(u5(x,y)+x,v5(x,y)+y);z=(u6((x-1)/1.5,(y-1/2)/1.5)^2+v6((x-1)/1.5,(y-1/2)/1.5)^2)^-0.1-1"],
    ["Mandelbulb", "n=8;r=sqrt(x^2+y^2+z^2);a=atan(y,x);b=atan(sqrt(x^2+y^2),z);u(x,y,z)=r^n*sin(nb)cos(na);v(x,y,z)=r^n*sin(nb)sin(na);w(x,y,z)=r^n*cos(nb);u1(x,y,z)=u(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);v1(x,y,z)=v(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);w1(x,y,z)=w(u(x,y,z)+x,v(x,y,z)+y,w(x,y,z)+z);u2(x,y,z)=u(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);v2(x,y,z)=v(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);w2(x,y,z)=w(u1(x,y,z)+x,v1(x,y,z)+y,w1(x,y,z)+z);log(u2(x/2,y/2,z/2)^2+v2(x/2,y/2,z/2)^2+w2(x/2,y/2,z/2)^2)=0"],
    ["Ice Cream", "#&#32;cylindrical&#32;coordinates;r=sqrt(x^2+y^2);a=atan(y,x);#&#32;ice&#32;cream;n1=0.2r*asin(sin(5a+5z));c(x,y,z)=r^2+(z+r)^2-1.1+n1;#&#32;holder;p(z)=min(max(z,0.15z),0.1z+0.15);n2=0.01min(r^4,1)*min(sin(40a),sin(40z));h(x,y,z)=max(|max(r-1-p(z-0.8),-1-z)|-0.05,z-1.5)+n2;#&#32;union;u(x,y,z)=min(c(x,y,z-2),5h(x,y,z+0.8));1/1.5&#32;u(1.5x,1.5y,1.5z+0.3)=0"],
    ["Conch Shell", "p=3.1415926&#32;#&#32;pi;a_o=0.16*p&#32;#&#32;half&#32;of&#32;opening&#32;angle;b=0.6&#32;#&#32;r=e^bt;s_min(a,b,k)=-1/k*ln(e^-ka+e^-kb)&#32;#&#32;smoothed&#32;minimum;;#&#32;Cross&#32;section;C_m(u,v)=1-(1-0.01e^sin(12p(u+2v)))e^-(5v)^2&#32;&#32;#&#32;mid&#32;rod;C_s(u,v)=(sqrt((u-e^-16v)^2+(v(1-0.2exp(-4sqrt(u^2+0.1^2)))-0.5+0.5e^(-v)sin(4u)+0.2cos(2u)e^-v)^2)-0.55)tanh(5sqrt(2u^2+(v-1.2)^2))+0.01sin(40u)sin(40v)exp(-(u^2+v^2));C0(u,v)=abs(C_s(u,v))C_m(u,v)&#32;#&#32;single&#32;layer;n1(u,v)=log(sqrt(u^2+v^2))/b+2&#32;#&#32;index&#32;of&#32;layer;a1(u,v)=atan(v,u)/a_o&#32;#&#32;opening&#32;angle,&#32;0-1;d1(u,v,s_d)=0.5sqrt(u^2+v^2)*C0(if(n1(u,v),n1(u,v)-s_d,fract(n1(u,v))-s_d),a1(u,v));C(u,v)=min(d1(u,v,0.5),d1(u,v,1.5))&#32;#&#32;cross&#32;section;;#&#32;Spiral;l_p(x,y)=exp(b*atan(y,x)/(2p))&#32;#&#32;a&#32;multiplying&#32;factor;U(x,y,z)=exp(log(-z)+b*atan(y,x)/(2p))&#32;#&#32;xyz&#32;to&#32;cross&#32;section&#32;u;V(x,y,z)=sqrt(x^2+y^2)*l_p(x,y)&#32;#&#32;xyz&#32;to&#32;cross&#32;section&#32;v;S_s(x,y,z)=C(U(x,y,z),V(x,y,z))/l_p(x,y)&#32;#&#32;body;S_o(x,y,z)=sqrt((C(exp(log(-z)-b/2),-x*exp(-b/2))*exp(b/2))^2+y^2)&#32;#&#32;opening;S_t(x,y,z)=d1(-z,sqrt(x^2+y^2),0.5)&#32;#&#32;tip;S_a(x,y,z)=if(-z,min(S_s(x,y,z),S_o(x,y,z)),S_t(x,y,z))&#32;#&#32;body+tip;S0(x,y,z)=S_a(x,y,z)-0.01-0.01(x^2+y^2+z^2)^0.4-0.02sqrt(x^2+y^2)exp(cos(8atan(y,x)))-0.007*(0.5-0.5tanh(10(z+1+8sqrt(3x^2+y^2))))&#32;#&#32;subtract&#32;thickness;S(x,y,z)=-s_min(-S0(x,y,z),z+1.7,10)&#32;#&#32;clip&#32;bottom;r_a=-0.05sin(3z)tanh(2(x^2+y^2-z-1.5))&#32;#&#32;distortion;S(0.4(x-r_a*y),0.4(y+r_a*x),0.4z-0.7)=0"]
];

function texPreviewPositionDelta(dx = 0, dy = 0) {
    let container = document.querySelector("#mathjax-preview");
    var left = Number(container.style.left.replace(/px$/, '')) + dx;
    var top = Number(container.style.top.replace(/px$/, '')) + dy;
    var minLeft = Math.min(0, window.innerWidth - container.clientWidth);
    var maxRight = Math.max(window.innerWidth, container.clientWidth);
    var minTop = Math.min(0, window.innerHeight - container.clientHeight);
    var maxBottom = Math.max(window.innerHeight, container.clientHeight);
    left = Math.max(minLeft, Math.min(left, maxRight - container.clientWidth));
    top = Math.max(minTop, Math.min(top, maxBottom - container.clientHeight));
    container.style.left = left + "px";
    container.style.top = top + "px";
}
async function initMathjax() {
    let container = document.querySelector("#mathjax-preview");
    var mousePos = [-1, -1];
    var left = 0.2 * window.innerWidth - 200;
    var top = 0.8 * window.innerHeight - 20;
    texPreviewPositionDelta(left, top);
    container.addEventListener("pointerdown", function (event) {
        container.setPointerCapture(event.pointerId);
        mousePos = [event.clientX, event.clientY];
    });
    container.addEventListener("pointerup", function (event) {
        mousePos = [-1, -1];
    });
    container.addEventListener("pointermove", function (event) {
        if (mousePos[0] >= 0) {
            texPreviewPositionDelta(event.clientX - mousePos[0], event.clientY - mousePos[1]);
            mousePos = [event.clientX, event.clientY];
        }
    });
    window.addEventListener("resize", texPreviewPositionDelta);
}
function updateLatex(latexList, color) {
    let texContainer = document.getElementById("mathjax-preview");
    texContainer.innerHTML = "";
    texContainer.style.color = color;
    for (var i = 0; i < latexList.length; i++) {
        var container = document.createElement("div");
        var line = document.createElement("span");
        line.textContent = "$\\displaystyle{" + latexList[i] + "}$";
        line.innerHTML += "<!--" + latexList[i] + "-->";
        container.appendChild(line);
        texContainer.appendChild(container);
    }
    try {
        MathJax.typeset();
        texPreviewPositionDelta(0, 0);
    } catch (e) {
        console.error(e);
    }
}

document.body.onload = function (event) {
    console.log("onload");
    var glsl = {};
    let checkboxLight = document.querySelector("#checkbox-light");
    let checkboxYup = document.querySelector("#checkbox-yup");
    let checkboxGrid = document.querySelector("#checkbox-grid");
    let checkboxTransparency = document.querySelector("#checkbox-transparency");
    let checkboxDiscontinuity = document.querySelector("#checkbox-discontinuity");
    let selectStep = document.querySelector("#select-step");
    let selectColor = document.querySelector("#select-color");
    let checkboxLatex = document.getElementById("checkbox-latex");
    let checkboxAutoCompile = document.getElementById("checkbox-auto-compile");
    let buttonUpdate = document.getElementById("button-update");
    function getParams() {
        return {
            sStep: selectStep.value,
            sColor: selectColor.selectedIndex,
            bLight: checkboxLight.checked,
            bYup: checkboxYup.checked,
            bGrid: checkboxGrid.checked,
            bTransparency: checkboxTransparency.checked,
            bDiscontinuity: checkboxDiscontinuity.checked,
            cLatex: checkboxLatex.checked,
            cAutoCompile: checkboxAutoCompile.checked,
        }
    }
    function setParams(params) {
        selectStep.value = params.sStep;
        selectColor.selectedIndex = params.sColor;
        checkboxLight.checked = params.bLight;
        checkboxYup.checked = params.bYup;
        checkboxGrid.checked = params.bGrid;
        checkboxTransparency.checked = params.bTransparency;
        checkboxDiscontinuity.checked = params.bDiscontinuity;
        checkboxLatex.checked = params.cLatex;
        checkboxAutoCompile.checked = params.cAutoCompile;
    }

    // init parameters
    try {
        var params = JSON.parse(localStorage.getItem("spirula.implicit3.params"));
        if (params != null) setParams(params);
    }
    catch (e) { console.error(e); }

    // init functions
    let select = document.querySelector("#builtin-functions");
    let input = document.querySelector("#equation-input");
    select.innerHTML += "<option value=''>Load example...</option>";
    for (var i = 0; i < builtinFunctions.length; i++) {
        let fun = builtinFunctions[i];
        select.innerHTML += "<option value=" + fun[1] + ">" + fun[0] + "</option>"
    }
    var initialExpr = "";
    try {
        initialExpr = localStorage.getItem("spirula.implicit3.input");
        if (initialExpr == null) throw initialExpr;
        select.childNodes[0].setAttribute("value", initialExpr);
        var selectId = 0;
        for (var i = 1; i < select.childNodes.length; i++) {
            var value = select.childNodes[i].value.replace(/\;/g, '\n');
            if (value == initialExpr.trim())
                selectId = i;
        }
        select.childNodes[selectId].selected = true;
    }
    catch (e) {
        select.childNodes[1].selected = true;
    }

    // called when update function
    function updateFunctionInput(forceRecompile) {
        let errorMessage = document.querySelector("#error-message");
        let texContainer = document.getElementById("mathjax-preview");
        if (!checkboxLatex.checked) texContainer.innerHTML = "";
        var expr = input.value;
        try {
            localStorage.setItem("spirula.implicit3.input", expr);
            localStorage.setItem("spirula.implicit3.params", JSON.stringify(getParams()));
        } catch (e) { console.error(e); }

        // parse input
        var parsed = null;
        try {
            parsed = parseInput(expr);
            var errmsg = "";
            if (parsed.postfix.length == 0) errmsg = "No function to graph.";
            if (parsed.postfix.length > 1) errmsg = "Multiple main equations found.";
            parsed.postfix.push([]);
            parsed.postfix = parsed.postfix[0];
            var extraVariables = getVariables(parsed.postfix, true);
            extraVariables.delete('e');
            if (extraVariables.size != 0) errmsg = "Definition not found: " + Array.from(extraVariables);
            if (errmsg != "") {
                errorMessage.style.display = "inline-block";
                errorMessage.style.color = "red";
                errorMessage.innerHTML = errmsg;
                updateShaderFunction(null, null);
                if (checkboxLatex.checked)
                    updateLatex(parsed.latex, "white");
                return;
            }
            if (checkboxLatex.checked)
                updateLatex(parsed.latex, "white");
        }
        catch (e) {
            console.error(e);
            errorMessage.style.display = "inline-block";
            errorMessage.style.color = "red";
            errorMessage.innerHTML = e;
            updateShaderFunction(null, null);
            if (parsed != null && checkboxLatex.checked)
                updateLatex(parsed.latex, "red");
            return;
        }

        // compile shader
        if (!(checkboxAutoCompile.checked || forceRecompile === true)) {
            errorMessage.style.display = "inline-block";
            errorMessage.style.color = "white";
            errorMessage.innerHTML = "Parameter(s) have been changed. Click \"update\" to recompile shader.";
            return;
        }
        try {
            errorMessage.style.display = "none";
            if (checkboxLatex.checked)
                updateLatex(parsed.latex, "white");
            glsl = postfixToGlsl(parsed.postfix);
            console.log(glsl.glsl);
            if (!glsl.isCompatible) {
                errorMessage.style.display = "inline-block";
                errorMessage.style.color = "orange";
                errorMessage.innerHTML = "Graph may be incorrect on some devices.";
            }
            updateShaderFunction(glsl.glsl, glsl.glslgrad, getParams());
        } catch (e) {
            console.error(e);
            errorMessage.style.display = "inline-block";
            errorMessage.style.color = "red";
            errorMessage.innerHTML = e;
            updateShaderFunction(null, null);
            if (checkboxLatex.checked)
                updateLatex(parsed.latex, "red");
        }
    }

    buttonUpdate.addEventListener("click", function () { updateFunctionInput(true); });
    checkboxLight.addEventListener("input", updateFunctionInput);
    checkboxLatex.addEventListener("input", updateFunctionInput);
    checkboxAutoCompile.addEventListener("input", updateFunctionInput);
    checkboxYup.addEventListener("input", updateFunctionInput);
    checkboxGrid.addEventListener("input", updateFunctionInput);
    checkboxTransparency.addEventListener("input", updateFunctionInput);
    checkboxDiscontinuity.addEventListener("input", updateFunctionInput);
    selectStep.addEventListener("input", updateFunctionInput);
    selectColor.addEventListener("input", updateFunctionInput);
    select.addEventListener("input", function (event) {
        resetState();
        input.value = select.value.replaceAll(";", "\n");
        updateFunctionInput(true);
    });
    input.addEventListener("input", function (event) {
        select.value = initialExpr;
        updateFunctionInput();
    });
    window.addEventListener("keydown", function (event) {
        if (event.keyCode == 13 && (event.altKey || event.ctrlKey)) {
            event.preventDefault();
            updateFunctionInput(true);
        }
        else if (event.keyCode == 191 && event.ctrlKey) {
            let control = document.getElementById("control");
            let fps = document.getElementById("fps");
            if (control.style.display == "none")
                fps.style.display = control.style.display = "block";
            else fps.style.display = control.style.display = "none";
        }
    });
    input.value = select.value.replaceAll(";", "\n");

    // main
    try {
        initWebGL();
        updateFunctionInput(true);
        initRenderer();
    } catch (e) {
        console.error(e);
        document.body.innerHTML = "<h1 style='color:red;'>" + e + "</h1>";
    }
    initMathjax();
};