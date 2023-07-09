#pragma GCC optimize "O3"

#define SUPPRESS_ASSERT 1

#include <cstdio>
#include <random>

#include "solver.h"
#include "render.h"

#include "meshgen_trig_implicit.h"

#include "write_model.h"


DiscretizedModel<float, float> generateMesh(std::string funDeclaration) {

    GlBatchEvaluator evaluator(funDeclaration);
    int batchEvalCount = 0;
    MeshgenTrigImplicit::ScalarFieldFBatch Fs = [&](size_t n, const vec2 *p, float *v) {
        // printf("Batch eval %d %d\n", ++batchEvalCount, (int)n);
        evaluator.evaluateFunction(n, p, v);
    };
    vec2 bc = vec2(0), br = vec2(2);
    auto constraint = [=](vec2 p) {
        p -= bc;
        return -vec2(
            sign(p.x) * fmax(abs(p.x) - br.x, 0.0),
            sign(p.y) * fmax(abs(p.y) - br.y, 0.0)
        );
    };

    float t0 = getTimePast();
    std::vector<vec2> vs;
    std::vector<ivec3> trigs;
    std::vector<bool> isConstrained[2];
    MeshgenTrigImplicit::generateInitialMesh(
        Fs, bc-br, bc+br,
        // ivec2(16, 16), 5,
        // ivec2(32, 32), 4,
        ivec2(48, 48), 3,
        // ivec2(64, 64), 3,
        vs, trigs, isConstrained
    );
    MeshgenTrigImplicit::assertAreaEqual(vs, trigs);
    float t1 = getTimePast();
    printf("Mesh generated in %.2g secs.\n", t1-t0);
    int vn0 = (int)vs.size();
    MeshgenTrigImplicit::splitStickyVertices(vs, trigs, isConstrained);
    MeshgenTrigImplicit::assertAreaEqual(vs, trigs);
    float t2 = getTimePast();
    printf("Mesh cleaned in %.2g secs.\n", t2-t1);
    MeshgenTrigImplicit::smoothMesh(
        vs, trigs, 5, Fs,
        constraint, isConstrained);
    MeshgenTrigImplicit::assertAreaEqual(vs, trigs);
    float t3 = getTimePast();
    printf("Mesh optimized in %.2g secs.\n", t3-t2);

    DiscretizedModel<float, float> res = solveLaplacianLinearTrig(
        vs, std::vector<float>(vs.size(), 4.0f), trigs);
    for (int i = 0; i < res.N; i++)
        res.U[i] = 1.0f*sqrt(fmax(res.U[i], 0.0f));
    float maxu = 0.0; for (int i = 0; i < res.N; i++) maxu = fmax(maxu, res.U[i]);
    printf("height: %f\n", maxu);
    return res;
}


namespace MeshParams {
    bool showEdges = true;
    bool smoothShading = true;
    bool bothLeafs = true;
};


