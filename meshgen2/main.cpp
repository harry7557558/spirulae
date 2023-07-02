#pragma GCC optimize "O3"

#define SUPPRESS_ASSERT 1

#include <cstdio>
#include <random>

#include "solver.h"
#include "render.h"

#include "meshgen_trig_implicit.h"


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


RenderModel prepareMesh(DiscretizedModel<float, float> model, bool flatShading) {
    RenderModel res;

    // model
    res.vertices = std::vector<vec3>(model.N, vec3(0));
    res.normals = std::vector<vec3>(model.N, vec3(0));
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

    // normals
    for (auto fc : uniqueIndicesF) {
        assert(fc.second == 1);
        glm::ivec3 f = fc.first;
        vec3 n = glm::cross(
            res.vertices[f.y] - res.vertices[f.x],
            res.vertices[f.z] - res.vertices[f.x]);
        n = glm::dot(n, n) == 0. ? n : normalize(n);
        res.normals[f.x] += n, res.normals[f.y] += n, res.normals[f.z] += n;
    }
    for (int i = 0; i < (int)res.normals.size(); i++)
        res.normals[i] = normalize(res.normals[i]);

    // edges
    auto ivec2Cmp = [](glm::ivec2 a, glm::ivec2 b) {
        return a.x != b.x ? a.x < b.x : a.y < b.y;
    };
    std::set<glm::ivec2, decltype(ivec2Cmp)> uniqueIndicesE(ivec2Cmp);
    for (int ti = 0; ti < model.M; ti++) {
        ivec3 t = model.SE[ti];
        for (int _ = 0; _ < 3; _++) {
            glm::ivec2 e(t[_], t[(_+1)%3]);
            if (e.x > e.y) std::swap(e.x, e.y);
            uniqueIndicesE.insert(e);
        }
    }
    res.indicesE = std::vector<glm::ivec2>(uniqueIndicesE.begin(), uniqueIndicesE.end());

    // flat shading
    if (flatShading) {
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

void mainGUICallback() {
    if (newGlslFun.empty())
        return;
    if (glslFun == newGlslFun) {
        newGlslFun.clear();
        return;
    }

    printf("%s\n", &newGlslFun[0]);
    float t0 = getTimePast();
    DiscretizedModel<float, float> structure = generateMesh(newGlslFun);
    float t1 = getTimePast();
    printf("Total %.2g secs.\n\n", t1 - t0);
    renderModel = prepareMesh(structure, false);
    glslFun = newGlslFun;
    newGlslFun.clear();
}


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
    RenderParams::viewport->mouseScroll(-50.0f * log(sc));
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
void setBRenderMesh(bool showMesh) {
    RenderParams::showMesh = showMesh;
}


int main() {
    if (!initWindow())
        return -1;
    emscripten_run_script("wasmReady()");
    mainGUI(mainGUICallback);
    return 0;
}
