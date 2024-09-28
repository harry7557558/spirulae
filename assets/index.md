GPU-accelerated math function graphers in web browsers, both 3D and 2D.

This is a personal passion project. Back in 2022 I couldn't find a 3D graphing calculator with satisfying 3D implicit surface rendering, so I made one, and the development continued. I was initially inspired by raymarching demos on [Shadertoy](https://www.shadertoy.com/), but as I extended the equation parser and renderer to other types of math functions, currently implemented function graphers are not limited to implicit ones.

It is important to note that these function graphers are developed completely by my effort, and many features I implemented are biased toward personal use. I'm not a "real" mathematician, and many features and examples I added are for visual impression rather than mathenatical accuracy and practicability. If you have any suggestions or believe you are experiencing a bug, feel free to [open an issue on GitHub](https://github.com/harry7557558/spirulae/issues).

The name "Spirulae" comes from the name of a [deep-ocean cephalopod mollusk](https://en.wikipedia.org/wiki/Spirula) that has distinctive spiral shells. I consider myself a fan of spirals, so it shouldn't be surprising that you see a lot of spirals in examples.

----

## Features

The equation parser implements the following features:

 - Function and variable definition
 - Vector and complex number supports
 - Comments (start with `#`, `%`, or `//`)
 - LaTeX preview
 - Special functions
 - Automatic differentiation
 - etc.

The 3D graphers have the following features implemented:

 - Infinite and bounded domain
 - Scalar field visualization
 - Mathematically-defined custom colors
 - Speed vs. quality control
 - Multiple shading and grid modes
 - Dark and light color themes
 - Transparent surfaces
 - Lighting control
 - Red highlight discontinuity
 - etc.

Experimental features (subject to change):

 - Animation via `iTime(0)`
 - Export C++ code for 3D implicit grapher, via `exportCurrentFunction('cppd')` in the browser JS console
 - Custom code generation (`/autodiff`)
 - 2D implicit curve grapher (`/implicit2`)

----

## Working in Progress

Spirulae is under active development. Tools and features that are being developed include:

 - 3D mesh generation (`/meshgen3`)
 - 2D mesh generation (`/meshgen2`)
 - 2D vector field (`/ode2`)

Features that may be implemented in the future (ordered approximately by priority):

 - More robust equation parsing
 - More flexible viewport control
 - Variable sliders
 - Graph sharing via URL, `<iframe>` embed for webpages
 - Better expression editor (highlighting, bracket matching, etc.)
 <!-- - More [domain coloring parameters](https://en.wikipedia.org/wiki/Domain_coloring) for complex graphers -->

Ongoing and proposed research topics (ordered approximately by progress):

 - Denoising path-traced images using deep learning
 - Mesh generation and simplification
 - FEA and general physical simulation
 - Visualization of 3D vector and tensor fields
 - Fitting to NURBS and subdivision surfaces

----

## Limitations

Spirulae has the following web dependencies:

 - [WebGL 2](https://webglreport.com/?v=2)
    - `EXT_color_buffer_float`, required for path tracing and mesh generation
    - `EXT_disjoint_timer_query_webgl2` (*optional*), an FPS counter will be shown when available
 - WebAssembly, required for mesh generation
 - [MathJax 3](https://www.mathjax.org/), required for equation preview

Spirulae has the following known issues:

 - GPU-based graphers use single precision floating point and have incompatibility across devices for overflow and NaN behavior.
 - The parser has ambiguity in resolving conflicting variable names. You can avoid this issue by using unique and descriptive function and variable names.
 - Incomplete documentation for some graphers.

Spirulae is not available for commercial licensing due to C++ dependency [Triangle](https://www.cs.cmu.edu/~quake/triangle.html) and is currently distributed under GPLv3. Spirulae was previously distributed under the MIT license, an old version that allows commercial use can be found [here](https://github.com/harry7557558/spirulae/tree/4843b3e80d92e7633a6525e54c594cd254e5602b).
Note that shader sources adapted from [Shadertoy](https://www.shadertoy.com/), namely [this](https://www.shadertoy.com/view/flcyWn), [this](https://www.shadertoy.com/view/7ltcW8), and [this](https://www.shadertoy.com/view/wsfGWH), are separately distributed under [CC BY-SA-NC 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/deed.en) according to [Shadertoy terms of service](https://www.shadertoy.com/terms).

----

## Frequently Asked Questions

**Q: How to draw shapes using math equations?**

Creating equations whose graphs represent meaningful shapes is more about intuition than rigorous mathematics. To get started, you can check [Inigo Quilez's YouTube channel](https://www.youtube.com/c/InigoQuilez) and videos like [this one](https://www.youtube.com/watch?v=aNR4n0i2ZlM). I also have a [Google Slide](https://docs.google.com/presentation/d/1CgVLkHcU2wQkaGv-QEvbTdrKlimdrVus-sfaRQyWHm8/edit) intended to introduce Desmos art to high school students that may cover similar principles. I recommend starting simple  &ndash; once you master math art in two dimensions, you can easily apply the same principles in 3D.


**Q: What libraries do Spirulae use?**

To make Spirulae lightweight and compatible, I tried to write it with as few dependencies as possible. With the exception of [MathJax](https://www.mathjax.org/) for rendering LaTeX equations, the JavaScript equation parser and renderers are written from scratch without use of external libraries and frameworks, other than native browser APIs like [WebGL](https://en.wikipedia.org/wiki/WebGL). The C++ part that powers mesh generation is compiled to [WebAssembly](https://en.wikipedia.org/wiki/WebAssembly) with [Emscripten](https://emscripten.org/), which uses the following third-party libraries:

 - [Triangle](https://www.cs.cmu.edu/~quake/triangle.html), a fast header-only 2D mesh generation library
 - [GLM](https://github.com/g-truc/glm) and [GLFW](https://www.glfw.org/), popular math and GUI libraries for OpenGL

Spirulae also adapts shader sources from [Shadertoy](https://www.shadertoy.com/):

 - [Zeros of Zeta](https://www.shadertoy.com/view/flcyWn) and [Zeta in a box](https://www.shadertoy.com/view/7ltcW8) by [guil](https://www.shadertoy.com/user/guil), for evaluating the [Riemann Zeta function](https://en.wikipedia.org/wiki/Riemann_zeta_function)
 - [Rayleigh/Mie Day and Night Cycle](https://www.shadertoy.com/view/wsfGWH) by [Elyxian](https://www.shadertoy.com/user/Elyxian), for realistic sky rendering in [path tracer](https://spirulae.github.io/implicit3-rt/)


**Q: What algorithm does spirulae use to render 3D math equations?**

For 3D implicit surface grapher and 3D complex function grapher, for each pixel, Spirulae approximates the nearest intersection between camera ray and the equation's isosurface. The intersection is approximated with [Newton's method](https://en.wikipedia.org/wiki/Newton%27s_method) in screen space, with line derivative estimated from previous function evaluations. The method is designed to be robust to highly nonlinear and unbounded functions. A two-pass hierarchical ray-surface intersection is used to speed up rendering.

The implicit surface path tracer uses a similar method as implicit graphers, except it estimates intersection in clipped object space and does not utilize a hierarchical ray-surface intersection. This allows robust tracing of indirect rays.

The 3D parametric grapher uses a rasterization pipeline. The fragment shader directly evaluates the function per-pixel to calculate albedo and normal, allowing resembling fine surface details even with a relatively coarse geometry. Mesh generators use a conventional OpenGL rasterization pipeline for rendering, with per-vertex albedo and normal from generated mesh.


<!-- **Q: How does Spirulae evaluate functions on the GPU?**

For readers with technical background, Spirulae recompiles shader every time the equation input or a graphing parameter is updated. Spirulae parses equations into [postfix notation](https://en.wikipedia.org/wiki/Reverse_Polish_notation#Explanation) and generates code of a GLSL function that can be compiled. Automatic differentiation can be done in this step. Generated shader code can be found in the browser's F12 developer console. -->

----

## Gallery

**Note:** To see more recent visual results, a gallery of unfiltered process screenshots can be found [here](https://spirulae.github.io/gallery/). The page is intended to be a progress overview rather than a showcase gallery.

Complex domain coloring

[![](../assets/gallery-complex-trigs.jpg)](https://harry7557558.github.io/spirulae/complex/)

The gamma function in 3D

[![](../assets/gallery-complex3-gamma-2.jpg)](https://harry7557558.github.io/spirulae/complex3/)

A realistic rendering of gamma function in 3D

[![](../assets/gallery-implicit3rt-gamma.jpg)](https://harry7557558.github.io/spirulae/implicit3-rt/)

A sextic algebraic surface

[![](../assets/gallery-implicit3-barth6.jpg)](https://harry7557558.github.io/spirulae/implicit3/)

Scalar field visualization

[![](../assets/gallery-implicit3-roots-field.jpg)](https://harry7557558.github.io/spirulae/implicit3/)

[![](../assets/gallery-implicit3-bullhead.jpg)](https://harry7557558.github.io/spirulae/implicit3/)

Parametric surfaces

[![](../assets/gallery-paramsurf-spherical.jpg)](https://harry7557558.github.io/spirulae/paramsurf/)

[![](../assets/gallery-paramsurf-cups.jpg)](https://harry7557558.github.io/spirulae/paramsurf/)

[![](../assets/gallery-paramsurf-boysurf.jpg)](https://harry7557558.github.io/spirulae/paramsurf/)

A 3D Mandelbrot set

[![](../assets/gallery-complex3-mandelbrot.jpg)](https://harry7557558.github.io/spirulae/complex3/)

A path-traced fractal

[![](../assets/gallery-implicit3rt-mandeltorus.jpg)](https://harry7557558.github.io/spirulae/implicit3-rt)

Another path-traced fractal

[![](../assets/gallery-implicit3rt-sponge1.jpg)](https://harry7557558.github.io/spirulae/implicit3-rt)

[![](../assets/gallery-implicit3rt-sponge2.jpg)](https://harry7557558.github.io/spirulae/implicit3-rt)

Crystals modeled using math equations

[![](../assets/gallery-implicit3rt-crystal.jpg)](https://harry7557558.github.io/spirulae/implicit3-rt)

3D mesh models generated from math equations

[![](../assets/gallery-meshgen3-bullhead.jpg)](https://harry7557558.github.io/spirulae/meshgen3)

[![](../assets/gallery-meshgen3-julia.jpg)](https://harry7557558.github.io/spirulae/meshgen3)

A 2D vector field streamline plot

[![](../assets/gallery-ode2-cylflow.jpg)](https://harry7557558.github.io/spirulae/ode2)
