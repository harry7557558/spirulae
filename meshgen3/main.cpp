#pragma GCC optimize "O2"

#define SUPPRESS_ASSERT 0

#include <cstdio>
#include <random>

#include "meshgen_tet_implicit.h"

#include "../include/write_model.h"

#ifndef __EMSCRIPTEN__
#define EXTERN
#define EMSCRIPTEN_KEEPALIVE
#endif

#ifdef max
#undef max
#endif
#ifdef min
#undef min
#endif


struct DecimationParameters {
    bool decimate;
    float shapeCost;
    float angleCost;
};


namespace MeshgenParams {
    vec3 bc;
    vec3 br;
    ivec3 bn;
    int nd;
};

EXTERN EMSCRIPTEN_KEEPALIVE
void setMeshgenParams(float br, int bn, int nd) {
    MeshgenParams::bc = vec3(0);
    MeshgenParams::br = vec3(br);
    MeshgenParams::bn = ivec3(bn);
    MeshgenParams::nd = nd;
}

#include "render.h"

void generateMesh(
    std::string funDeclaration,
    std::vector<vec3> &verts,
    std::vector<ivec4> &tets, std::vector<ivec3> &faces, std::vector<ivec4> &edges,
    DecimationParameters decimate
) {

    GlBatchEvaluator3 evaluator(funDeclaration, false);
    int batchEvalCount = 0;
    vec3 bc = MeshgenParams::bc;
    vec3 br = MeshgenParams::br;
    MeshgenTetImplicit::ScalarFieldFBatch Fs = [&](size_t n, const vec3 *p, float *v) {
        // printf("Batch eval %d %d\n", ++batchEvalCount, (int)n);
        evaluator.evaluateFunction(n, p, v);
        for (size_t i = 0; i < n; i++) {
            vec3 dp = abs(p[i] - bc) / br;
            float clip = fmax(dp.x, fmax(dp.y, dp.z));
            v[i] = std::isfinite(v[i]) ? fmax(v[i], clip-1.0f) : clip;
        }
    };
    auto constraint = [=](vec3 p) {
        p -= bc;
        return -vec3(
            sign(p.x) * fmax(abs(p.x) - br.x, 0.0),
            sign(p.y) * fmax(abs(p.y) - br.y, 0.0),
            sign(p.z) * fmax(abs(p.z) - br.z, 0.0)
        );
    };

    float t0 = getTimePast();
    verts.clear(), tets.clear(), faces.clear();
    std::vector<bool> isConstrained0[3];
#if 0
    MeshgenTetImplicit::generateInitialMesh(
        Fs, bc-br, bc+br,
        // ivec3(14, 15, 16), 1,
        // ivec3(16), 0,
        // ivec3(6, 7, 8), 1,
        ivec3(32), 1,
        // ivec3(16), 2,
        verts, tets, isConstrained0
    );
    std::vector<float> funvals(verts.size());
    Fs(verts.size(), &verts[0], &funvals[0]);
    std::vector<bool> sticky = MeshgenTetImplicit::findStickyVertices(verts, tets);
    std::vector<bool> isConstrained[3];
    MeshgenTetImplicit::cutIsosurface(
        std::vector<vec3>(verts), funvals, sticky, std::vector<ivec4>(tets), isConstrained0,
        verts, tets, isConstrained);
    MeshgenTetImplicit::restoreSurface(tets, faces, edges);
    printf("%d verts, %d tets, %d faces, %d edges\n",
        (int)verts.size(), (int)tets.size(), (int)faces.size(), (int)edges.size());
    // MeshgenTetImplicit::splitStickyVertices(verts, tets, faces, edges, isConstrained);
    // assert(MeshgenTetImplicit::isVolumeConsistent(verts, tets));
    MeshgenTetImplicit::compressMesh(
        verts, tets, faces, edges, 5, Fs,
        constraint, isConstrained);
#else
    const ivec3 bn = MeshgenParams::bn;
    const int nd = MeshgenParams::nd;
    vec3 expd = 1.0f + 0.05f/vec3(bn-1)*exp2f(-nd);
    MeshgenTetImplicit::marchingCubes(
        Fs, bc-expd*br, bc+expd*br,
        bn, nd,
        verts, faces, isConstrained0
    );
    if (decimate.decimate) {
        MeshgenTetImplicit::restoreEdges(faces, edges);
        MeshgenTetImplicit::MeshDecimatorEC(verts, faces, edges,
            // 0.3f/length(vec3(bn-1))*exp2f(-nd),
            0.02f/sqrt(length(vec3(bn-1))*exp2f(nd)),
            decimate.shapeCost, decimate.angleCost).decimateMesh();
    }
    else {
        // MeshgenTetImplicit::mergeEdge(verts, faces, false, 0.4);
        // MeshgenTetImplicit::mergeEdge(verts, faces, true, 0.25);
        MeshgenTetImplicit::restoreEdges(faces, edges);
    }
#endif
}


