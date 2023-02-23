# Spirula

[![spirula.jpg](src/spirula.jpg)](./implicit3/index.html)

GPU-accelerated function graphers in a web browser, both 3D and 2D.

This is a personal passion project. I couldn't find a 3D graphing calculator with satisfying 3D implicit surface rendering on the internet, so I decided to make one. I was inspired by raymarching demos on [Shadertoy](https://www.shadertoy.com/).

After my [3D implicit surface grapher](https://github.com/harry7557558/harry7557558.github.io/tree/master/tools/raymarching-implicit) received positive feedback from other people, I thought, why not extend the same equation parser and renderer to other types of math functions? Under this motivation, I developed the following function graphers:

 - [3D implicit surface grapher](./implicit3/index.html)
 - [Complex domain coloring grapher](./complex/index.html)
 - [3D complex domain coloring grapher](./complex3/index.html)

[//]: # "- [Implicit curve grapher](./implicit2/index.html) (for testing, not intended to be useful)"

It is important to note that these function graphers are developed completely by my effort. Since I don't have much knowledge of advanced functions (especially the complex-variable ones, which I only found their graphs to be visually cool), I cannot guarantee the mathematical practicability and accuracy of these tools. If you have any suggestions or believe you are experiencing a bug, feel free to [open an issue on GitHub](https://github.com/harry7557558/spirula/issues).

The name "Spirula" comes from the name of a [deep-ocean cephalopod mollusk](https://en.wikipedia.org/wiki/Spirula) that has distinctive spiral shells. I consider myself a fan of spirals so it's not surprising that you see a lot of spirals in example graphs.

----

## Features

The equation parser implements the following features:
 - Function and variable definition
 - Comments (start with a `#`)
 - LaTeX preview
 - Real-time shader generation
 - Automatic differentiation

The 3D graphers implements the following parameters/features:
 - Multiple shading modes
 - Dark and light color themes
 - Speed vs. quality control
 - Lighting control
 - Axes and grid
 - Red highlight discontinuity
 - Semi-transparent surface shading
 - Anti-aliasing

----

## Limitations

These tools have the following dependencies:
 - [WebGL 2](https://webglreport.com/?v=2)
    - `EXT_disjoint_timer_query_webgl2`, an FPS counter will be shown when available
    - *`EXT_color_buffer_float`*, currently not required but is very likely a dependency in the future
 - [MathJax 3](https://www.mathjax.org/), required for rendering equation preview

These tools have the following known issues:
 - Incompatibility across devices for functions with overflow and NaN
 - Reduced quality when rendering surfaces with transparency
 - Ambiguity in resolving functions with conflicting parameter names

Features that may be implemented in the future:
 - Iterative refinement to improve rendering quality
 - Code generation (GLSL, C/C++, NumPy, MATLAB, LaTeX, etc.)
 - Exporting mesh-based 3D models
 - Vector arithmetic
 - Mathematically-defined custom colors
 - Variable sliders
 - Better expression editor (highlighting, bracket matching, etc.)
 - More viewport control parameters
 - More [domain coloring parameters](https://en.wikipedia.org/wiki/Domain_coloring) for complex graphers
 - `<iframe>` embed for webpages
 - Graph sharing via URL
 - Parametric surface grapher

----

## Gallery

Complex domain coloring

[![](./src/gallery-complex-trigs.jpg)](./complex/index.html)

Complex domain coloring in 3D

[![](./src/gallery-complex3-tan.jpg)](./complex3/index.html)

A sextic algebraic surface

[![](./src/gallery-implicit3-barth6.jpg)](./implicit3/index.html)

The Burning Ship fractal

[![](./src/gallery-implicit3-bship.jpg)](./implicit3/index.html)

An algebraic star surface with transparency

[![](./src/gallery-implicit3-star.jpg)](./implicit3/index.html)

Complex 3D plots of the Gamma function and the Riemann Zeta function

[![](./src/gallery-complex3-gamma.jpg)](./complex3/index.html)

[![](./src/gallery-complex3-zeta.jpg)](./complex3/index.html)

