// Drag-able MathJax container
// Set the ID of the container to #mathjax-preview
// Call initMathjax() and updateLatex()

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

function setMathjaxDrag() {
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

function initMathjax() {
    window.MathJax = {
        loader: { load: ['[tex]/color'] },
        tex: {
            inlineMath: [['$', '$']],
            packages: { '[+]': ['color'] }
        },
        svg: {
            fontCache: 'global'
        },
        options: { enableMenu: false }
    };
    let mjx = document.createElement("script");
    mjx.id = "MathJax-script";
    mjx.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js";
    mjx.onload = setMathjaxDrag;
    mjx.onerror = function () { alert("Failed to load MathJax."); };
    document.head.appendChild(mjx);
}

function updateLatex(latexList, color) {
    if (MathJax.typeset == undefined) {
        setTimeout(function () {
            updateLatex(latexList, color);
        }, 20);
        return;
    }
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
        texContainer.style.display = null;
        texPreviewPositionDelta(0, 0);
    } catch (e) {
        console.error(e);
    }
}