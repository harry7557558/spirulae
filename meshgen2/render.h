#include <emscripten/emscripten.h>

#include "../include/gl.h"
#include "../include/glm/gtc/matrix_transform.hpp"

#ifndef PIf
#define PIf 3.1415927f
#endif

#include <cstdlib>
#include <cstdio>
#include <string>
#include <vector>
#include <set>
#include <functional>
#include <algorithm>
#include <thread>

#include "solver.h"

#if SUPPRESS_ASSERT
#undef assert
#define assert(x) 0
#endif


const char VERTEX_SHADER_SOURCE[] = R"""(#version 300 es
precision highp float;
in vec3 vertexPosition;
in vec3 vertexNormal;
in float vertexValue;
in vec4 vertexColor;
out vec3 fragNormal;
out vec4 interpolatedColor;
uniform mat4 transformMatrix;
void main() {
    gl_Position = transformMatrix * vec4(vertexPosition, 1);
    fragNormal = -(transformMatrix*vec4(vertexNormal,0)).xyz;
    // fragNormal = vertexNormal;
    interpolatedColor = vertexColor;
})""";

const char FRAGMENT_SHADER_SOURCE[] = R"""(#version 300 es
precision highp float;
in vec3 fragNormal;
in vec4 interpolatedColor;
out vec4 fragColor;  // negative rgb for value<0-1> colormap
uniform float maxValue;  // colormap, positive for smooth and negative for steps
uniform float colorRemapK;  // negative for slider, positive for object
uniform float brightness;  // multiply color by this number
float log10(float x) { return log(x)/log(10.); }
float remap(float t, float k) { return pow(t,k) / (pow(t,k) + pow(1.-t,k)); }
void main() {
    vec3 n = fragNormal==vec3(0) ? vec3(0): normalize(fragNormal);
    float amb = 1.0+0.3*max(-n.z,0.);
    float dif = dot(n,normalize(vec3(-0.5,-0.5,1)));
    float spc = pow(max(n.z,0.), 10.0);
    vec3 col = interpolatedColor.xyz;
    if (interpolatedColor.x < 0.0) {
        float maxv = abs(maxValue);
        float t = clamp(interpolatedColor.w, 0., 1.);
        float tm = colorRemapK<0. ? remap(t, -1./colorRemapK) : t;
        float v = mix(-maxv, maxv, tm);
        if (maxValue < 0.0 && v != 0.0) {
            float s = sign(v); v = abs(v);
            float k = ceil(log10(v)) - 1.;
            float u = log10(v) - k;
            float w = u < log10(2.) ? 1.5 :
                u < log10(5.) ? 3.5 : 7.5;
            if (pow(10.,k)*w > maxv)
                w = 0.5*(0.5*w + maxv*pow(0.1,k));
            v = s * pow(10.,k) * w;
        }
        tm = clamp(0.5+0.5*v/maxv, 0., 1.);
        t = remap(tm, abs(colorRemapK));
        col = vec3(132.23,.39,-142.83)+vec3(-245.97,-1.4,270.69)*t+vec3(755.63,1.32,891.31)*cos(vec3(.3275,2.39,.3053)*t+vec3(-1.7461,-1.84,1.4092));
        if (isnan(dot(col,col))) col = vec3(0,1,0);
    }
    fragColor = vec4(brightness*(0.6*amb+0.4*max(dif,0.)+0.1*max(-dif,0.)+0.1*spc)*col, 1);
    if (brightness < 0.0) fragColor.xyz = col;
})""";




class Viewport;

namespace RenderParams {
    glm::ivec2 iResolution(600, 500);
    const double fps = 60.0;
    GLFWwindow* window;
    GLuint vertexArrayID = 0;
    Viewport* viewport;
    glm::vec2 screenCenter = glm::vec2(0.5, 0.5);
}


class Viewport {

    GLuint shaderProgram;
    GLuint vertexbuffer, normalbuffer, indicebuffer, colorbuffer;
    glm::mat4 transformMatrix;

public:

    float scale;
    glm::vec3 center;
    float rx, rz;
    bool renderNeeded;

