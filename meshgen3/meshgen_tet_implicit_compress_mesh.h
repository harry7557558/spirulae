#pragma once

#include "meshgen_misc.h"
using namespace MeshgenMisc;

namespace MeshgenTetLoss {
#include "meshgen_loss_tet.h"
#undef CASADI_PREFIX
#include "meshgen_loss_trig.h"
#undef CASADI_PREFIX
#include "meshgen_loss_edge.h"
}



#if MESHGEN_TET_IMPLICIT_USE_GL

class GlMaxMovementEvaluator {
    std::string vsSource, fsSource;
    GLuint shaderProgram;
    GLuint framebuffer, texture;
    int textureW, textureH;

public:
    GlMaxMovementEvaluator();
    ~GlMaxMovementEvaluator();
    void evaluate(size_t pn, const glm::mat4x3 *verts, const glm::mat4x3 *grads, glm::vec4 *mfs);
};

GlMaxMovementEvaluator::GlMaxMovementEvaluator() {
    vsSource = R"(#version 300 es
precision highp float;
layout(location=0) in vec2 aPosition;
layout(location=1) in vec3 vert0;
layout(location=2) in vec3 vert1;
layout(location=3) in vec3 vert2;
layout(location=4) in vec3 vert3;
layout(location=5) in vec3 grad0;
layout(location=6) in vec3 grad1;
layout(location=7) in vec3 grad2;
layout(location=8) in vec3 grad3;
out mat4x3 verts;
out mat4x3 grads;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    gl_PointSize = 1.0;
    verts = mat4x3(vert0, vert1, vert2, vert3);
    grads = mat4x3(grad0, grad1, grad2, grad3);;
})";
    fsSource = R"(#version 300 es
precision highp float;
in mat4x3 verts;
in mat4x3 grads;
out vec4 fragColor;

void main() {
    const int fvp[16] = int[16](
        0,1,2,3, 0,3,1,2, 0,2,3,1, 1,3,2,0
    );
    float mf[4] = float[4](1.0f,1.0f,1.0f,1.0f);
    vec3 v[4], g[4];
    for (int i = 0; i < 4; i++) {
        for (int _ = 0; _ < 4; _++) {
            int j = fvp[4*i+_];
            v[_] = verts[j], g[_] = grads[j];
        }
        // plane normal and distance to the vertex
        vec3 n = normalize(cross(v[1] - v[0], v[2] - v[0]));
        float d = dot(n, v[3] - v[0]);
        // how far you need to go to make it negative
        float d3 = max(-dot(n, g[3]), 0.0f);
        float k[4] = float[4](1.0f,1.0f,1.0f,1.0f);
        for (int _ = 0; _ < 3; _++) {
            float d_ = max(dot(n, g[_]), 0.0f);
            float ds = d_ + d3;
            if (ds == 0.0) continue;
            k[_] = min(k[_], d / ds);
        }
        k[3] = min(min(k[0], k[1]), k[2]);
        for (int _ = 0; _ < 4; _++)
            mf[fvp[4*i+_]] = min(mf[fvp[4*i+_]], k[_]);
    }
    fragColor = vec4(mf[0],mf[1],mf[2],mf[3]);
})";
    shaderProgram = createShaderProgram(&vsSource[0], &fsSource[0]);

    textureW = 512;
    textureH = 512;

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
    glBindFramebuffer(GL_FRAMEBUFFER, NULL);
}

GlMaxMovementEvaluator::~GlMaxMovementEvaluator() {
    glDeleteShader(shaderProgram);
    glDeleteTextures(1, &texture);
    glDeleteFramebuffers(1, &framebuffer);
}