RenderModel prepareMesh(DiscretizedModel<float, float> model) {
    RenderModel res;

    // model
    res.vertices = std::vector<vec3>(model.N, vec3(0));
    vec3 minv(1e10f), maxv(-1e10f);
    for (int i = 0; i < model.N; i++) {
        vec3 v = vec3(model.X[i], model.U[i]);
        res.vertices[i] = vec3(v.x, -v.z, v.y);
        minv = glm::min(minv, res.vertices[i]);
        maxv = glm::max(maxv, res.vertices[i]);
    }

    // faces
    auto ivec3Cmp = [](glm::ivec3 a, glm::ivec3 b) {
        // std::sort(&a.x, &a.x + 3);
        // std::sort(&b.x, &b.x + 3);
        return a.x != b.x ? a.x < b.x : a.y != b.y ? a.y < b.y : a.z < b.z;
    };
    std::map<glm::ivec3, int, decltype(ivec3Cmp)> uniqueIndicesF(ivec3Cmp);  // count
    for (int ti = 0; ti < model.M; ti++) {
        ivec3 t0 = model.SE[ti];
        assert(t0[0] != t0[1] && t0[0] != t0[2]);
        int i = t0[0] < t0[1] && t0[0] < t0[2] ? 0 :
            t0[1] < t0[2] && t0[1] < t0[0] ? 1 : 2;
        glm::ivec3 t(t0[i], t0[(i + 1) % 3], t0[(i + 2) % 3]);
        uniqueIndicesF[t] += 1;
        t = glm::ivec3(t.x, t.z, t.y);
        assert(uniqueIndicesF.find(t) == uniqueIndicesF.end());
    }
    for (auto p : uniqueIndicesF) //if (p.second == 1)
        res.indicesF.push_back(p.first);

    // edges
    auto ivec2Cmp = [](glm::ivec2 a, glm::ivec2 b) {
        return a.x != b.x ? a.x < b.x : a.y < b.y;
    };
    std::map<glm::ivec2, int, decltype(ivec2Cmp)> uniqueIndicesE(ivec2Cmp);
    for (int ti = 0; ti < model.M; ti++) {
        ivec3 t = model.SE[ti];
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

    // two leafs
    if (MeshParams::bothLeafs) {
        // get boundary
        int vn = (int)res.vertices.size();
        std::vector<int> bmap(vn, -1);
        for (std::pair<glm::ivec2, int> ec : uniqueIndicesE)
            if (ec.second == 1) {
                bmap[ec.first.x] = 0;
                bmap[ec.first.y] = 0;
            }
        int bmapI = vn;
        for (int i = 0; i < vn; i++) {
            if (bmap[i] == -1) {
                bmap[i] = bmapI;
                bmapI++;
            }
            else bmap[i] = i;
        }
        // expand verts
        res.vertices.resize(bmapI);
        for (int i = 0; i < vn; i++) {
            if (bmap[i] != i)
                res.vertices[bmap[i]] = res.vertices[i] * glm::vec3(1, -1, 1);
        }
        // expand faces
        int fn = (int)res.indicesF.size();
        res.indicesF.reserve(2 * fn);
        for (int i = 0; i < fn; i++) {
            glm::ivec3 f = res.indicesF[i];
            f.x = bmap[f.x], f.y = bmap[f.y], f.z = bmap[f.z];
            std::swap(f.y, f.z);
            res.indicesF.push_back(f);
        }
        // expand edges
        int en = (int)res.indicesE.size();
        res.indicesE.reserve(2 * en);
        for (int i = 0; i < en; i++) {
            glm::ivec2 e = res.indicesE[i];
            e.x = bmap[e.x], e.y = bmap[e.y];
            if (e != res.indicesE[i])
                res.indicesE.push_back(e);
        }
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

DiscretizedModel<float, float> structure;

void mainGUICallback() {
    if (newGlslFun.empty())
        return;
    if (glslFun == newGlslFun) {
        newGlslFun.clear();
        return;
    }

    // printf("%s\n", &newGlslFun[0]);
    float t0 = getTimePast();
    structure = generateMesh(newGlslFun);
    float t1 = getTimePast();
    printf("Total %.2g secs.\n \n", t1 - t0);
    renderModel = prepareMesh(structure);
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
        renderModel = prepareMesh(structure);
    }
}

EXTERN EMSCRIPTEN_KEEPALIVE
void setMeshSmoothShading(bool smoothShading) {
    if (MeshParams::smoothShading != smoothShading) {
        MeshParams::smoothShading = smoothShading;
        renderModel = prepareMesh(structure);
    }
}

EXTERN EMSCRIPTEN_KEEPALIVE
void setMeshBothLeafs(bool bothLeafs) {
    if (MeshParams::bothLeafs != bothLeafs) {
        MeshParams::bothLeafs = bothLeafs;
        renderModel = prepareMesh(structure);
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
        RenderModel model = prepareMesh(structure);
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
        RenderModel model = prepareMesh(structure);
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
        RenderModel model = prepareMesh(structure);
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
