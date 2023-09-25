<h2>3D Implicit Surface Grapher</h2>

<p>By Harry Chen (harry7557558) - I couldn't find a satisfying tool on the internet, so I made one. I was inspired by raymarching demos on <a href="https://www.shadertoy.com/" target="_blank">Shadertoy</a>.</p>

<img src="../home/gallery-implicit3-barth6.jpg" alt="gallery-implicit3-barth6.jpg" />

<p>This tool implements the raymarching algorithm to render 3D implicit surfaces. Type equations in the input box, or look at some examples. Drag the canvas to rotate the surface, and scroll to zoom in/out. Drag while holding <code>Shift</code> to move the graph on the screen. Reset the viewport by switching to an example and switching back (you may want to back up your input). Try to play with selectors, checkboxes, and sliders.</p>

<p>You need a device/browser that supports <a href="https://webglreport.com/?v=2" target="_blank">WebGL 2</a> to run this tool. An FPS counter will be available if your browser supports the <code>EXT_disjoint_timer_query_webgl2</code> extension. If the graph takes too long to update, uncheck the "auto-update" checkbox and apply your change by clicking the "update" button or pressing <code>Alt+Enter</code>.</p>

<p>A preview of the equation is available via <a href="https://www.mathjax.org/" target="_blank">MathJax</a>. You can drag it to move it, or turn it off/on by unchecking/checking the "equation preview" checkbox.</p>

<h3>Entering equations</h3>

<p>Use $x, y, z$ as independent variables. Write your equation in the form $f(x,y,z)=0$ or $f(x,y,z)=g(x,y,z)$. Use <code>^</code> for power/exponentiation, <code>*</code> for multiplication, and <code>/</code> for division. You can use built-in functions like <code>abs()</code>, <code>sin()</code>, and <code>sqrt()</code>. Note that <code>log(x)</code> evaluates the natural logarithm by default. For the common logarithm, type <code>log(10,x)</code> instead.</p>

<p><b>Defining variables</b>: A variable name starts with a letter, followed by an (optional) underscore and a string of letters or numbers. Example variable names are <code>k</code>, <code>x0</code> ($x_0$, equivalent to <code>x_0</code>), <code>x_t</code> ($x_t$) and <code>A_11</code> ($A_{11}$). For example, you can define <code>a=x+y</code> and enter <code>z=a*sin(a)</code> as the main equation.</p>

<p><b>Defining functions</b>: The name of a function (and its arguments) are similar to variable names. A function may be defined as <code>f(t)=t*sin(t)</code> and called like <code>z=f(x)*f(y)</code>, or defined as <code>g(a,b)=sin(a)*cos(b)</code> and called like <code>z=g(x+y,x-y)</code>.</p>

<p><b>Comments</b>: A comment can be a single line or after a line of expression, starting with the character <code>#</code>. (Check the "Atan2 Spiral" example)</p>

<h3>Graphing parameters</h3>

<p><b>Quality</b>: A higher quality means a smaller raymarching step, which is slower but usually produces a more accurate image.</p>

<p><b><i>Y</i>-up</b>: A majority of math textbooks use the <i>z</i>-axis as the vertical axis. Check this checkbox if you prefer <i>y</i> as the vertical axis.</p>

<p><b>Light theme</b>: Check <code>☼</code> to use light background instead of the default dark background.</p>

<p><b>Clip</b>: Restrict the domain of the function for better visualization and accelerated rendering.</p>

<p><b>Fixed clip</b>: By default domain clipping changes while zooming to adapt to viewport. Check this if you want to keep the function domain consistent.</p>

<p><b>Field</b>: Visualize scalar field using volume contour lines. Use this selector to choose linear contour, logarithmic contour, or no contour. Warn that volume rendering can be slow when the function domain isn't restricted, and therefore it's recommended to set a clip when using this feature.</p>

<p><b>Grid</b>: When checked, this tool will display an adaptive grid on the surface, making it easier to see the size of the object and read the coordinates of a point.</p>

<p><b>Transparency</b>: Check this if you want the surface to be semi-transparent so you can look through it. (Try the "A5 Star" example.) Warn that this may decrease the accuracy of the rendering.</p>

<p><b>Discontinuity</b>: In rendering, the surface is defined by a set of points with changes of sign, which is either a zero or a discontinuity. Check this to detect and red highlight discontinuity. (Try the "Sin Terrace" example.) Currently, this is only supported for surfaces without transparency.</p>

<p><b>Lighting angles</b>: As the <i>θ<sub>light</sub></i> slider is dragged from left to right, the light moves from bottom to bottom counter-clockwise. As the <i>φ<sub>light</sub></i> slider is dragged from left to right, the light moves from front to back. The light rotates to fit this description as the viewport rotates. Right-click a slider to reset a lighting angle to default.</p>

<h3>Coloring modes</h3>

<p><b>Default</b>: (not really the default mode) This mode displays a light gray, glazed surface. You may or may not see a slight tint depending on your device's display setting.</p>

<p><b>Normal</b>: This mode calculates the albedo of the surface based on the surface normal (normalized gradient). Red corresponds the <i>x</i>-direction, green corresponds the <i>y</i>-direction, blue corresponds the <i>z</i>-direction. When the component of the normal is more positive along a direction, the corresponding color component is stronger. Visually, the green part has the most positive <i>y</i> normal.</p>

<p><b>Gradient</b>: This mode colors the surface based on the magnitude of the gradient. The surface appears bluer when the magnitude of the gradient is closer to an integer power of 100, like 0.01, 1, 100, and more orange as it departs. For a perfect SDF, you should see a clean dark blue color. For where the gradient approaches zero or infinity, there may be alternating blue and orange "stripes." (check the "A6 heart" example)</p>

<h3>Technical details</h3>

<p>This tool implements the raymarching algorithm in WebGL fragment shaders. It casts rays from the camera and numerically finds its intersections with the surface. The raymarching step size is calculated by dividing the value of the scalar field by the magnitude of the directional derivative along the ray (in screen space) and clamped based on a given step size, which can be changed through the "quality" selector.</p>

<p>In the first pass, it marches along the ray to determine an interval where intersections may exist. Then, the result is pooled using min/max functions with neighboring pixels to avoid missing intersections. These two passes are done in 0.25x of the screen resolution.</p>

<p>The main raymarching function checks intersections within the calculated intervals. For opaque surfaces, a bisection search is performed when the first sign change is detected, and the color is calculated and returned. For a semi-transparent surface, it approximates intersections using linear interpolation and calculates and accumulates the color each time a sign change is detected.</p>

<p>The rendered image goes through an anti-aliasing pass. This pass uses a filter based on linear regression to anti-alias the image. A description and implementation of the algorithm can be found <a href="https://www.shadertoy.com/view/sllczM" target="_blank">here</a>.</p>

<p>The input entered is parsed in JavaScript. After preprocessing (ex. adding multiplication signs), the input is parsed to the postfix notation using the <a href="https://en.wikipedia.org/wiki/Shunting-yard_algorithm" target="_blank">shunting-yard algorithm</a>. When generating GLSL code, the expression is evaluated on a stack with caching of common subtrees. Generated GLSL code is logged to the console, which can be found under the "Console" tab of the F12 developer tool.</p>

<p>The source code of this tool can be found on <a href="https://github.com/harry7557558/spirulae/tree/master/implicit3" target="_blank">GitHub</a>.</p>