void GlMaxMovementEvaluator::evaluate(
    size_t pn, const glm::mat4x3 *verts, const glm::mat4x3 *grads, glm::vec4 *mfs) {

    if (shaderProgram == -1) {
        assert(false);
        for (size_t i = 0; i < pn; i++)
            mfs[i] = vec4(1.0f);
        return;
    }

    glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);
    glViewport(0, 0, textureW, textureH);
    glUseProgram(shaderProgram);
    glDisable(GL_DEPTH_TEST);
    glDisable(GL_BLEND);

    GLuint vbo;
    glGenBuffers(1, &vbo);
    GLuint vverts;
    glGenBuffers(1, &vverts);
    GLuint vgrads;
    glGenBuffers(1, &vgrads);

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

        glBindBuffer(GL_ARRAY_BUFFER, vverts);
        glBufferData(GL_ARRAY_BUFFER, sizeof(glm::mat4x3) * batchn, &verts[batchi], GL_STATIC_DRAW);
        GLint vertsAttrib = glGetAttribLocation(shaderProgram, "vert0");
        for (int _ = 0; _ < 4; _++) {
            glVertexAttribPointer(vertsAttrib+_, 3, GL_FLOAT, GL_FALSE, sizeof(GLfloat)*12, (void*)(sizeof(float)*3*_));
            glEnableVertexAttribArray(vertsAttrib+_);
        }

        glBindBuffer(GL_ARRAY_BUFFER, vgrads);
        glBufferData(GL_ARRAY_BUFFER, sizeof(glm::mat4x3) * batchn, &grads[batchi], GL_STATIC_DRAW);
        GLint gradsAttrib = glGetAttribLocation(shaderProgram, "grad0");
        for (int _ = 0; _ < 4; _++) {
            glVertexAttribPointer(gradsAttrib+_, 3, GL_FLOAT, GL_FALSE, sizeof(GLfloat)*12, (void*)(sizeof(float)*3*_));
            glEnableVertexAttribArray(gradsAttrib+_);
        }

        glDrawArrays(GL_POINTS, 0, batchn);

        std::vector<glm::vec4> pixels(batch_size);
        glReadPixels(0, 0, textureW, textureH, GL_RGBA, GL_FLOAT, pixels.data());
        for (int i = 0; i < batchn; i++)
            mfs[batchi+i] = pixels[i];
        // break;

        for (int _ = 0; _ < 4; _++) {
            glDisableVertexAttribArray(vertsAttrib+_);
            glDisableVertexAttribArray(gradsAttrib+_);
        }
    }

    glDeleteBuffers(1, &vbo);
    glDeleteBuffers(1, &vverts);
    glDeleteBuffers(1, &vgrads);
    glBindFramebuffer(GL_FRAMEBUFFER, NULL);

}

GlMaxMovementEvaluator *glMaxMovementEvaluator = nullptr;

#endif



void calcMaxMovement(mat4x3 verts, mat4x3 grads, vec4 &mf) {
    const static int fvp[4][4] = {
        {0,1,2,3}, {0,3,1,2}, {0,2,3,1}, {1,3,2,0}
    };
    mf = vec4(1.0f);
    vec3 v[4], g[4];
    for (int i = 0; i < 4; i++) {
        for (int _ = 0; _ < 4; _++) {
            int j = fvp[i][_];
            v[_] = verts[j], g[_] = grads[j];
        }
        // plane normal and distance to the vertex
        vec3 n = normalize(cross(v[1] - v[0], v[2] - v[0]));
        float d = dot(n, v[3] - v[0]);
        assert(d > 0.0f);
        // how far you need to go to make it negative
        float d3 = fmax(-dot(n, g[3]), 0.0f);
        float k[4] = { 1.0f, 1.0f, 1.0f, 1.0f };
        for (int _ = 0; _ < 3; _++) {
            float d_ = fmax(dot(n, g[_]), 0.0f);
            float ds = d_ + d3;
            if (ds == 0.0) continue;
            k[_] = fmin(k[_], d / ds);
        }
        k[3] = fmin(fmin(k[0], k[1]), k[2]);
        for (int _ = 0; _ < 4; _++)
            mf[fvp[i][_]] = fmin(mf[fvp[i][_]], k[_]);
    }
}