    Viewport(float scale, glm::vec3 center, float rx, float rz)
        : renderNeeded(true) {
        this->scale = scale;
        this->center = center;
        this->rx = rx, this->rz = rz;
        this->shaderProgram = createShaderProgram(
            VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
        glGenBuffers(1, &this->vertexbuffer);
        glGenBuffers(1, &this->normalbuffer);
        glGenBuffers(1, &this->indicebuffer);
        glGenBuffers(1, &this->colorbuffer);
    }

    ~Viewport() {
        // Cleanup VBO and shader
        glDeleteBuffers(1, &vertexbuffer);
        glDeleteBuffers(1, &normalbuffer);
        glDeleteBuffers(1, &indicebuffer);
        glDeleteBuffers(1, &colorbuffer);
        glDeleteProgram(this->shaderProgram);
    }


    // interactions
    void mouseClick() {
        this->renderNeeded = true;
    }
    void mouseMove(glm::vec2 mouse_delta) {
        this->rx -= 0.015f * mouse_delta.y;
        this->rz += 0.015f * mouse_delta.x;
        this->renderNeeded = true;
    }
    void mouseScroll(float yoffset) {
        this->scale *= exp(0.04f * yoffset);
        this->renderNeeded = true;
    }

    // Clear the screen and setup projection matrix
    void initDraw3D() {
        glUseProgram(this->shaderProgram);
        glEnable(GL_DEPTH_TEST);
        glDepthFunc(GL_LESS);
        glClearColor(1.0f, 1.0f, 1.0f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

        // glDisable(GL_DEPTH_TEST);
        // glEnable(GL_BLEND);
        // glBlendFunc(GL_ONE, GL_ONE_MINUS_SRC_COLOR);

        glm::vec2 res = RenderParams::iResolution;
        transformMatrix = glm::perspective(0.2f * PIf, res.x / res.y, 0.1f / scale, 100.0f / scale);
        transformMatrix = glm::translate(transformMatrix, glm::vec3(0.0, 0.0, -3.0f / scale));
        transformMatrix = glm::rotate(transformMatrix, rx, glm::vec3(1, 0, 0));
        transformMatrix = glm::rotate(transformMatrix, rz, glm::vec3(0, 0, 1));
        transformMatrix = glm::translate(transformMatrix, -center);
        glm::vec2 sctr = (-1.0f+2.0f*RenderParams::screenCenter);
        transformMatrix[3][0] += sctr.x * transformMatrix[3][3];
        transformMatrix[3][1] += sctr.y * transformMatrix[3][3];
    }
    // Setup transformation matrix for 2D drawing
    void initDraw2D() {
        glDisable(GL_DEPTH_TEST);
        glm::vec2 res = RenderParams::iResolution;
        transformMatrix = glm::mat4(
            2.0f / res.x, 0, 0, 0,
            0, 2.0f / res.y, 0, 0,
            0, 0, -1, 0,
            -1, -1, 0, 1
        );
    }

    /*VBO drawing
        Precombute vertices, normals (not necessarily normalized), indices, and colors
        Colors: RGB must be non-negative; Pass vec4(-1,-1,-1,value<0-1>) for "heatmap"
    */
    void drawVBO(
        std::vector<glm::vec3> vertices,
        std::vector<glm::vec3> normals,
        std::vector<glm::ivec3> indices,
        std::vector<glm::vec4> colors,
        float maxValue = 1.0f, float colorRemapK = 1.0f, float brightness = 1.0f
    ) {
        assert(sizeof(glm::vec3) == 12);
        assert(sizeof(glm::ivec3) == 12);
        assert(sizeof(glm::vec4) == 16);
        assert(sizeof(glm::mat4) == 64);
        glUseProgram(this->shaderProgram);

        // vertices
        GLuint vertexPositionLocation = glGetAttribLocation(shaderProgram, "vertexPosition");
        glBindBuffer(GL_ARRAY_BUFFER, vertexbuffer);
        glBufferData(GL_ARRAY_BUFFER, sizeof(glm::vec3) * vertices.size(), &vertices[0], GL_STATIC_DRAW);
        glEnableVertexAttribArray(vertexPositionLocation);
        glVertexAttribPointer(
            vertexPositionLocation,  // attribute location
            3,  // size
            GL_FLOAT,  // type
            GL_FALSE,  // normalized?
            0,  // stride
            (void*)0  // array buffer offset
        );

        // normals
        GLuint vertexNormalLocation = glGetAttribLocation(shaderProgram, "vertexNormal");
        glBindBuffer(GL_ARRAY_BUFFER, normalbuffer);
        glBufferData(GL_ARRAY_BUFFER, sizeof(glm::vec3) * normals.size(), &normals[0], GL_STATIC_DRAW);
        glEnableVertexAttribArray(vertexNormalLocation);
        glVertexAttribPointer(
            vertexNormalLocation,  // attribute location
            3,  // size
            GL_FLOAT,  // type
            GL_FALSE,  // normalized?
            0,  // stride
            (void*)0  // array buffer offset
        );

        // values/colors
        GLuint vertexColorLocation = glGetAttribLocation(shaderProgram, "vertexColor");
        glBindBuffer(GL_ARRAY_BUFFER, colorbuffer);
        glBufferData(GL_ARRAY_BUFFER, sizeof(glm::vec4) * colors.size(), &colors[0], GL_STATIC_DRAW);
        glEnableVertexAttribArray(vertexColorLocation);
        glVertexAttribPointer(
            vertexColorLocation,  // attribute location
            4,  // size
            GL_FLOAT,  // type
            GL_FALSE,  // normalized?
            0,  // stride
            (void*)0  // array buffer offset
        );

        // indices
        glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, indicebuffer);
        glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(glm::ivec3) * indices.size(), &indices[0], GL_STATIC_DRAW);

        // set uniform(s)
        GLuint location = glGetUniformLocation(shaderProgram, "transformMatrix");
        glUniformMatrix4fv(location, 1, GL_FALSE, &transformMatrix[0][0]);
        location = glGetUniformLocation(shaderProgram, "maxValue");
        glUniform1f(location, maxValue);
        location = glGetUniformLocation(shaderProgram, "colorRemapK");
        glUniform1f(location, colorRemapK);
        location = glGetUniformLocation(shaderProgram, "brightness");
        glUniform1f(location, brightness);

        // draw
        glDrawElements(GL_TRIANGLES,
            3 * (int)indices.size(),
            GL_UNSIGNED_INT,
            (void*)0);

        // clean-up
        glDisableVertexAttribArray(vertexPositionLocation);
        glDisableVertexAttribArray(vertexNormalLocation);
        glDisableVertexAttribArray(vertexColorLocation);
    }

