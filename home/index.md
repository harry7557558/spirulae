GPU-accelerated function graphers in a web browser, both 3D and 2D.

This is a personal passion project. I couldn't find a 3D graphing calculator with satisfying 3D implicit surface rendering on the internet, so I made one. I was initially inspired by raymarching demos on [Shadertoy](https://www.shadertoy.com/), but as I extended the equation parser and renderer to other types of math functions, currently implemented function graphers are not limited to implicit ones.

It is important to note that these function graphers are developed completely by my effort, and many features I implemented are biased toward personal use. Since I don't have much knowledge of advanced functions (especially the complex-variable ones, which I only found their graphs to be visually cool), I cannot guarantee the mathematical practicability and accuracy of these tools. If you have any suggestions or believe you are experiencing a bug, feel free to [open an issue on GitHub](https://github.com/harry7557558/spirulae/issues).

The name "Spirulae" comes from the name of a [deep-ocean cephalopod mollusk](https://en.wikipedia.org/wiki/Spirula) that has distinctive spiral shells. I consider myself a fan of spirals, so it shouldn't be surprising that you see a lot of spirals in examples.

----

## Features

The equation parser implements the following features:

 - Function and variable definition
 - Comments (start with `#`, `%`, or `//`)
 - LaTeX preview
 - Complex number support for all graphers
 - Special functions
 - Automatic differentiation
 - etc.

The 3D graphers have the following features implemented:

 - Infinite and bounded domain
 - Scalar field visualization
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

----

## Working in Progress

Spirulae is under active development. Tools and features that are being developed include:

 - 3D mesh generation (`/meshgen3`)
 - 2D mesh generation (`/meshgen2`)
 - 2D vector field (`/ode2`)
 <!-- - Automatic differentiation (`/autodiff`) -->

Features that may be implemented in the future (ordered approximately by priority):

 - Vector support
 - More robust equation parsing
 - Mathematically-defined custom colors
 - More flexible viewport control
 - Variable sliders
 - Graph sharing via URL, `<iframe>` embed for webpages
 - Better expression editor (highlighting, bracket matching, etc.)
 <!-- - More [domain coloring parameters](https://en.wikipedia.org/wiki/Domain_coloring) for complex graphers -->

Ongoing and proposed research topics (ordered approximately by progress):

 - Mesh generation and simplification
 - Denoising of path-traced images via deep learning
 - FEA and general physical simulation
 - Visualization of 3D vector and tensor fields

----

## Limitations

These tools have the following dependencies:

 - [WebGL 2](https://webglreport.com/?v=2)
    - `EXT_color_buffer_float` and `EXT_float_blend`, required for path tracing and mesh generation
    - `EXT_disjoint_timer_query_webgl2` (*optional*), an FPS counter will be shown when available
 - WebAssembly, required for mesh generation
 - [MathJax 3](https://www.mathjax.org/), required for equation preview

These tools have the following known issues:

 - GPU-based graphers use single precision floating point and have incompatibility across devices for overflow and NaN behavior
 - The parser has ambiguity in resolving conflicting variable names
 - Incomplete documentation for some graphers

----

## Frequently Asked Questions

**Q: What library does Spirulae use?**

I tried to write Spirulae with as few dependencies as possible, therefore I wrote the equation parser and renderer from scratch without use of third-party libraries and frameworks. Spirulae uses native browser APIs like [WebGL](https://en.wikipedia.org/wiki/WebGL) and [WebAssembly](https://en.wikipedia.org/wiki/WebAssembly), as well as [MathJax](https://www.mathjax.org/) for displaying equations. The C++ part (compiled to WebAssembly via [Emscripten](https://emscripten.org/)) uses [GLFW](https://www.glfw.org/) and [GLM](https://github.com/g-truc/glm) for graphics and vector operations.


**Q: How to draw shapes using equations?**

Drawing meaningful shapes using equations is more about art techniques than rigorous mathematics. To get started, you can check [Inigo Quilez's YouTube channel](https://www.youtube.com/c/InigoQuilez) and videos like [this one](https://www.youtube.com/watch?v=aNR4n0i2ZlM). I also have a [Google Slide](https://docs.google.com/presentation/d/1CgVLkHcU2wQkaGv-QEvbTdrKlimdrVus-sfaRQyWHm8/edit) intended to introduce Desmos art to high school students that may cover similar principles and can be used as a dictionary.


**Q: How does Spirulae evaluate functions on the GPU?**

For readers with technical background, Spirulae recompiles shader every time the equation input or a graphing parameter is updated. Spirulae parses equations into [postfix notation](https://en.wikipedia.org/wiki/Reverse_Polish_notation#Explanation) and generates code of a GLSL function that can be compiled. Automatic differentiation can be done in this step. Generated shader code can be found in the browser's F12 developer console.

----

## Gallery

A gallery of unfiltered process screenshots can be found [here](https://spirulae.github.io/gallery/). Note that the page is intended to be a progress overview rather than a showcase gallery.

Complex domain coloring

[![](./home/gallery-complex-trigs.jpg)](https://harry7557558.github.io/spirulae/complex/)

The gamma function in 3D

[![](./home/gallery-complex3-gamma-2.jpg)](https://harry7557558.github.io/spirulae/complex3/)

A sextic algebraic surface

[![](./home/gallery-implicit3-barth6.jpg)](https://harry7557558.github.io/spirulae/implicit3/)

A fractal with scalar field visualized

[![](./home/gallery-implicit3-roots-field.jpg)](https://harry7557558.github.io/spirulae/implicit3/)

A clipped quintic implicit surface, with volumetrics showing isosurfaces

[![](./home/gallery-implicit3-field.jpg)](https://harry7557558.github.io/spirulae/implicit3/)

A parametric surface rendered in X-ray mode

[![](./home/gallery-paramsurf-twist.jpg)](https://harry7557558.github.io/spirulae/paramsurf/)

A path-traced fractal

[![](./home/gallery-implicit3-rt-mandeltorus.jpg)](https://harry7557558.github.io/spirulae/implicit3-rt)