namespace MeshParams {
    bool showEdges = true;
    bool smoothShading = true;
    std::string colorSource;
};


RenderModel prepareMesh(
    std::string funDeclaration,
    std::vector<vec3> verts,
    std::vector<ivec4> tets, std::vector<ivec3> faces, std::vector<ivec4> edges
) {
    RenderModel res;

    float time0 = getTimePast();

    // model
    vec3 minv(1e10f), maxv(-1e10f);
    for (vec3 v : verts) {
        minv = glm::min(minv, v);
        maxv = glm::max(maxv, v);
    }

    res.indicesF = faces;
    if (MeshParams::showEdges) {
        res.indicesE.resize(edges.size());
        for (int i = 0; i < (int)edges.size(); i++) {
            res.indicesE[i] = ivec2(edges[i].x, edges[i].y);
        }
    }
    else res.indicesE.clear();

    float time1 = getTimePast();

    // remove unused vertices
    std::vector<int> vmap(verts.size(), -1);
    for (ivec3 t : res.indicesF)
        vmap[t[0]] = vmap[t[1]] = vmap[t[2]] = 1;
    res.vertices.clear();
    for (int i = 0; i < (int)verts.size(); i++) {
        if (vmap[i] != -1) {
            vmap[i] = (int)res.vertices.size();
            res.vertices.push_back(verts[i]);
        }
    }
    for (int i = 0; i < (int)res.indicesF.size(); i++) {
        for (int _ = 0; _ < 3; _++)
            res.indicesF[i][_] = vmap[res.indicesF[i][_]];
    }
    for (int i = 0; i < (int)res.indicesE.size(); i++) {
        for (int _ = 0; _ < 2; _++)
            res.indicesE[i][_] = vmap[res.indicesE[i][_]];
    }
    int vn = (int)res.vertices.size();
    int en = (int)res.indicesE.size();
    int fn = (int)res.indicesF.size();

    float time2 = getTimePast();

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

    // vertex colors
    if (!MeshParams::colorSource.empty()) {
        res.colors.resize(vn);
        GlBatchEvaluator3 evaluator(funDeclaration+MeshParams::colorSource, true);
        evaluator.evaluateFunction(vn, res.vertices.data(), (float*)&res.colors[0]);
        res.useVertexColor = true;
    }
    else res.useVertexColor = false;

    // flat shading
    if (!MeshParams::smoothShading) {
        std::vector<glm::ivec3> indicesF1;
        indicesF1.reserve(fn);
        std::vector<glm::vec3> vertices;
        std::vector<glm::vec3> normals;
        vertices.reserve(3*vn);
        normals.reserve(3*vn);
        std::vector<glm::vec4> colors;
        colors.reserve(3*res.colors.size());
        std::vector<int> vmap(vn, -1);
        for (auto f : res.indicesF) {
            vec3 n = cross(
                res.vertices[f[1]] - res.vertices[f[0]],
                res.vertices[f[2]] - res.vertices[f[0]]
            );
            int vn = (int)vertices.size();
            for (int _ = 0; _ < 3; _++) {
                vertices.push_back(res.vertices[f[_]]);
                if (res.colors.size())
                    colors.push_back(res.colors[f[_]]);
                normals.push_back(n);
                vmap[f[_]] = vn + _;
            }
            indicesF1.push_back(glm::ivec3(vn, vn + 1, vn + 2));
        }
        res.indicesF = indicesF1;
        res.vertices = vertices;
        res.normals = normals;
        res.colors = colors;
        for (int i = 0; i < en; i++)
            for (int _ = 0; _ < 2; _++)
                res.indicesE[i][_] = vmap[res.indicesE[i][_]];
    }

    float time3 = getTimePast();

    printf("prepareMesh: %.2g + %.2g + %.2g = %.2g secs\n",
        time1-time0, time2-time1, time3-time2, time3-time0);
    printf("(v e f v-e+f) = %d %d %d %d\n", vn, en, fn, vn-en+fn);
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
    std::vector<ivec3> faces;
    std::vector<ivec4> edges;
}

