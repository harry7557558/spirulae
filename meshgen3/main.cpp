#pragma GCC optimize "O3"

#define SUPPRESS_ASSERT 0

#include <cstdio>
#include <random>

#include "render.h"

#include "meshgen_tet_implicit.h"

#include "../include/write_model.h"

#ifdef max
#undef max
#endif
#ifdef min
#undef min
#endif


void generateMesh(std::string funDeclaration, std::vector<vec3> &verts, std::vector<ivec4> &tets) {

    GlBatchEvaluator3 evaluator(funDeclaration);
    int batchEvalCount = 0;
    MeshgenTetImplicit::ScalarFieldFBatch Fs = [&](size_t n, const vec3 *p, float *v) {
        // printf("Batch eval %d %d\n", ++batchEvalCount, (int)n);
        evaluator.evaluateFunction(n, p, v);
        // for (size_t i = 0; i < n; i++) v[i] = length(p[i]) - 1.0f;
    };
    vec3 bc = vec3(0), br = vec3(2);
    auto constraint = [=](vec3 p) {
        p -= bc;
        return -vec3(
            sign(p.x) * fmax(abs(p.x) - br.x, 0.0),
            sign(p.y) * fmax(abs(p.y) - br.y, 0.0),
            sign(p.z) * fmax(abs(p.z) - br.z, 0.0)
        );
    };

    float t0 = getTimePast();
    verts.clear(), tets.clear();
    std::vector<bool> isConstrained[3];
    MeshgenTetImplicit::generateInitialMesh(
        Fs, bc-br, bc+br,
        // ivec3(14, 15, 16), 1,
        // ivec3(6, 7, 8), 2,
        ivec3(24), 2,
        verts, tets, isConstrained
    );
#if 0
    MeshgenTetImplicit::assertVolumeEqual(verts, trigs);
    float t1 = getTimePast();
    printf("Mesh generated in %.2g secs.\n", t1-t0);
    int vn0 = (int)verts.size();
    MeshgenTetImplicit::splitStickyVertices(verts, trigs, isConstrained);
    MeshgenTetImplicit::assertVolumeEqual(verts, trigs);
    float t2 = getTimePast();
    printf("Mesh cleaned in %.2g secs.\n", t2-t1);
    MeshgenTetImplicit::smoothMesh(
        verts, trigs, 5, Fs,
        constraint, isConstrained);
    MeshgenTetImplicit::assertVolumeEqual(verts, trigs);
    float t3 = getTimePast();
    printf("Mesh optimized in %.2g secs.\n", t3-t2);
#endif
}


namespace MeshParams {
    bool showEdges = true;
    bool smoothShading = true;
};


