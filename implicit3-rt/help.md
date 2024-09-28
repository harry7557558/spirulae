<h2>Path Tracer for 3D Implicit Surfaces</h2>

<p>A WebGL path tracer that supports various graphing parameters such as material, volume, lighting, and camera. Shape is defined by mathematical equations entered by the user.</p>

<p>Mouse hover a slider or checkbox to see explaination of the parameter. Some detailed explainations of the parameters are given below.</p>

<h3>Entering Equations</h3>

<p>For entering equations, check the help menu of the general <a href="../implicit3/" target="_blank">implicit grapher</a>.</p>

<p>For tips on creating graphs of equations with meaningful shapes, check FAQ on <a href="../" target="_blank">Spirulae homepage</a>.</p>

<h3>Basic Parameters</h3>

<p>- <b>Precision</b>: A parameter that controls step size for ray-surface intersection, higher precision for more accurate intersection but slower rendering.</p>

<p>- <b>SPP</b>: Maximium <b>S</b>ample <b>P</b>er <b>P</b>ixel for rendering. Currently, each pixel is given the same SPP.</p>

<p>- <b>Path depth</b>: Maximum light path depth before termination. Increase this for scenes with strong scattering and/or indirect lighting, which can slow down rendering.</p>

<!-- <p>- <b>MIS (beta)</b>: Check this to enable Multiple Importance Sampling, which can reduce variance for scenes with very small and bright light sources. Currently in development.</p> -->

<p>- <b>Clip</b> and <b>closed</b>: Clip the object to either a cube or a sphere. Check closed if you want the clipped shape to have a closed boundary.</p>

<p>- <b><i>y</i>-up</b>: Use the convention for <i>y</i>-axis pointing up, which is common in some computing applications.</p>

<p>- <b>Denoise</b>: Denoising the rendering with a deep learning model.</p>

<p>- <b>Tonemap</b>: Use a tonemap to map high dynamic range radiance to digital pixel values. If this is not selected, pixels will be clipped between 0 and 1 (or 0 and 255 in quantized version.)<p>

<p>- <b>Scale</b>: Use the sliders to change the scale of respectively object and grid plane.</p>

<h3>Object Appearance</h3>

<p>- <b>Color</b>: There are three color modes for default, visualizing surface normal, and visualizing magnitude of surface gradient. A custom color assigned to <code>c_rgb</code>, <code>c_hsv</code>, or <code>c_hsl</code> variables overrides the default color. For more information, check the help menu of the general <a href="../implicit3/" target="_blank">implicit grapher</a>.</p>

<p>- <b>Grid</b>: Add grid to the surface to help reading the coordinates.</p>

<p>- <b>Highlight discontinuity</b>: The tool defines the zero-isosurface shape by detecting locations with sign change. Check this to detect and red highlight a discontinuity with sign change.</p>

<p>- <b>Opacity</b>: Linear interpolation between opaque and refractive surfaces.</p>

<p>- <b>IOR</b>: Index of reflection of the surface.</p>

<p>- <b>Roughness</b>: This defines the distribution of GGX normal</p>

<p>- <b>Metallic</b>: Linear interpolation between a dielectric and a metal Fresnel reflectance. At low roughness, this creates a transition between ceramic and metal appearance.</P>

<p>- <b>Tint</b>: Linear interpolation between white and surface color for reflection, useful for adjusting ceramic appearance.</b>

<p>- <b>Absorption</b>: For opaque object, this changes surface color gamma. For transparent object, this changes volumetric absorption satisfying Beer-Lambert Law.</p>

<p>- <b>Emission</b> and <b>volumetric emission</b>: Emission from the surface of the object, as well as the medium inside the object that is visible for transparent object.</p>

<p>- <b>Scattering</b> and <b>anisotropy</b>: Define the density and anisotropy of a classical energy-conserving Henyey-Greenstein scattering.</p>

<h3>Background</h3>

<p>Surface appearance parameters for the plane are same per object appearance parameters. <b>Brightness</b> and <b>contrast</b> defines the albedo of the grid.</p>

<p>For absorption and volumetric emission, <b>depth</b> parameter defines the coefficient for an exponential decay of density from ground to atmosphere in additional to strength. Absorption has adjustable <b>hue</b> and <b>chroma</b>.</p>

<p>For scattering, the probability of hitting a particle in atmosphere per unit length is a linear blending between an exponential decay and a step function controlled by <b>sharp</b>, both with coefficient controlled by <b>depth</b>.</p>

<h3>Lighting</h3>

<p>θ and φ specify light direction. Light consists of direction-independent ambient light and spot light linearly interpolated by the "ambient" parameter, and softness/hardness specify concentration of spot light. The "sky" parameter controls a linear blending with a physically-based sky model.</p>

<h3>Camera</h3>

<p>Each parameter in order: field of view, exposure, roll angle, amount of screen-space distortion, relative focal length, relative aperture size, number of aperture blades, and aperture rotation.</p>

<p><hr/></p>

<p>For best experience, a desktop device with a dedicated graphics card is recommended. If the demo does not work for you, you can check the <a href="https://spirulae.github.io/gallery" target="_blank">gallery</a> for some existing results.</p>