    void drawLinesVBO(
        std::vector<glm::vec3> vertices,
        std::vector<glm::vec3> normals,
        std::vector<glm::ivec2> indices,
        std::vector<glm::vec4> colors,
        float maxValue = 1.0f, float colorRemapK = 1.0f, float brightness = 1.0f
    ) {
        glUseProgram(this->shaderProgram);

        // vertices
        GLuint vertexPositionLocation = glGetAttribLocation(shaderProgram, "vertexPosition");
        glBindBuffer(GL_ARRAY_BUFFER, vertexbuffer);
        glBufferData(GL_ARRAY_BUFFER, sizeof(glm::vec3) * vertices.size(), &vertices[0], GL_STATIC_DRAW);
        glEnableVertexAttribArray(vertexPositionLocation);
        glVertexAttribPointer(vertexPositionLocation, 3, GL_FLOAT, GL_FALSE, 0, nullptr);

        // normals
        GLuint vertexNormalLocation = glGetAttribLocation(shaderProgram, "vertexNormal");
        glBindBuffer(GL_ARRAY_BUFFER, normalbuffer);
        glBufferData(GL_ARRAY_BUFFER, sizeof(glm::vec3) * normals.size(), &normals[0], GL_STATIC_DRAW);
        glEnableVertexAttribArray(vertexNormalLocation);
        glVertexAttribPointer(vertexNormalLocation, 3, GL_FLOAT, GL_FALSE, 0, nullptr);

        // values/colors
        GLuint vertexColorLocation = glGetAttribLocation(shaderProgram, "vertexColor");
        glBindBuffer(GL_ARRAY_BUFFER, colorbuffer);
        glBufferData(GL_ARRAY_BUFFER, sizeof(glm::vec4) * colors.size(), &colors[0], GL_STATIC_DRAW);
        glEnableVertexAttribArray(vertexColorLocation);
        glVertexAttribPointer(vertexColorLocation, 4, GL_FLOAT, GL_FALSE, 0, nullptr);

        // indices
        glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, indicebuffer);
        glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(glm::ivec2) * indices.size(), &indices[0], GL_STATIC_DRAW);

        // set uniform(s)
        GLuint location = glGetUniformLocation(shaderProgram, "transformMatrix");
        glm::mat4 m = transformMatrix; m[3][2] -= 4e-5f;
        glUniformMatrix4fv(location, 1, GL_FALSE, &m[0][0]);
        location = glGetUniformLocation(shaderProgram, "maxValue");
        glUniform1f(location, maxValue);
        location = glGetUniformLocation(shaderProgram, "colorRemapK");
        glUniform1f(location, colorRemapK);
        location = glGetUniformLocation(shaderProgram, "brightness");
        glUniform1f(location, brightness);

        // draw
        glDrawElements(GL_LINES, 2 * (int)indices.size(), GL_UNSIGNED_INT, nullptr);

        // clean-up
        glDisableVertexAttribArray(vertexPositionLocation);
        glDisableVertexAttribArray(vertexNormalLocation);
        glDisableVertexAttribArray(vertexColorLocation);
    }

};



