<h2>3D Parametric Surface Grapher</h2>

<p>A tool to visualize 3D parametric surfaces.</p>

<p>Basic use: $u$ and $v$ are from $0$ to $1$. Assign variables $x$, $y$, $z$. Alternatively, you can create vectors depending on $u$ and $v$ using the <code>vec3</code> function.</p>


<h3>Parameters</h3>

<p><b>Quality</b>: A higher quality reserves more geometric details but is slower.</p>

<p><b><i>Y</i>-up</b>: Most math textbooks use the <i>z</i>-axis as the vertical axis. Check this checkbox if you prefer <i>y</i> as the vertical axis.</p>

<p><b>Light theme</b>: Check <code>☼</code> to use light background instead of the default dark background.</p>

<p><b>Autodiff</b>: Use exact gradient instead of numerical gradient for rendering, which can significantly improve accuracy in detailed graphs. This incrases compilation time (especially on Windows with <a href="https://en.wikipedia.org/wiki/ANGLE_(software)" target="_blank">ANGLE</a>), and in rare cases, it can produce floating point overflow error highlighted in green.</p>

<p><b>Grid</b>: Choose no grid, Cartesian grid, or <i>u-v</i> grid.</p>

<p><b>X-ray</b>: Render transparent surface with a <a href="https://en.wikipedia.org/wiki/Beer%E2%80%93Lambert_law" target="_blank">physically based X-ray formula</a>.</p>


<h3>Coloring modes</h3>

<p><b>Default</b>: Displays a light gray surface.</p>

<p><b>UV</b>: Helps visualizing the parameter space $(u,v)$. Blue is $(0,0)$, magenta is $(1,0)$, green is $(0,1)$, yellow is $(1,1)$.</p>

<p><b>Normal</b>: Calculates the albedo of the surface based on the surface normal. Red corresponds the <i>x</i>-direction, green corresponds the <i>y</i>-direction, blue corresponds the <i>z</i>-direction. When the component of the normal is more positive along a direction, the corresponding color component is stronger.</p>

<p><b>Gradient</b>: This mode colors the surface based on the magnitude of the gradient $\left|\frac{\partial \vec{r}}{\partial u}\times\frac{\partial\vec{r}}{\partial v}\right|$. The surface appears bluer when the magnitude of the gradient is closer to an integer power of $10^2$, like 0.01, 1, 100, and more orange as it departs.</p>

<p><b>Curvature</b>: This mode colors the surface based on <a href="https://en.wikipedia.org/wiki/Gaussian_curvature" target="_blank">Gaussian curvature</a> $K$. The surface appears bluer when $|K|$ is closer to an integer power of $10^4$, like 0.0001, 1, and 10000, and more orange as it departs. A "stripe" indicates a line with a zero Gaussian curvature, and a green area (represents <code>NaN</code>) can indicates an area with zero Gaussian curvature.</p>
