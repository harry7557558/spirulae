#version 300 es

in vec2 vertexPosition;

out vec2 vUv;
out vec3 vXyz;

uniform mat4 transformMatrix;
uniform vec2 screenCenter;
uniform float uScale;

uniform vec4 uvRange;  // u0, v0, u1, v1

{%FUN%}


vec3 F(float u, float v) {
    vec3 p = funRaw(u, v);
#if {%Y_UP%}
    return vec3(p.x, -p.z, p.y);
#endif
    return p;
}

void main() {
    vUv = mix(uvRange.xy, uvRange.zw, vertexPosition);
    vXyz = F(vUv.x, vUv.y);
    gl_Position = transformMatrix * vec4(vXyz,1);
    gl_Position += vec4(screenCenter, 0, 0) * gl_Position.w;
}

