#version 300 es

// Vertex shader for pixel-only shaders

in vec4 vertexPosition;
out vec2 vXy;

void main() {
    vXy = vertexPosition.xy;
    gl_Position = vertexPosition;
}