bool initWindow() {
    // Initialise GLFW
    if (!glfwInit()) {
        fprintf(stderr, "Failed to initialize GLFW.\n");
        return false;
    }
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 2);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 0);
    glfwWindowHint(GLFW_SAMPLES, 8);

    // Open a window and create its OpenGL context
    RenderParams::window = glfwCreateWindow(
        RenderParams::iResolution.x, RenderParams::iResolution.y, "GLFW Window", NULL, NULL);
    if (RenderParams::window == NULL) {
        fprintf(stderr, "Failed to open GLFW window.\n");
        glfwTerminate(); return false;
    }
    glfwMakeContextCurrent(RenderParams::window);

    glGenVertexArrays(1, &RenderParams::vertexArrayID);
    glBindVertexArray(RenderParams::vertexArrayID);

    RenderParams::viewport = new Viewport(
        1.0f, glm::vec3(0.0f), -0.5f, 0.0f);
    return true;
}


std::function<void()> loop;
void main_loop() { loop(); }


struct RenderModel {
    std::vector<vec3> vertices;
    std::vector<vec3> normals;
    std::vector<glm::ivec3> indicesF;
    std::vector<glm::ivec2> indicesE;
} renderModel;

void mainGUI(void (*callback)(void)) {
    using glm::vec2, glm::vec3, glm::vec4, glm::ivec2;

    // main loop
    loop = [&] {
        callback();

        using RenderParams::viewport;
        if (!viewport->renderNeeded) return;

        glViewport(0, 0, RenderParams::iResolution.x, RenderParams::iResolution.y);

        // draw
        viewport->initDraw3D();
        if (!renderModel.vertices.empty()) {
            glm::vec4 colorsF(0.9, 0.9, 0.9, 1);
            glm::vec4 colorsE(0.6, 0.6, 0.6, 1);
            viewport->drawVBO(
                renderModel.vertices, renderModel.normals, renderModel.indicesF,
                std::vector<glm::vec4>(renderModel.vertices.size(), colorsF));
            if (!renderModel.indicesE.empty()) viewport->drawLinesVBO(
                renderModel.vertices, renderModel.normals, renderModel.indicesE,
                std::vector<glm::vec4>(renderModel.vertices.size(), colorsE));
            // axes
            viewport->drawLinesVBO(
                { vec3(0), vec3(3, 0, 0),
                  vec3(0), vec3(0, -2.5, 0),
                  vec3(0), vec3(0, 0, 3) },
                std::vector<vec3>(6, vec3(0, 0, 1)),
                { ivec2(0, 1), ivec2(2, 3), ivec2(4, 5) },
                { vec4(1, 0, 0, 1), vec4(1, 0, 0, 1),
                  vec4(0, 0, 1, 1), vec4(0, 0, 1, 1),
                  vec4(0, 0.5, 0, 1), vec4(0, 0.5, 0, 1) },
                1.0f, 1.0f, -1.0f
            );
        }

        glfwSwapBuffers(RenderParams::window);
        glfwPollEvents();
    };

    main_loop();
    emscripten_set_main_loop(main_loop, 0, true);
    return;


    // Close OpenGL window and terminate GLFW
    glDeleteVertexArrays(1, &RenderParams::vertexArrayID);
    glfwTerminate();
    delete RenderParams::viewport;
}
