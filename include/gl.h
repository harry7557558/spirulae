#pragma once

#include <GL/glew.h>
#include <GLFW/glfw3.h>
#include "glm/glm.hpp"

#include <stdio.h>
#include <string>
#include <vector>


// compile shaders into a program
GLuint createShaderProgram(const char* vs_source, const char* fs_source) {
    // Create the shaders
    GLuint VertexShaderID = glCreateShader(GL_VERTEX_SHADER);
    GLuint FragmentShaderID = glCreateShader(GL_FRAGMENT_SHADER);
    GLint Result = GL_FALSE;
    int InfoLogLength;
    std::string errorMessage;

    bool success = true;

    // Vertex Shader
    glShaderSource(VertexShaderID, 1, &vs_source, NULL);
    glCompileShader(VertexShaderID);
    glGetShaderiv(VertexShaderID, GL_INFO_LOG_LENGTH, &InfoLogLength);
    if (InfoLogLength > 0) {
        errorMessage.resize(InfoLogLength + 1);
        glGetShaderInfoLog(VertexShaderID, InfoLogLength, NULL, &errorMessage[0]);
        printf("Vertex shader compile error.\n%s\n", &errorMessage[0]);
        success = false;
    }

    // Fragment Shader
    glShaderSource(FragmentShaderID, 1, &fs_source, NULL);
    glCompileShader(FragmentShaderID);
    glGetShaderiv(FragmentShaderID, GL_INFO_LOG_LENGTH, &InfoLogLength);
    if (InfoLogLength > 0) {
        errorMessage.resize(InfoLogLength + 1);
        glGetShaderInfoLog(FragmentShaderID, InfoLogLength, NULL, &errorMessage[0]);
        printf("Fragment shader compile error.\n%s\n", &errorMessage[0]);
        success = false;
    }

    // Link the program
    GLuint ProgramID = glCreateProgram();
    glAttachShader(ProgramID, VertexShaderID);
    glAttachShader(ProgramID, FragmentShaderID);
    glLinkProgram(ProgramID);
    glGetProgramiv(ProgramID, GL_INFO_LOG_LENGTH, &InfoLogLength);
    if (InfoLogLength > 1) {
        errorMessage.resize(InfoLogLength + 1);
        glGetProgramInfoLog(ProgramID, InfoLogLength, NULL, &errorMessage[0]);
        printf("Program linking error.\n%s\n", &errorMessage[0]);
        success = false;
    }

    glDetachShader(ProgramID, VertexShaderID);
    glDetachShader(ProgramID, FragmentShaderID);
    glDeleteShader(VertexShaderID);
    glDeleteShader(FragmentShaderID);
    if (!success) {
        glDeleteProgram(ProgramID);
        return -1;
    }
    return ProgramID;
}



class GlBatchEvaluator2 {
    std::string vsSource, fsSource;
    GLuint shaderProgram;
    GLuint framebuffer, texture;
    int textureW, textureH;

public:
    GlBatchEvaluator2(std::string funRaw);
    ~GlBatchEvaluator2();
    void evaluateFunction(size_t pn, const glm::vec2 *points, float *v);
};

GlBatchEvaluator2::GlBatchEvaluator2(std::string funRaw) {
    vsSource = R"(#version 300 es
        precision highp float;
        in vec4 aPosition;
        out vec2 vXy;
        void main() {
            gl_Position = vec4(aPosition.xy, 0.0, 1.0);
            gl_PointSize = 1.0;
            vXy = aPosition.zw;
        }
    )";
    fsSource = R"(#version 300 es
        precision highp float;
        in vec2 vXy;
        out vec4 fragColor;
        )" + funRaw + R"(

        void main() {
            // vec2 xy = texelFetch(coords, ivec2(gl_FragCoord.xy), 0).xy;
            // vec2 xy = gl_FragCoord.xy;
            float result = funRaw(vXy.x, vXy.y);
            fragColor = vec4(result, 0, 0, 1);
        }
    )";
    shaderProgram = createShaderProgram(&vsSource[0], &fsSource[0]);

    textureW = 256;
    textureH = 256;

    glGenFramebuffers(1, &framebuffer);
    glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);
    glGenTextures(1, &texture);
    glBindTexture(GL_TEXTURE_2D, texture);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, textureW, textureH, 0, GL_RGBA, GL_FLOAT, nullptr);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, texture, 0);
    if (glCheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE) {
        printf("Failed to create framebuffer.\n");
        throw "Failed to create framebuffer.";
    }
    glBindFramebuffer(GL_FRAMEBUFFER, (GLuint)NULL);
}

GlBatchEvaluator2::~GlBatchEvaluator2() {
    glDeleteShader(shaderProgram);
    glDeleteTextures(1, &texture);
    glDeleteFramebuffers(1, &framebuffer);
}


