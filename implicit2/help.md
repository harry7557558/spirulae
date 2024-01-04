<h2>Implicit Curve Grapher</h2>

<h3 style="color:orange">This is a tool created for testing purpose and is not intended to be useful. For more practical ones, please visit <a href="../" style="color:yellow">Spirulae homepage</a>.</h3>

<hr/>

<p>By Harry Chen (harry7557558) - Implicit curve grapher in 2D. This tool isn't indented to be useful. It was created as a member of the Spirulae function grapher series to test 2D viewport and input parsing. You can find cooler function graphers from the series <a href="../implicit3/" title="3D Implicit Surface Grapher">here</a>, <a href="../complex/" title="Complex Domain Coloring Grapher">here</a>, and <a href="../complex3/" title="3D Complex Domain Coloring Grapher">here</a>.</p>

<p>If you insist to use this tool, here is a brief description of it (template copied from other graphers):</p>

<p>This tool draws implicit curves in 2D based on user inputs. Type equations in the input box, or look at some examples. Drag the canvas to move, and scroll to zoom in/out. Reset the viewport by switching to an example and switching back (you may want to back up your input).</p>

<p>For input $f(x,y)$ (or $f(x,y)-g(x,y)$ for input $f(x,y)=g(x,y)$), positive regions are shaded pink, and negative regions are shaded blue. The zero-isoline is shaded brown. If a region numerically evaluates to `NaN`, it is shaded green.

<p>You need a device/browser that supports <a href="https://webglreport.com/?v=2" target="_blank">WebGL 2</a> to run this tool. An FPS counter will be available if your browser supports the <code>EXT_disjoint_timer_query_webgl2</code> extension. If the graph takes too long to update (which is rare for this grapher but more common for other graphers in this series), uncheck the "auto-update" checkbox and apply your change by clicking the "update" button or pressing <code>Alt+Enter</code>.</p>

<p>A preview of the equation is available via <a href="https://www.mathjax.org/" target="_blank">MathJax</a>. You can drag it to move it, or turn it off/on by unchecking/checking the "equation preview" checkbox.</p>

<h3>Entering equations</h3>

<p>Use $x,y$ as independent variables. Write your equation in the form $f(x,y)=0$ or $f(x,y)=g(x,y)$. Use <code>^</code> for power/exponentiation, <code>*</code> for multiplication, and <code>/</code> for division. You can use built-in functions like <code>abs()</code>, <code>sin()</code>, and <code>sqrt()</code>. Note that <code>log(x)</code> evaluates the natural logarithm by default. For the common logarithm, type <code>log(10,x)</code> instead.</p>

<p><b>Defining variables</b>: A variable name starts with a letter, followed by an (optional) underscore and a string of letters or numbers. Example variable names are <code>k</code>, <code>x0</code> ($x_0$, equivalent to <code>x_0</code>), <code>x_t</code> ($x_t$) and <code>A_11</code> ($A_{11}$). For example, you can define <code>a=x+y</code>.</p>

<p><b>Defining functions</b>: The name of a function (and its arguments) are similar to variable names. A function may be defined as <code>f(t)=t*sin(t)</code> and called like <code>z=f(x)*f(y)</code>, or defined as <code>g(a,b)=sin(a)*cos(b)</code> and called like <code>z=g(x+y,x-y)</code>.</p>

<p><b>Comments</b>: A comment can be a single line or after a line of expression, starting with the character <code>#</code>.</p>

<h3>Graphing parameter</h3>

<p><b>Grid</b>: Check this to show axes and grid.</p>

<h3>Technical details</h3>

<p>This tool renders the graph in a WebGL fragment shader in a single pass. At each pixel, the gradient of the function is evaluated along with the value via <a href="https://en.wikipedia.org/wiki/Automatic_differentiation" target="_blank">automatic differentiation</a>. The color of the pixel is determined by the finiteness and sign of the value, and the stroke is determined by the value divided by the magnitude of the gradient.</p>

<p>The input entered is parsed in JavaScript. After preprocessing (ex. adding multiplication signs), the input is parsed to the postfix notation using the <a href="https://en.wikipedia.org/wiki/Shunting-yard_algorithm" target="_blank">shunting-yard algorithm</a>. When generating GLSL code, the expression is evaluated on a stack with caching of common subtrees. Generated GLSL code is logged to the console, which can be found under the "Console" tab of the F12 developer tool.</p>

<p>The source code of this tool can be found on <a href="https://github.com/harry7557558/spirulae/tree/master/implicit2" target="_blank">GitHub</a>.</p>