RenderModel prepareMesh(std::vector<vec3> verts, std::vector<ivec4> tets) {
    RenderModel res;

    // model
    res.vertices = std::vector<vec3>(verts.size());
    vec3 minv(1e10f), maxv(-1e10f);
    for (int i = 0; i < (int)verts.size(); i++) {
        vec3 v = verts[i];
        res.vertices[i] = v;
        minv = glm::min(minv, res.vertices[i]);
        maxv = glm::max(maxv, res.vertices[i]);
    }

    // faces
    auto ivec3Cmp = [](glm::ivec3 a, glm::ivec3 b) {
        // std::sort(&a.x, &a.x + 3);
        // std::sort(&b.x, &b.x + 3);
        return a.x != b.x ? a.x < b.x : a.y != b.y ? a.y < b.y : a.z < b.z;
    };
    std::set<glm::ivec3, decltype(ivec3Cmp)> uniqueIndicesF(ivec3Cmp);
    for (ivec4 t : tets) {
        for (int _ = 0; _ < 4; _++) {
            ivec3 f = ivec3(t[_], t[(_+1)%4], t[(_+2)%4]);
            if (_ % 2 == 0) std::swap(f.y, f.z);
            int i = f[0] < f[1] && f[0] < f[2] ? 0 :
                f[1] < f[2] && f[1] < f[0] ? 1 : 2;
            glm::ivec3 f1(f[i], f[(i + 1) % 3], f[(i + 2) % 3]);
            glm::ivec3 fo = glm::ivec3(f1.x, f1.z, f1.y);
            if (uniqueIndicesF.find(fo) != uniqueIndicesF.end())
                uniqueIndicesF.erase(fo);
            else uniqueIndicesF.insert(f1);
        }
    }
    for (glm::ivec3 f : uniqueIndicesF)
        res.indicesF.push_back(f);

    // edges
    auto ivec2Cmp = [](glm::ivec2 a, glm::ivec2 b) {
        return a.x != b.x ? a.x < b.x : a.y < b.y;
    };
    std::map<glm::ivec2, int, decltype(ivec2Cmp)> uniqueIndicesE(ivec2Cmp);
    for (glm::ivec3 t : res.indicesF) {
        for (int _ = 0; _ < 3; _++) {
            glm::ivec2 e(t[_], t[(_+1)%3]);
            if (e.x > e.y) std::swap(e.x, e.y);
            uniqueIndicesE[e] += 1;
        }
    }
    if (MeshParams::showEdges) {
        res.indicesE.reserve(uniqueIndicesE.size());
        for (std::pair<glm::ivec2, int> ec : uniqueIndicesE)
            res.indicesE.push_back(ec.first);
    }

    // normals
    res.normals = std::vector<vec3>(res.vertices.size(), vec3(0));
    for (auto f : res.indicesF) {
        vec3 n = glm::cross(
            res.vertices[f.y] - res.vertices[f.x],
            res.vertices[f.z] - res.vertices[f.x]);
        // n = glm::dot(n, n) == 0. ? n : normalize(n);
        res.normals[f.x] += n, res.normals[f.y] += n, res.normals[f.z] += n;
    }
    for (int i = 0; i < (int)res.normals.size(); i++)
        res.normals[i] = normalize(res.normals[i]);

    // flat shading
    if (!MeshParams::smoothShading) {
        std::vector<glm::ivec3> indicesF1;
        for (auto f : res.indicesF) {
            vec3 n = cross(
                res.vertices[f[1]] - res.vertices[f[0]],
                res.vertices[f[2]] - res.vertices[f[0]]
            );
            int vn = (int)res.vertices.size();
            for (int _ = 0; _ < 3; _++) {
                res.vertices.push_back(res.vertices[f[_]]);
                res.normals.push_back(n);
            }
            indicesF1.push_back(glm::ivec3(vn, vn + 1, vn + 2));
        }
        res.indicesF = indicesF1;
    }

    return res;
}



std::string glslFun = "";
std::string newGlslFun = "";

EXTERN EMSCRIPTEN_KEEPALIVE
void updateShaderFunction(const char* glsl) {
    newGlslFun = glsl;
}

namespace Prepared {
    std::vector<vec3> verts;
    std::vector<ivec4> tets;
}

void mainGUICallback() {
    if (newGlslFun.empty())
        return;
    if (glslFun == newGlslFun) {
        newGlslFun.clear();
        return;
    }

    // printf("newGlslFun:\n%s\n", &newGlslFun[0]);
    float t0 = getTimePast();
    generateMesh(newGlslFun, Prepared::verts, Prepared::tets);
    float t1 = getTimePast();
    printf("Total %.2g secs.\n \n", t1 - t0);
    renderModel = prepareMesh(Prepared::verts, Prepared::tets);
    glslFun = newGlslFun;
    newGlslFun.clear();
}


// viewport

EXTERN EMSCRIPTEN_KEEPALIVE
void setRenderNeeded(bool needed) {
    RenderParams::viewport->renderNeeded = needed;
}

EXTERN EMSCRIPTEN_KEEPALIVE
void translateState(float dx, float dy) {
    RenderParams::viewport->mouseMove(glm::vec2(dx, -dy));
}

EXTERN EMSCRIPTEN_KEEPALIVE
void scaleState(float dx, float dy, float sc) {
    RenderParams::viewport->mouseScroll(-25.0f * log(sc));
}

EXTERN EMSCRIPTEN_KEEPALIVE
void resizeWindow(int w, int h) {
    RenderParams::iResolution = glm::ivec2(w, h);
}

