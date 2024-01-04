<h2>Complex Domain Coloring Grapher</h2>

<p>By Harry Chen (harry7557558) - Complex domain coloring. Integrating <a href="https://harry7557558.github.io/tools/complex_webgl.html" target="_blank">a domain coloring tool I created before</a> and the powerful input parser of Spirulae. I created this tool primarily because I found the domain coloring graphs of complex functions to be visually cool.</p>

<img src="../home/gallery-complex-trigs.jpg" alt="gallery-complex-trigs.jpg" />

<p>This tool visualizes complex-variable math functions based on user inputs. Type equations in the input box, or look at some examples. Drag the canvas to move, and scroll to zoom in/out. Reset the viewport by switching to an example and switching back (you may want to back up your input).</p>

<p>You need a device/browser that supports <a href="https://webglreport.com/?v=2" target="_blank">WebGL 2</a> to run this tool. An FPS counter will be available if your browser supports the <code>EXT_disjoint_timer_query_webgl2</code> extension. If the graph takes too long to update, uncheck the "auto-update" checkbox and apply your change by clicking the "update" button or pressing <code>Alt+Enter</code>.</p>

<p>A preview of the equation is available via <a href="https://www.mathjax.org/" target="_blank">MathJax</a>. You can drag it to move it, or turn it off/on by unchecking/checking the "equation preview" checkbox.</p>

<h3>Entering equations</h3>

<p>Use $x$ or $z$ (depends on your preference, but not both) as the independent variable. Input your function as an expression involving $x$ or $z$. Enter $i$ or $j$ for the imaginary unit. Use <code>^</code> for power/exponentiation, <code>*</code> for multiplication, and <code>/</code> for division. You can use built-in functions like real-valued <code>re()</code>, <code>im()</code>, <code>length()</code>, and <code>arg()</code>, the complex conjugate <code>conj()</code>, elementary functions like <code>exp()</code>, <code>sin()</code>, <code>sqrt()</code>, and <code>atanh()</code>, special functions like the <a href="https://mathworld.wolfram.com/LogGammaFunction.html" target="_blank">logarithm of the Gamma function</a> <code>lgamma()</code> and the <a href="https://en.wikipedia.org/wiki/Riemann_zeta_function" target="_blank">Riemann zeta function</a> <code>zeta()</code>, etc. Note that <code>log(x)</code> evaluates the natural logarithm by default. For $\log_a(x)$, type <code>log(a,x)</code>.

<p><b>Defining variables</b>: A variable name starts with a letter, followed by an (optional) underscore and a string of letters or numbers. Example variable names are <code>k</code>, <code>x0</code> ($x_0$, equivalent to <code>x_0</code>), <code>x_t</code> ($x_t$) and <code>A_11</code> ($A_{11}$). For example, you can define <code>a=z+sin(z)</code> and enter <code>a^4+a+1</code> as the main equation.</p>

<p><b>Defining functions</b>: The name of a function (and its arguments) are similar to variable names. A function may be defined as <code>f(t)=t*sin(t)</code> and called like <code>f(z)*f(pi-z)</code>, or defined as <code>g(a,b)=sin(a)*cos(b)</code> and called like <code>g((i+1)z,(i-1)z)</code>.</p>

<p><b>Comments</b>: A comment can be a single line or after a line of expression, starting with the character <code>#</code>.</p>

<h3>Graphing parameters</h3>

<p><b>Grid</b>: Check this to show axes and grid.</p>

<p><b>Linear contour</b>: This option renders gray contour lines where the magnitude of the value of the function is close to an integer.</p>

<p><b>Logarithmic contour</b>: This option renders gray contour lines where the magnitude of the value of the function is close to an integer power of 10.</p>

<p><b>Brightness</b>: The rendering appears darker when this slider is set left and lighter as it moves right. Right-click the slider to reset it to its default value.</p>

<h3>Technical details</h3>

<p>This tool renders the graph in a WebGL fragment shader in a single pass. At each pixel, the value of the function is evaluated, and the HSV color is calculated using domain coloring. The brightness of the pixel is calculated by raising one minus brightness to the logarithm of the logarithm of the magnitude of the value. The contour lines are applied to color saturation.</p>

<p>The input entered is parsed in JavaScript. After preprocessing (ex. adding multiplication signs), the input is parsed to the postfix notation using the <a href="https://en.wikipedia.org/wiki/Shunting-yard_algorithm" target="_blank">shunting-yard algorithm</a>. When generating GLSL code, the expression is evaluated on a stack with caching of common subtrees. Generated GLSL code is logged to the console, which can be found under the "Console" tab of the F12 developer tool.</p>

<p>The source code of this tool can be found on <a href="https://github.com/harry7557558/spirulae/tree/master/complex" target="_blank">GitHub</a>.</p>