// Refine the mesh, requires positive volumes for all tets
void compressMesh(
    std::vector<vec3>& verts,
    const std::vector<ivec4> &tets,
    const std::vector<ivec3> &faces,
    const std::vector<ivec4> &edges,
    int nsteps,
    ScalarFieldFBatch F = nullptr,
    std::function<vec3(vec3)> constraint = nullptr,  // add this to bring point back
    std::vector<bool> isConstrained_[3] = nullptr
) {
    int vn = (int)verts.size(), svn = 0;  // # of vertices; # on boundary
    int tn = (int)tets.size(), stn = 0;  // # of tets; # on boundary

    float time0 = getTimePast();

    // geometry
    std::vector<int> compressedIndex(vn, -1);  // [vn] global -> near boundary
    std::vector<int> fullIndex;  // [svn] near boundary -> global
    std::vector<int> surfaceTets;  // [stn] indices of tets near boundary
    std::vector<bool> isConstrained[4];  // [vn] constrained on domain boundary? (any, x, y, z)
    std::vector<bool> applyBoundaryConstraints(vn, false);  // [vn] constrained on isoboundary?
    auto isOnBoundary = [&](int i) {
        return isConstrained[0][i] || applyBoundaryConstraints[i];
    };
    // geometry and values
    std::vector<vec3> boundaryVertPs;  // [svn] positions
    std::vector<float> boundaryVertVals;  // [svn] function values
    std::vector<vec3> boundaryVertGrads, boundaryTetGrads;  // [svn, stn] gradients
    std::vector<float> boundaryVertGradWeights;  // [svn] used to project trig gradients to verts
    // smoothing
    std::vector<vec3> grads(vn);
    std::vector<float> maxFactor(vn), maxMovement(vn);

    // vertices near boundary
    for (int _ = 0; _ < 4; _++)
        isConstrained[_] = std::vector<bool>(vn, false);
    if (isConstrained_) {
        assert(isConstrained[0].size() == vn
             && isConstrained[1].size() == vn
             && isConstrained[2].size() == vn);
        for (int i = 0; i < vn; i++) {
            isConstrained[1][i] = isConstrained_[0][i];
            isConstrained[2][i] = isConstrained_[1][i];
            isConstrained[3][i] = isConstrained_[2][i];
            isConstrained[0][i] = isConstrained[1][i] || isConstrained[2][i] || isConstrained[3][i];
        }
    }
    if (F) {
        // on boundary
        for (ivec3 f : faces) {
            bool isC = isConstrained[0][f[0]]
                && isConstrained[0][f[1]]
                && isConstrained[0][f[2]];
            for (int _ = 0; _ < 3; _++) {
                if (compressedIndex[f[_]] == -1) {
                    compressedIndex[f[_]] = svn;
                    fullIndex.push_back(f[_]);
                    svn++;
                }
                if (!isC)
                    applyBoundaryConstraints[f[_]] = true;
            }
        }
        // one layer
        int i0 = 0, i1 = svn;
        for (int ti = 0; ti < tn; ti++) {
            ivec4 t = tets[ti];
            int onboundary = 0;
            for (int _ = 0; _ < 4; _++)
                if (compressedIndex[t[_]] >= i0 &&
                    compressedIndex[t[_]] < i1)
                    onboundary += 1;
            if (onboundary == 0)
                continue;
            surfaceTets.push_back(ti);
            for (int _ = 0; _ < 4; _++)
                if (compressedIndex[t[_]] == -1) {
                    compressedIndex[t[_]] = svn;
                    fullIndex.push_back(t[_]);
                    svn++;
                }
            stn++;
        }
        // make sure isOnBoundary() works
        std::vector<bool> onBoundary(vn, false);
        for (ivec3 f : faces)
            for (int _ = 0; _ < 3; _++)
                onBoundary[f[_]] = true;
        for (int i = 0; i < vn; i++)
            assert(onBoundary[i] == isOnBoundary(i));
    }
    boundaryVertPs.resize(svn);
    boundaryVertVals.resize(svn);
    boundaryVertGrads.resize(svn);
    boundaryVertGradWeights.resize(svn);
    boundaryTetGrads.resize(stn);

    float time1 = getTimePast();

    for (int stepi = 0; stepi < nsteps; stepi++) {

        /* Smoothing */

        float time0 = getTimePast();

        // accumulate gradient
        for (int i = 0; i < vn; i++)
            grads[i] = vec3(0.0);
        for (ivec4 tet : tets) {
            vec3 v[4], g[4];
            for (int _ = 0; _ < 4; _++)
                v[_] = verts[tet[_]];
            const float* vd = (const float*)&v[0];
            float val, size2;
            float* res[3] = { &val, (float*)g, &size2 };
            MeshgenTetLoss::meshgen_loss_tet(&vd, res, nullptr, nullptr, 0);
            for (int _ = 0; _ < 4; _++) {
                vec3 dg = 0.005f * g[_] * size2;
                if (std::isfinite(dot(dg, dg)))
                    grads[tet[_]] -= dg;
            }
        }
        for (ivec3 f : faces) {
            vec3 v[3], g[3];
            for (int _ = 0; _ < 3; _++)
                v[_] = verts[f[_]];
            const float *vd = (const float*)&v[0];
            float val, size2;
            float* res[3] = { &val, (float*)g, &size2 };
            MeshgenTetLoss::meshgen_loss_trig(&vd, res, nullptr, nullptr, 0);
            for (int _ = 0; _ < 3; _++) {
                vec3 dg = 0.02f * g[_] * size2;
                if (std::isfinite(dot(dg, dg)))
                    grads[f[_]] -= dg;
            }
        }
        for (ivec4 e : edges) {
            vec3 v[4], g[4];
            for (int _ = 0; _ < 4; _++)
                v[_] = verts[e[_]];
            const float *vd = (const float*)&v[0];
            float val, size2;
            float* res[3] = { &val, (float*)g, &size2 };
            MeshgenTetLoss::meshgen_loss_edge(&vd, res, nullptr, nullptr, 0);
            for (int _ = 0; _ < 4; _++) {
                vec3 dg = 0.02f * g[_] * size2;
                if (std::isfinite(dot(dg, dg)))
                    grads[e[_]] -= dg;
            }
        }

        float time1 = getTimePast();

        // force the mesh on the boundary
        if (F) {
            // evaluate
            for (int i = 0; i < svn; i++) {
                int j = fullIndex[i];
                if (j != -1)
                    boundaryVertPs[i] = verts[j] + grads[j];
            }
            F(svn, &boundaryVertPs[0], &boundaryVertVals[0]);
            // gradient on trigs
            for (int i = 0; i < stn; i++) {
                vec3 x[4]; float v[4];
                for (int _ = 0; _ < 4; _++) {
                    int j = compressedIndex[tets[surfaceTets[i]][_]];
                    assert(j >= 0 && j < svn);
                    x[_] = boundaryVertPs[j];
                    v[_] = boundaryVertVals[j];
                }
                mat3 m(x[1]-x[0], x[2]-x[0], x[3]-x[0]);
                vec3 b(v[1]-v[0], v[2]-v[0], v[3]-v[0]);
                boundaryTetGrads[i] = inverse(transpose(m)) * b;
            }
            // gradient on verts
            for (int i = 0; i < svn; i++) {
                boundaryVertGradWeights[i] = 0.0f;
                boundaryVertGrads[i] = vec3(0.0f);
            }
            for (int i = 0; i < stn; i++) {
                for (int _ = 0; _ < 4; _++) {
                    int j = compressedIndex[tets[surfaceTets[i]][_]];
                    boundaryVertGrads[j] += boundaryTetGrads[i];
                    boundaryVertGradWeights[j] += 1.0f;
                }
            }
            for (int i = 0; i < svn; i++) {
                if (boundaryVertGradWeights[i] <= 0.0f)
                    printf("%d %f\n", i, boundaryVertGradWeights[i]);
                assert(boundaryVertGradWeights[i] > 0.0f);
                boundaryVertGrads[i] /= boundaryVertGradWeights[i];
            }
            // move the vertex to the boundary
            for (int i = 0; i < svn; i++) {
                if (fullIndex[i] == -1)
                    continue;
                if (!applyBoundaryConstraints[fullIndex[i]])
                    continue;
                float v = boundaryVertVals[i];
                vec3 g = boundaryVertGrads[i];
                grads[fullIndex[i]] -= v * g / dot(g, g);
            }
        }

        float time2 = getTimePast();

        // apply boundary constraints
        for (int i = 0; i < vn; i++) {
            for (int _ = 0; _ < 3; _++)
                if (isConstrained[_ + 1][i])
                    ((float*)&grads[i])[_] = 0.0;
        }
        if (constraint) {
            for (int i = 0; i < vn; i++)
                grads[i] += constraint(verts[i] + grads[i]);
        }

        float time3 = getTimePast();

        // calculate maximum allowed vertex movement factor
        for (int i = 0; i < vn; i++)
            maxFactor[i] = 1.0, maxMovement[i] = 0.0;
    #if MESHGEN_TET_IMPLICIT_USE_GL
        std::vector<mat4x3> mfverts, mfgrads;
        mfverts.reserve(tets.size());
        mfgrads.reserve(tets.size());
        for (ivec4 tet : tets) {
            mat4x3 v, g;
            for (int _ = 0; _ < 4; _++) {
                int j = tet[_];
                v[_] = verts[j], g[_] = grads[j];
            }
            mfverts.push_back(v);
            mfgrads.push_back(g);
        }
        std::vector<vec4> mfs(tets.size());
        glMaxMovementEvaluator->evaluate(tets.size(), &mfverts[0], &mfgrads[0], &mfs[0]);
        for (int i = 0; i < (int)tets.size(); i++) {
            ivec4 tet = tets[i];
            mat4x3 v = mfverts[i];
            vec4 mf = mfs[i];
            for (int _ = 0; _ < 4; _++)
                maxFactor[tet[_]] = fmin(maxFactor[tet[_]],
                    mf[_] > 0.0f ? mf[_] : 1.0f);
            float sl = cbrt(abs(determinant(mat3(
                v[1] - v[0], v[2] - v[0], v[3] - v[0]
            )) / 6.0f));
            for (int _ = 0; _ < 4; _++)
                maxMovement[tet[_]] = fmax(maxMovement[tet[_]], sl);
        }
    #else
        for (ivec4 tet : tets) {
            // prevent going negative by passing through a face (doesn't work 100%)
            mat4x3 v, g;
            for (int _ = 0; _ < 4; _++) {
                int j = tet[_];
                v[_] = verts[j], g[_] = grads[j];
            }
            vec4 mf;
            calcMaxMovement(v, g, mf);
            for (int _ = 0; _ < 4; _++)
                maxFactor[tet[_]] = fmin(maxFactor[tet[_]],
                    mf[_] > 0.0f ? mf[_] : 1.0f);
            // prevent going crazy
            float sl = cbrt(abs(determinant(mat3(
                v[1] - v[0], v[2] - v[0], v[3] - v[0]
            )) / 6.0f));
            for (int _ = 0; _ < 4; _++)
                maxMovement[tet[_]] = fmax(maxMovement[tet[_]], sl);
        }
    #endif

        float time4 = getTimePast();

        // displacements
        for (int i = 0; i < vn; i++) {
            vec3 g = 0.9f * maxFactor[i] * grads[i];
            float gl = length(g);
            if (gl != 0.0f) {
                float a = maxMovement[i];
                g *= a * tanh(gl / a) / gl;
                if (std::isnan(g.x)) {
                    // printf("warning: nan displacement %d %f %f %f\n", i, a, gl, maxFactor[i]);
                    continue;
                }
            }
            grads[i] = g;
        }

        // expect this to drop to 0.1x after 20 iterations
        // if not, adjust step size
        float meanDisp = 0.0;
        int nanCount = 0;
        for (int i = 0; i < vn; i++) {
            float disp = length(grads[i]) / vn;
            if (std::isfinite(disp))
                meanDisp += disp;
            else nanCount++;
        }

        float time5 = getTimePast();

        // reduce displacement if negative volume occurs
        std::vector<bool> reduce(vn, true);
        for (int iter = 0; iter < 4; iter++) {
            // update vertex position
            const float r = 0.8f;
            float k = (iter == 0 ? 1.0f : (r - 1.0f) * pow(r, iter - 1.0f));
            for (int i = 0; i < vn; i++) if (reduce[i]) {
                vec3 dv = k * grads[i];
                if (std::isfinite(dot(dv, dv)))
                    verts[i] += dv;
            }
            // check if negative area occurs
            reduce = std::vector<bool>(vn, false);
            bool found = false;
            for (ivec4 tet : tets) {
                vec3 v[4] = {
                    verts[tet[0]], verts[tet[1]], verts[tet[2]], verts[tet[3]]
                };
                if (determinant(mat3(v[1]-v[0], v[2]-v[0], v[3]-v[0])) < 0.0f) {
                    reduce[tet[0]] = reduce[tet[1]] =
                        reduce[tet[2]] = reduce[tet[3]] = true;
                    found = true;
                    // printf("%d\n", iter);
                }
            }
            if (!found) break;
        }

        float time6 = getTimePast();

        // verbose
        char buf[1024];
        sprintf(buf, "%.2g + %.2g + %.2g + %.2g + %.2g + %.2g = %.2g secs",
            time1-time0, time2-time1, time3-time2, time4-time3, time5-time4, time6-time5, time6-time0);
        if (nanCount == 0)
            printf("%.3g: %s\n", meanDisp, buf);
        else
            printf("%.3g (%d nan): %s\n", meanDisp, nanCount, buf);
    }

    float time2 = getTimePast();
    printf("smoothMesh: %.2g + %.2g = %.2g secs\n",
        time1-time0, time2-time1, time2-time0);

}
