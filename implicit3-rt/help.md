<h2>Path Tracer for 3D Implicit Surfaces</h2>

<p>A WebGL path tracer that supports various graphing parameters such as material, volume absorption and scattering, and lighting. Shape is defined by mathematical equations that you can enter in the textarea.</p>

<p>Mouse hover a slider or checkbox to see explaination of the parameter. Some detailed explaination of the parameter is given below:</p>

<p>- <b>Opacity</b>: linear interpolation between opaque and refractive</p>

<p>- <b>Roughness</b>: this defines the distribution of GGX normal</p>

<p>- <b>Emission</b>: emission from the surface of the object and/or the plane</p>

<p>- <b>Absorption</b>: light absorption subject to Beer-Lambert law; coefficient depends on color for object and specified by absorb parameter (color) and decay parameter (density) for atmosphere</p>

<p>- <b>Scattering</b>: energy conserving isotropic scattering, probability of hitting a particle is constant for object and $\mathrm{d}p=\rho(z)\mathrm{d}t$ for atmosphere</p>

<p>- <b>Decay</b>: specify $k$ for $\rho(z)=\rho_0\operatorname{e}^{-kz}$ for absorption and scattering</p>

<p>- <b>Absorb</b>: specify hue and chroma for atmospheric absorption</p>

<p>- <b>Lighting</b>: θ and φ specify light direction, intensity specify total integral of radiance; light consists of direction independent ambient light and spot light, ambient specify the factor of ambient light and softness/hardness specify concentration of spot light. Also supports linear blending with a physically-based sky model.</p>

<p>- <b>Camera</b>: parameters for camera roll, amount of screen-space radial distortion, focal length, relative aperture size, number of aperture blades, and aperture rotation</p>

<p><hr/></p>

<p>Gallery: <a href="https://spirulae.github.io/gallery">https://spirulae.github.io/gallery</a></p>