EXTERN EMSCRIPTEN_KEEPALIVE
void resetState() {
    if (RenderParams::viewport)
        delete RenderParams::viewport;
    RenderParams::viewport = new Viewport(
        0.4f, glm::vec3(0.0f), -0.45f * PIf, 0.1f * PIf);
}

EXTERN EMSCRIPTEN_KEEPALIVE
void setScreenCenter(float x, float y) {
    glm::vec2 screenCenter(x, y);
    if (screenCenter != RenderParams::screenCenter) {
        RenderParams::screenCenter = screenCenter;
        RenderParams::viewport->renderNeeded = true;
    }
}


// display mode

EXTERN EMSCRIPTEN_KEEPALIVE
void setMeshShowEdges(bool showEdges) {
    if (MeshParams::showEdges != showEdges) {
        MeshParams::showEdges = showEdges;
        renderModel = prepareMesh(Prepared::verts, Prepared::tets);
    }
}

EXTERN EMSCRIPTEN_KEEPALIVE
void setMeshSmoothShading(bool smoothShading) {
    if (MeshParams::smoothShading != smoothShading) {
        MeshParams::smoothShading = smoothShading;
        renderModel = prepareMesh(Prepared::verts, Prepared::tets);
    }
}


// file export

std::vector<uint8_t> fileBuffer;

EXTERN EMSCRIPTEN_KEEPALIVE
bool isModelEmpty() {
    return renderModel.vertices.empty()
        || renderModel.indicesF.empty();
}

EXTERN EMSCRIPTEN_KEEPALIVE
size_t getFileSize() {
    return fileBuffer.size();
}

EXTERN EMSCRIPTEN_KEEPALIVE
uint8_t* generateSTL() {
    fileBuffer = writeSTL(
        renderModel.vertices,
        *(std::vector<ivec3>*)&renderModel.indicesF
    );
    return fileBuffer.data();
}

EXTERN EMSCRIPTEN_KEEPALIVE
uint8_t* generatePLY() {
    if (MeshParams::smoothShading) {
        fileBuffer = writePLY(
            renderModel.vertices,
            *(std::vector<ivec3>*)&renderModel.indicesF,
            renderModel.normals
        );
    }
    else {
        MeshParams::smoothShading = true;
        RenderModel model = prepareMesh(Prepared::verts, Prepared::tets);
        fileBuffer = writePLY(
            model.vertices,
            *(std::vector<ivec3>*)&model.indicesF
        );
        MeshParams::smoothShading = false;
    }
    return fileBuffer.data();
}

EXTERN EMSCRIPTEN_KEEPALIVE
uint8_t* generateOBJ() {
    if (MeshParams::smoothShading) {
        fileBuffer = writeOBJ(
            renderModel.vertices,
            *(std::vector<ivec3>*)&renderModel.indicesF,
            renderModel.normals
        );
    }
    else {
        MeshParams::smoothShading = true;
        RenderModel model = prepareMesh(Prepared::verts, Prepared::tets);
        fileBuffer = writeOBJ(
            model.vertices,
            *(std::vector<ivec3>*)&model.indicesF
        );
        MeshParams::smoothShading = false;
    }
    return fileBuffer.data();
}

EXTERN EMSCRIPTEN_KEEPALIVE
uint8_t* generateGLB() {
    if (MeshParams::smoothShading) {
        fileBuffer = writeGLB(
            renderModel.vertices,
            *(std::vector<ivec3>*)&renderModel.indicesF,
            renderModel.normals
        );
    }
    else {
        MeshParams::smoothShading = true;
        RenderModel model = prepareMesh(Prepared::verts, Prepared::tets);
        fileBuffer = writeGLB(
            model.vertices,
            *(std::vector<ivec3>*)&model.indicesF
        );
        MeshParams::smoothShading = false;
    }
    return fileBuffer.data();
}


// main

int main() {
    if (!initWindow())
        return -1;
    emscripten_run_script("wasmReady()");
    mainGUI(mainGUICallback);
    return 0;
}