void GlBatchEvaluator2::evaluateFunction(
    size_t pn, const glm::vec2 *points, float *v) {

    if (shaderProgram == -1) {
        for (int i = 0; i < pn; i++)
            v[i] = 0.0f;
        return;
    }

    glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);
    glViewport(0, 0, textureW, textureH);

    GLuint vbo;
    glGenBuffers(1, &vbo);
    glBindBuffer(GL_ARRAY_BUFFER, vbo);
    std::vector<glm::vec4> coords(pn);
    for (int i = 0; i < pn; i++) {
        float x = i % textureW, y = i / textureW;
        coords[i] = glm::vec4(
            (glm::vec2(x, y) + 0.5f) / glm::vec2(textureW, textureH) * 2.0f - 1.0f,
            points[i]);
    }
    glBufferData(GL_ARRAY_BUFFER, sizeof(glm::vec4) * coords.size(), coords.data(), GL_STATIC_DRAW);

    glUseProgram(shaderProgram);
    GLint posAttrib = glGetAttribLocation(shaderProgram, "aPosition");
    glVertexAttribPointer(posAttrib, 4, GL_FLOAT, GL_FALSE, 0, 0);
    glEnableVertexAttribArray(posAttrib);

    glDrawArrays(GL_POINTS, 0, pn);

    std::vector<glm::vec4> pixels(textureW * textureH);
    glReadPixels(0, 0, textureW, textureH, GL_RGBA, GL_FLOAT, pixels.data());
    for (int i = 0; i < pn; i++)
        v[i] = pixels[i].x;

    glDeleteBuffers(1, &vbo);
    glBindFramebuffer(GL_FRAMEBUFFER, (GLuint)NULL);

}




class GlBatchEvaluator3 {
    std::string vsSource, fsSource;
    GLuint shaderProgram;
    GLuint framebuffer, texture;
    int textureW, textureH;

public:
    GlBatchEvaluator3(std::string funRaw);
    ~GlBatchEvaluator3();
    void evaluateFunction(size_t pn, const glm::vec3 *points, float *v);
};

GlBatchEvaluator3::GlBatchEvaluator3(std::string funRaw) {
    vsSource = R"(#version 300 es
        precision highp float;
        in vec2 aPosition;
        in vec3 aXyz;
        out vec3 vXyz;
        void main() {
            gl_Position = vec4(aPosition, 0.0, 1.0);
            gl_PointSize = 1.0;
            vXyz = aXyz;
        }
    )";
    fsSource = R"(#version 300 es
        precision highp float;
        in vec3 vXyz;
        out vec4 fragColor;
        )" + funRaw + R"(

        void main() {
            float result = funRaw(vXyz.x, vXyz.y, vXyz.z);
            fragColor = vec4(result, 0, 0, 1);
        }
    )";
    shaderProgram = createShaderProgram(&vsSource[0], &fsSource[0]);

    textureW = 256;
    textureH = 256;

    glGenFramebuffers(1, &framebuffer);
    glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);
    glGenTextures(1, &texture);
    glBindTexture(GL_TEXTURE_2D, texture);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, textureW, textureH, 0, GL_RGBA, GL_FLOAT, nullptr);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, texture, 0);
    if (glCheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE) {
        printf("Failed to create framebuffer.\n");
        throw "Failed to create framebuffer.";
    }
    glBindFramebuffer(GL_FRAMEBUFFER, (GLuint)NULL);
}

GlBatchEvaluator3::~GlBatchEvaluator3() {
    glDeleteShader(shaderProgram);
    glDeleteTextures(1, &texture);
    glDeleteFramebuffers(1, &framebuffer);
}


void GlBatchEvaluator3::evaluateFunction(
    size_t pn, const glm::vec3 *points, float *v) {

    if (shaderProgram == -1) {
        for (size_t i = 0; i < pn; i++)
            v[i] = 0.0f;
        return;
    }

    glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);
    glViewport(0, 0, textureW, textureH);
    glUseProgram(shaderProgram);
    glDisable(GL_DEPTH_TEST);
    glDisable(GL_BLEND);

    GLuint vbo;
    glGenBuffers(1, &vbo);
    GLuint vxyz;
    glGenBuffers(1, &vxyz);

    size_t batch_size = textureW * textureH;
    for (size_t batchi = 0; batchi < pn; batchi += batch_size) {
        size_t batchn = std::min(batch_size, pn - batchi);
    
        glBindBuffer(GL_ARRAY_BUFFER, vbo);
        std::vector<glm::vec2> coords(batchn);
        for (int i = 0; i < batchn; i++) {
            float x = i % textureW, y = i / textureW;
            coords[i] = (glm::vec2(x, y) + 0.5f) / glm::vec2(textureW, textureH) * 2.0f - 1.0f;
        }
        glBufferData(GL_ARRAY_BUFFER, sizeof(glm::vec2) * batchn, coords.data(), GL_STATIC_DRAW);
        GLint posAttrib = glGetAttribLocation(shaderProgram, "aPosition");
        glVertexAttribPointer(posAttrib, 2, GL_FLOAT, GL_FALSE, 0, 0);
        glEnableVertexAttribArray(posAttrib);

        glBindBuffer(GL_ARRAY_BUFFER, vxyz);
        glBufferData(GL_ARRAY_BUFFER, sizeof(glm::vec3) * batchn, &points[batchi], GL_STATIC_DRAW);
        GLint xyzAttrib = glGetAttribLocation(shaderProgram, "aXyz");
        glVertexAttribPointer(xyzAttrib, 3, GL_FLOAT, GL_FALSE, 0, 0);
        glEnableVertexAttribArray(xyzAttrib);

        glDrawArrays(GL_POINTS, 0, batchn);

        std::vector<glm::vec4> pixels(batch_size);
        glReadPixels(0, 0, textureW, textureH, GL_RGBA, GL_FLOAT, pixels.data());
        for (int i = 0; i < batchn; i++)
            v[batchi+i] = pixels[i].x;
        // break;
    }

    glDeleteBuffers(1, &vbo);
    glDeleteBuffers(1, &vxyz);
    glBindFramebuffer(GL_FRAMEBUFFER, (GLuint)NULL);

}
