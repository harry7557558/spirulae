#version 300 es

in vec2 vertexPosition;

out vec2 vUv;
out vec3 vXyz;

uniform mat4 transformMatrix;
uniform vec2 screenCenter;
uniform float uScale;

{%FUN%}

void main() {
    float u = vertexPosition.x, v = vertexPosition.y;
    vUv = vec2(u, v);
    vXyz = funRaw(u, v);
    gl_Position = transformMatrix * vec4(vXyz,1);
    gl_Position += vec4(screenCenter, 0, 0) * gl_Position.w;
}