EXTERN EMSCRIPTEN_KEEPALIVE
void regenerateMesh() {
    float t0 = getTimePast();
    generateMesh(glslFun,
        Prepared::verts, Prepared::tets, Prepared::faces, Prepared::edges,
        { false, 0.0f, 0.0f });
    float t1 = getTimePast();
    printf("Total %.2g secs.\n \n", t1 - t0);
    renderModel = prepareMesh(glslFun, Prepared::verts, Prepared::tets, Prepared::faces, Prepared::edges);
}

void mainGUICallback() {
    if (newGlslFun.empty())
        return;
    if (glslFun == newGlslFun) {
        newGlslFun.clear();
        return;
    }
    glslFun = newGlslFun;
    newGlslFun.clear();
    #ifndef __EMSCRIPTEN__
        return;
    #endif

    regenerateMesh();
}

EXTERN EMSCRIPTEN_KEEPALIVE
void decimateMesh(bool shapeCost, bool angleCost) {
    float t0 = getTimePast();
    generateMesh(glslFun,
        Prepared::verts, Prepared::tets, Prepared::faces, Prepared::edges,
        { true, shapeCost ? 2.0f : 0.0f, angleCost ? 0.5f : 0.0f });
    float t1 = getTimePast();
    printf("Total %.2g secs.\n \n", t1 - t0);
    renderModel = prepareMesh(glslFun, Prepared::verts, Prepared::tets, Prepared::faces, Prepared::edges);
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
        renderModel = prepareMesh(glslFun, Prepared::verts, Prepared::tets, Prepared::faces, Prepared::edges);
    }
}

EXTERN EMSCRIPTEN_KEEPALIVE
void setMeshSmoothShading(bool smoothShading) {
    if (MeshParams::smoothShading != smoothShading) {
        MeshParams::smoothShading = smoothShading;
        renderModel = prepareMesh(glslFun, Prepared::verts, Prepared::tets, Prepared::faces, Prepared::edges);
    }
}

EXTERN EMSCRIPTEN_KEEPALIVE
void setColorSource(const char colorSource_[]) {
    std::string colorSource(colorSource_);
    if (MeshParams::colorSource != colorSource) {
        MeshParams::colorSource = colorSource;
        renderModel = prepareMesh(glslFun, Prepared::verts, Prepared::tets, Prepared::faces, Prepared::edges);
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
            renderModel.normals,
            renderModel.useVertexColor ? renderModel.colors : std::vector<vec4>()
        );
    }
    else {
        MeshParams::smoothShading = true;
        RenderModel model = prepareMesh(glslFun, Prepared::verts, Prepared::tets, Prepared::faces, Prepared::edges);
        fileBuffer = writePLY(
            model.vertices,
            *(std::vector<ivec3>*)&model.indicesF,
            std::vector<vec3>(),
            renderModel.useVertexColor ? model.colors : std::vector<vec4>()
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
        RenderModel model = prepareMesh(glslFun, Prepared::verts, Prepared::tets, Prepared::faces, Prepared::edges);
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
            renderModel.normals,
            renderModel.useVertexColor ? renderModel.colors : std::vector<vec4>()
        );
    }
    else {
        MeshParams::smoothShading = true;
        RenderModel model = prepareMesh(glslFun, Prepared::verts, Prepared::tets, Prepared::faces, Prepared::edges);
        fileBuffer = writeGLB(
            model.vertices,
            *(std::vector<ivec3>*)&model.indicesF,
            std::vector<vec3>(),
            renderModel.useVertexColor ? model.colors : std::vector<vec4>()
        );
        MeshParams::smoothShading = false;
    }
    return fileBuffer.data();
}


// main

int main() {

#ifdef __EMSCRIPTEN__

    if (!initWindow())
        return -1;
    MeshgenTetImplicit::initMeshGenerator();

    emscripten_run_script("wasmReady()");
    mainGUI(mainGUICallback);

#else

    if (!initWindow())
        return -1;
    MeshgenTetImplicit::initMeshGenerator();
    glslFun = "float funRaw(float x, float y, float z) { return z-x*y; }";

    float t0 = getTimePast();
    generateMesh(glslFun,
        Prepared::verts, Prepared::tets, Prepared::faces, Prepared::edges,
        { true, 0.0f, 0.0f });
    float t1 = getTimePast();
    printf("Total %.2g secs.\n \n", t1 - t0);
    renderModel = prepareMesh(glslFun, Prepared::verts, Prepared::tets, Prepared::faces, Prepared::edges);

    mainGUI(mainGUICallback);

#endif

    return 0;
}
