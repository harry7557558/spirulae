#pragma once

#include "meshgen_misc.h"
using namespace MeshgenMisc;


// https://graphics.stanford.edu/courses/cs468-10-fall/LectureSlides/08_Simplification.pdf
// http://www.cs.cmu.edu/~./garland/Papers/quadrics.pdf

// costs:
// - fewer faces
// - low error
// - equilateral triangle shape
// - flat dihedral angles
// - valence balance
// constraints:
// - manifold

// idea:
// - compute cost reduction for each edge contract
// - while there's positive cost reduction
//      - contract the edge that results in highest cost reduction
//      - update cost reduction of affected edges


#include "maxsegtree.h"

namespace MeshgenECLoss {
#undef CASADI_PREFIX
#include "ec_loss_trig.h"
#undef CASADI_PREFIX
}

class MeshDecimatorEC {
public:
    MeshDecimatorEC(
        std::vector<vec3> &verts,
        std::vector<ivec3> &faces,
        std::vector<ivec4> &edges,
        float targetAccuracy,
        float shapeCost = 0.0f, float angleCost = 0.0f) :
        verts(verts), faces(faces), edges(edges),
        targetAccuracy(targetAccuracy), shapeCost(shapeCost), angleCost(angleCost),
        isVertRemoved(verts.size(), false),
        isFaceRemoved(faces.size(), false),
        isEdgeRemoved(edges.size(), false),
        edgeVerts(edges.size()) {
            if (verts.empty()) edgeCost = nullptr;
            else edgeCost = new MaxSegmentTree(computeCostReduction());
        }
    ~MeshDecimatorEC() {
        delete edgeCost;
    }

    void decimateMesh();

private:
    std::vector<vec3> &verts;
    std::vector<ivec3> &faces;
    std::vector<ivec4> &edges;
    std::vector<bool> isVertRemoved;
    std::vector<bool> isFaceRemoved;
    std::vector<bool> isEdgeRemoved;
    std::vector<mat3> Q;
    std::vector<vec3> edgeVerts;

    float targetAccuracy;
    float shapeCost;
    float angleCost;

    MaxSegmentTree *edgeCost;  // cost reduction

    std::vector<std::vector<int>> neighborVerts;
    std::vector<std::vector<int>> neighborFaces;
    std::vector<std::vector<int>> neighborEdges;
    static bool insertElement(std::vector<int> &v, int x) {
        bool has = false;
        for (int x1 : v)
            if (x1 == x) has = true;
        if (!has)
            v.push_back(x);
        return !has;
    }
    static bool insertNeighbor(
            std::vector<std::vector<int>>& neighbors, int i, int j) {
        if (i == -1 || j == -1) return false;
        return insertElement(neighbors[i], j);
    }
    static bool eraseElement(std::vector<int> &v, int x) {
        size_t v0 = v.size();
        v.erase(std::remove(v.begin(), v.end(), x), v.end());
        return v.size() < v0;
    }
    static bool eraseNeighbor(
            std::vector<std::vector<int>>& neighbors, int i, int j) {
        if (i == -1 || j == -1) return false;
        return eraseElement(neighbors[i], j);
    }
    void assertNeighborCorrectness();

    // costs
    void computeErrorQuadrics();
    mat3 computeErrorQuadrics(int vi);
    float computeCostReductionInfeasibleOnly(int ei, vec3 &vmean);
    float computeCostReductionErrorOnly(int ei, vec3 &vmean);
    float computeCostReduction(int ei, vec3 &vmean);
    std::vector<float> computeCostReduction();

    // decimation
    vec3 computeNewVertexLocation(ivec2 e);
    void contractEdge(int ei);

    // misc
    vec3 getUnitNormal(ivec3 f) {
        return normalize(cross(
            verts[f.y]-verts[f.x], verts[f.z]-verts[f.x]
        ));
    }

    constexpr static float LARGE = 1e6f;

    // profiling
    double totalTime = 0.0;
    double lastTime = 0.0;
    void startTiming() {
        lastTime = std::chrono::duration<double>(
            std::chrono::high_resolution_clock::now() - _TIME_START).count();
    }
    void stopTiming() {
        totalTime += std::chrono::duration<double>(
            std::chrono::high_resolution_clock::now() - _TIME_START).count()
            - lastTime;
    }
    double getTotalTime() { return totalTime; }
    void resetTime() { totalTime = 0.0; }
};


void MeshDecimatorEC::computeErrorQuadrics() {
    Q = std::vector<mat3>(verts.size(), mat3(0));
    for (int i = 0; i < (int)faces.size(); i++) {
        if (isFaceRemoved[i]) continue;
        ivec3 f0 = faces[i];
        vec3 n = getUnitNormal(f0);
        mat3 q = outerProduct(n, n);
        for (int _ = 0; _ < 3; _++) {
            ivec3 f(f0[_], f0[(_+1)%3], f0[(_+2)%3]);
            vec3 a = verts[f[1]]-verts[f[0]];
            vec3 b = verts[f[2]]-verts[f[0]];
            a -= dot(a, n) * n;
            b -= dot(b, n) * n;
            float t = length(cross(a, b)) / sqrt(dot2(a)*dot2(b)) / (2.0f*PI);
            Q[f[0]] += t * q;
        }
    }
}

mat3 MeshDecimatorEC::computeErrorQuadrics(int vi) {
    mat3 Q = mat3(0);
    for (int fi : neighborFaces[vi]) {
        ivec3 f = faces[fi];
        if (f[0] != vi) f = ivec3(f.y, f.z, f.x);
        if (f[0] != vi) f = ivec3(f.y, f.z, f.x);
        vec3 n = getUnitNormal(f);
        mat3 q = outerProduct(n, n);
        vec3 a = verts[f[1]]-verts[f[0]];
        vec3 b = verts[f[2]]-verts[f[0]];
        a -= dot(a, n) * n;
        b -= dot(b, n) * n;
        float t = length(cross(a, b)) / sqrt(dot2(a)*dot2(b)) / (2.0f*PI);
        Q += t * q;
    }
    return Q;
}



vec3 MeshDecimatorEC::computeNewVertexLocation(ivec2 e) {
    // return 0.5f*(verts[e.x]+verts[e.y]);
    // return inverse(Q[e.x]+Q[e.y]) * (Q[e.x]*verts[e.x] + Q[e.y]*verts[e.y]);
    mat3 Q1 = Q[e.x] + mat3(1e-3f);
    mat3 Q2 = Q[e.y] + mat3(1e-3f);
    if (shapeCost == 0.0f && angleCost == 0.0f)
        return inverse(Q1+Q2) * (Q1*verts[e.x] + Q2*verts[e.y]);

    // triangle cost
    std::vector<int> checkedEdges;
    for (int i : neighborEdges[e.x])
        if (edges[i].z == e.x || edges[i].w == e.x)
            insertElement(checkedEdges, i);
    for (int i : neighborEdges[e.y])
        if (edges[i].z == e.y || edges[i].w == e.y)
            insertElement(checkedEdges, i);
    float afterCost = 0.0f;
    vec3 vmid = 0.5f*(verts[e.x]+verts[e.y]);
    float kTri = 0.1f * shapeCost / (float)checkedEdges.size();
    for (int i = 0; i < 1; i++) {
        vec3 g = vec3(0), gt;
        mat3 H = mat3(0), Ht;
        for (int i : checkedEdges) {
            vec3 v[3] = { vmid, verts[edges[i][0]], verts[edges[i][1]] };
            const float* vd = (const float*)&v[0];
            float* res[2] = { (float*)&gt, (float*)&Ht };
            MeshgenECLoss::ec_loss_trig_gh(&vd, res, nullptr, nullptr, 0);
            g += kTri * gt;
            H += kTri * Ht;
        }
        // vmid = inverse(Q1+Q2+H) * (Q1*verts[e.x] + Q2*verts[e.y] + H*vmid - 0.5f*g);
        vmid += inverse(Q1+Q2+H+mat3(0.1f)) * (Q1*(vmid-verts[e.x])+Q2*(vmid-verts[e.y])-0.5f*g);
    }
    return vmid;
}


float MeshDecimatorEC::computeCostReductionInfeasibleOnly(int ei, vec3 &vmean) {
    ivec4 e = edges[ei];

    float costReduction = 0.0f;

    // topology change
    {
        // dV + dF - dE == 0
        ;
        // orphan vertex
        if (e.z != -1 && neighborVerts[e.z].size() <= 2)
            return -LARGE;
        if (e.w != -1 && neighborVerts[e.w].size() <= 2)
            return -LARGE;
        // bridge vertex
        if (neighborVerts[e.x].size() <= 3)
            return -LARGE;
        if (neighborVerts[e.y].size() <= 3)
            return -LARGE;
        // don't merge "triangular prism"
        int count = 0;
        for (int i : neighborVerts[e.x])
            for (int j : neighborVerts[e.y])
                count += int(i == j);
        if (count > 2)
            return -LARGE;
    }

    return costReduction;
}

float MeshDecimatorEC::computeCostReductionErrorOnly(int ei, vec3 &vmean) {
    ivec4 e = edges[ei];
    float costReduction = computeCostReductionInfeasibleOnly(ei, vmean);
    if (costReduction == -LARGE)
        return costReduction;

    // vert after update
    vmean = computeNewVertexLocation(ivec2(e));

    // each triangle costs 1
    costReduction += float(e.z != -1) + float(e.w != -1);

    // valence
    auto valenceCostFun = [](float n) {
        // return 0.25f*(n-6.0f)*(n-6.0f);
        return n + 16.0f / (n-2.0f);
    };
    {
        const float kVal = 0.4f + 0.3f*shapeCost + 1.0f*angleCost;
        float n1 = (float)neighborVerts[e.x].size();
        float n2 = (float)neighborVerts[e.y].size();
        float a = 0.5f * (valenceCostFun(n1) + valenceCostFun(n2));
        float b = valenceCostFun(n1+n2-4.0f);
        costReduction += kVal * (a-b);
    }

    // accuracy cost using error quadrics
    {
        // const float kAcc = 1.0f / 0.0008f;
        // const float kAcc = 1.0f / 0.004f;
        const float kAcc = 1.0f / targetAccuracy;
        costReduction -= 0.5f * kAcc * (
            sqrt(dot(vmean-verts[e.x], Q[e.x]*(vmean-verts[e.x]))+1e-6) +
            sqrt(dot(vmean-verts[e.y], Q[e.y]*(vmean-verts[e.y]))+1e-6) );
    }

    return costReduction;
}

float MeshDecimatorEC::computeCostReduction(int ei, vec3 &vmean) {
    ivec4 e = edges[ei];
    float costReduction = computeCostReductionErrorOnly(ei, vmean);
    if (costReduction == -LARGE)
        return costReduction;

    // triangle shape
    auto triangleCostFun = [](vec3 v0, vec3 v1, vec3 v2) {
        vec3 v[3] = { v0, v1, v2 };
        const float* vd = (const float*)&v[0];
        float c;
        float* res[1] = { &c };
        MeshgenECLoss::ec_loss_trig(&vd, res, nullptr, nullptr, 0);
        return c;
    };
    if (shapeCost != 0.0f) {
        // current triangle cost
        std::vector<int> checkedTriangles = neighborFaces[e.x];
        for (int i : neighborFaces[e.y])
            insertElement(checkedTriangles, i);
        float beforeCost = 0.0f;
        for (int i : checkedTriangles) {
            float c = triangleCostFun(
                verts[faces[i][0]], verts[faces[i][1]], verts[faces[i][2]]
            );
            beforeCost += c;
            // beforeCost = fmax(beforeCost, c);
        }
        beforeCost /= (float)checkedTriangles.size();

        // updated triangle cost
        std::vector<int> checkedEdges;
        for (int i : neighborEdges[e.x])
            if (edges[i].z == e.x || edges[i].w == e.x)
                insertElement(checkedEdges, i);
        for (int i : neighborEdges[e.y])
            if (edges[i].z == e.y || edges[i].w == e.y)
                insertElement(checkedEdges, i);
        float afterCost = 0.0f;
        for (int i : checkedEdges) {
            float c = triangleCostFun(
                verts[edges[i][0]], verts[edges[i][1]], vmean
            );
            afterCost += c;
            // afterCost = fmax(afterCost, c);
        }
        afterCost /= (float)checkedEdges.size();

        const float kTri = shapeCost + 0.0f*angleCost;
        costReduction += kTri * (beforeCost - afterCost);
    }

    // angle cost
    auto angleCostFun = [](vec3 v0, vec3 v1, vec3 v2, vec3 v3) {
        vec3 n1 = normalize(cross(v1-v0, v2-v0));
        vec3 n2 = normalize(cross(v0-v1, v3-v1));
        return -log(1.0f + dot(n1, n2));
    };
    if (angleCost != 0.0f && false) if (e.z != -1 && e.w != -1) do {
        // current angle cost
        std::vector<int> adjEdges, oppEdges;
        for (int i : neighborEdges[e.x])
            if (edges[i].x == e.x || edges[i].y == e.x)
                insertElement(adjEdges, i);
            else if (edges[i].x != e.y && edges[i].y != e.y
                    && edges[i].z != e.y && edges[i].w != e.y)
                insertElement(oppEdges, i);
        for (int i : neighborEdges[e.y])
            if (edges[i].x == e.y || edges[i].y == e.y)
                insertElement(adjEdges, i);
            else if (edges[i].x != e.x && edges[i].y != e.x
                    && edges[i].z != e.x && edges[i].w != e.x)
                insertElement(oppEdges, i);
        if (adjEdges.size() < 2)
            continue;
        float beforeCost = 0.0f;
        for (int i : adjEdges)
            beforeCost += angleCostFun(
                verts[edges[i][0]], verts[edges[i][1]],
                verts[edges[i][2]], verts[edges[i][3]]);
        for (int i : oppEdges)
            beforeCost += angleCostFun(
                verts[edges[i][0]], verts[edges[i][1]],
                verts[edges[i][2]], verts[edges[i][3]]);
        beforeCost /= (float)(adjEdges.size()+oppEdges.size());
        beforeCost *= (float)faces.size() / (float)edges.size();

        // updated angle cost
        float afterCost = 0.0f;
        std::vector<int> xmap, ymap;
        for (int i : adjEdges) {
            if (edges[i].z == e.x || edges[i].w == e.x)
                ymap.push_back(i);
            if (edges[i].z == e.y || edges[i].w == e.y)
                xmap.push_back(i);
        }
        assert(xmap.size() == 2);
        assert(ymap.size() == 2);
        // for (int i : adjEdges) {
        //     ivec4 e1 = edges[i];
        //     if ((e1.x == e.x && e1.y == e.y) ||
        //         (e1.x == e.y && e1.y == e.x)) continue;
        //     vec3 p[4];
        //     for (int _ = 0; _ < 2; _++)
        //         p[_] = (e1[_] == e.x || e1[_] == e.y)
        //             ? vmean : verts[e1[_]];
        //     for (int _ = 2; _ < 4; _++) {
        //         if (e1[_] == e.x)
        //             p[_] = verts[(xmap[0] == e1[5-_]) ? xmap[1] : xmap[0]];
        //         else if (e1[_] == e.y)
        //             p[_] = verts[(ymap[0] == e1[5-_]) ? ymap[1] : ymap[0]];
        //         else p[_] = verts[e1[_]];
        //     }
        //     afterCost += angleCostFun(p[0], p[1], p[2], p[3]);
        // }
        for (int i : oppEdges) {
            vec3 p[4];
            for (int _ = 0; _ < 4; _++)
                p[_] = (edges[i][_] == e.x || edges[i][_] == e.y)
                    ? vmean : verts[edges[i][_]];
            afterCost += angleCostFun(p[0], p[1], p[2], p[3]);
        }
        afterCost /= (float)(0*adjEdges.size()+oppEdges.size()-0);
        afterCost *= (float)(faces.size()-2) / (float)(edges.size()-3);

        // printf("%f %f\n", beforeCost, afterCost);

        costReduction += angleCost * (beforeCost - afterCost);
    } while(0);

    if (std::isnan(costReduction))
        costReduction = 0.0f;
    return costReduction;
}


std::vector<float> MeshDecimatorEC::computeCostReduction() {
    // neighbors
    neighborVerts = std::vector<std::vector<int>>(verts.size());
    for (int i = 0; i < (int)edges.size(); i++)
        if (!isEdgeRemoved[i])
            insertNeighbor(neighborVerts, edges[i][0], edges[i][1]),
            insertNeighbor(neighborVerts, edges[i][1], edges[i][0]);
    neighborEdges = std::vector<std::vector<int>>(verts.size());
    for (int i = 0; i < (int)edges.size(); i++)
        if (!isEdgeRemoved[i])
            for (int _ = 0; _ < 4; _++)
                insertNeighbor(neighborEdges, edges[i][_], i);
    neighborFaces = std::vector<std::vector<int>>(verts.size());
    for (int i = 0; i < (int)faces.size(); i++)
        if (!isFaceRemoved[i])
            for (int _ = 0; _ < 3; _++)
                insertNeighbor(neighborFaces, faces[i][_], i);
    // for (int i = 0; i < (int)verts.size(); i++)
    //     printf("%d  %f %f %f\n", i, verts[i].x, verts[i].y, verts[i].z);
    // for (int i = 0; i < (int)faces.size(); i++)
    //     printf("%d  %d %d %d\n", i, faces[i].x, faces[i].y, faces[i].z);

    // cost
    std::vector<float> res;
    res.reserve(edges.size());
    computeErrorQuadrics();
    for (size_t i = 0; i < edges.size(); i++)
        res.push_back(computeCostReduction(i, edgeVerts[i]));
    return res;
}


void MeshDecimatorEC::assertNeighborCorrectness() {
    for (int i = 0; i < (int)verts.size(); i++)
        if (!isVertRemoved[i])
            assert(!eraseNeighbor(neighborVerts, i, i));

    std::vector<std::vector<int>> neighborVerts1(verts.size());
    for (int i = 0; i < (int)edges.size(); i++)
        if (!isEdgeRemoved[i])
            insertNeighbor(neighborVerts1, edges[i][0], edges[i][1]),
            insertNeighbor(neighborVerts1, edges[i][1], edges[i][0]);
    for (int i = 0; i < (int)neighborVerts.size(); i++)
        if (!isVertRemoved[i]) {
            std::vector<int> a = neighborVerts1[i];
            std::vector<int> b = neighborVerts[i];
            std::sort(a.begin(), a.end());
            std::sort(b.begin(), b.end());
            // printf("ve %d  ", i);
            // for (int j : a) printf("%d ", j);
            // printf(" ");
            // for (int j : b) printf("%d ", j);
            // printf("\n");
            assert(!a.empty());
            assert(!b.empty());
            assert(a == b);
        }

    neighborVerts1 = std::vector<std::vector<int>>(verts.size());
    for (int i = 0; i < (int)faces.size(); i++)
        if (!isFaceRemoved[i])
            insertNeighbor(neighborVerts1, faces[i][0], faces[i][1]),
            insertNeighbor(neighborVerts1, faces[i][1], faces[i][0]),
            insertNeighbor(neighborVerts1, faces[i][0], faces[i][2]),
            insertNeighbor(neighborVerts1, faces[i][2], faces[i][0]),
            insertNeighbor(neighborVerts1, faces[i][1], faces[i][2]),
            insertNeighbor(neighborVerts1, faces[i][2], faces[i][1]);
    for (int i = 0; i < (int)neighborVerts.size(); i++)
        if (!isVertRemoved[i]) {
            std::vector<int> a = neighborVerts1[i];
            std::vector<int> b = neighborVerts[i];
            std::sort(a.begin(), a.end());
            std::sort(b.begin(), b.end());
            // printf("vf %d  ", i);
            // for (int j : a) printf("%d ", j);
            // printf(" ");
            // for (int j : b) printf("%d ", j);
            // printf("\n");
            assert(!a.empty());
            assert(!b.empty());
            assert(a == b);
        }

    std::vector<std::vector<int>> neighborFaces1(verts.size());
    for (int i = 0; i < (int)faces.size(); i++)
        if (!isFaceRemoved[i])
            for (int _ = 0; _ < 3; _++)
                insertNeighbor(neighborFaces1, faces[i][_], i);
    for (int i = 0; i < (int)neighborVerts.size(); i++)
        if (!isVertRemoved[i]) {
            std::vector<int> a = neighborFaces1[i];
            std::vector<int> b = neighborFaces[i];
            std::sort(a.begin(), a.end());
            std::sort(b.begin(), b.end());
            // printf("f %d  ", i);
            // for (int j : a) printf("%d ", j);
            // printf(" ");
            // for (int j : b) printf("%d ", j);
            // printf("\n");
            assert(!a.empty());
            assert(!b.empty());
            assert(a == b);
        }

    std::vector<std::vector<int>> neighborEdges1(verts.size());
    for (int i = 0; i < (int)edges.size(); i++)
        if (!isEdgeRemoved[i])
            for (int _ = 0; _ < 4; _++)
                insertNeighbor(neighborEdges1, edges[i][_], i);
    for (int i = 0; i < (int)neighborVerts.size(); i++)
        if (!isVertRemoved[i]) {
            std::vector<int> a = neighborEdges1[i];
            std::vector<int> b = neighborEdges[i];
            std::sort(a.begin(), a.end());
            std::sort(b.begin(), b.end());
            // printf("e %d  ", i);
            // for (int j : a) printf("%d ", j);
            // printf(" ");
            // for (int j : b) printf("%d ", j);
            // printf("\n");
            assert(!a.empty());
            assert(!b.empty());
            assert(a == b);
        }
}


void MeshDecimatorEC::contractEdge(int ei) {
    // assertNeighborCorrectness();
    assert(!isEdgeRemoved[ei]);
    ivec4 edge = edges[ei];
    for (int i = 0; i < 4; i++)
        if (edge[i] != -1)
            assert(!isVertRemoved[edge[i]]);

    // for (int i = 0; i < 4; i++) printf("%d (%f,%f,%f) ", edge[i], verts[edge[i]].x, verts[edge[i]].y, verts[edge[i]].z); printf("\n");

    // verts
    verts[edge.x] = edgeVerts[ei];
    isVertRemoved[edge.y] = true;
    for (int vi : neighborVerts[edge.y]) {
        assert(!isVertRemoved[vi]);
        eraseNeighbor(neighborVerts, vi, edge.y);
        if (vi != edge.x)
            insertNeighbor(neighborVerts, vi, edge.x);
    }


    // printf("%d %d\n", (int)neighborFaces[edge.x].size(), (int)neighborFaces[edge.y].size());

    // faces
    std::vector<int> additionalNeighborVerts;  // add these later
    for (int fi : neighborFaces[edge.y]) {
        assert(!isFaceRemoved[fi]);
        ivec3 f = faces[fi];
        for (int _ = 0; _ < 3; _++)
            if (f[_] == edge.y) f[_] = edge.x;
        if (f.x == f.y || f.x == f.z || f.y == f.z) {
            isFaceRemoved[fi] = true;
            for (int j : neighborVerts[edge.y]) {
                eraseNeighbor(neighborFaces, j, fi);
            }
        }
        else {
            faces[fi] = f;
            insertNeighbor(neighborFaces, edge.x, fi);
            for (int _ = 0; _ < 3; _++)
                if (f[_] != edge.x)
                    additionalNeighborVerts.push_back(f[_]);
        }
    }

    // remove edge
    for (int _ = 0; _ < 4; _++)
        eraseNeighbor(neighborEdges, edge[_], ei);
    isEdgeRemoved[ei] = true;
    edgeCost->update(ei, 0.0f);
    // new edges for removed triangles
    std::vector<ivec4> intersection;
    for (int ei : neighborVerts[edge.x])
        for (int ej : neighborVerts[edge.y])
            if (ei == ej) intersection.push_back(ivec4(ei, -1, -1, -1));
    // for (int i = 0; i < (int)intersection.size(); i++) printf("%d %f %f %f  ", intersection[i].x, verts[intersection[i].x].x, verts[intersection[i].x].y, verts[intersection[i].x].z); printf("\n");
    assert(intersection.size() <= 2);
    // find merged edges
    std::vector<ivec4> newes(intersection.size());
    for (int ii = 0; ii < (int)intersection.size(); ii++) {
        ivec4 newe(edge.x, intersection[ii].x, -1, -1);
        int newei = -1;
        for (int ei : neighborEdges[edge.x]) {
            assert(!isEdgeRemoved[ei]);
            ivec4 e = edges[ei];
            if (e.x == edge.x && e.y == intersection[ii].x)
                (e.w == edge.y ? (newe.z = e.z) : (newe.w = e.w)), newei = ei;
            if (e.y == edge.x && e.x == intersection[ii].x)
                (e.w == edge.y ? (newe.w = e.z) : (newe.z = e.w)), newei = ei;
            // if (newei == ei) { printf("- "); for (int i = 0; i < 4; i++) printf("%d %f %f %f  ", e[i], verts[e[i]].x, verts[e[i]].y, verts[e[i]].z); printf("\n");}
        }
        assert(newei != -1);
        int oldei = -1;
        for (int ei : neighborEdges[edge.y]) {
            assert(!isEdgeRemoved[ei]);
            ivec4 e = edges[ei];
            if (e.x == edge.y && e.y == intersection[ii].x)
                (e.w == edge.x ? (newe.z = e.z) : (newe.w = e.w)), oldei = ei;
            if (e.y == edge.y && e.x == intersection[ii].x)
                (e.w == edge.x ? (newe.w = e.z) : (newe.z = e.w)), oldei = ei;
            // if (oldei == ei) { printf("- "); for (int i = 0; i < 4; i++) printf("%d %f %f %f  ", e[i], verts[e[i]].x, verts[e[i]].y, verts[e[i]].z); printf("\n");}
        }
        assert(oldei != -1);
        intersection[ii] = ivec4(
            intersection[ii].x, oldei, newei, -1
        );
        newes[ii] = newe;
    }
    // 
    for (int ii = 0; ii < (int)intersection.size(); ii++) {
        int oldei = intersection[ii].y;
        int newei = intersection[ii].z;
        ivec4 newe = newes[ii];
        isEdgeRemoved[oldei] = true;
        edgeCost->update(oldei, 0.0f);
        for (int _ = 0; _ < 4; _++)
            eraseNeighbor(neighborEdges, edges[oldei][_], oldei);
        edges[newei] = newe;
        // for (int i = 0; i < 4; i++) printf("%d %f %f %f  ", newe[i], verts[newe[i]].x, verts[newe[i]].y, verts[newe[i]].z); printf("\n");
    }
    for (int ei : neighborEdges[edge.y]) {
        if(!isEdgeRemoved[ei])
            insertNeighbor(neighborEdges, edge.x, ei);
        if(!isEdgeRemoved[ei])
            for (int _ = 0; _ < 4; _++)
                insertNeighbor(neighborEdges, edges[ei][_], ei);
    }
    for (int ei : neighborEdges[edge.y]) {
        if (isEdgeRemoved[ei])
            continue;
        ivec4 e = edges[ei];
        for (int i = 0; i < 4; i++)
            if (e[i] == edge.y) e[i] = edge.x;
        assert(e.x != e.y);
        assert(e.x != e.z && e.y != e.z && e.x != e.w && e.y != e.w);
        edges[ei] = e;
    }

    // update
    neighborVerts[edge.y].clear();
    neighborFaces[edge.y].clear();
    neighborEdges[edge.y].clear();
    for (int j : additionalNeighborVerts)
        insertNeighbor(neighborVerts, edge.x, j);
    // assertNeighborCorrectness();

    Q[edge.x] = computeErrorQuadrics(edge.x);
    for (int vi : neighborVerts[edge.x])
        Q[vi] = computeErrorQuadrics(vi);
    std::unordered_set<int> updatedEdges;
    float (MeshDecimatorEC::*costReduction)(int, vec3&);
    if (shapeCost == 0.0f && angleCost == 0.0f)
        costReduction = &MeshDecimatorEC::computeCostReductionErrorOnly;
    else costReduction = &MeshDecimatorEC::computeCostReduction;
    // startTiming();
    for (int ei : neighborEdges[edge.x]) {
        edgeCost->update(ei, (this->*costReduction)(ei, edgeVerts[ei]));
        updatedEdges.insert(ei);
    }
    // stopTiming();
    for (int vi : neighborVerts[edge.x]) {
        for (int ei : neighborEdges[vi]) {
            if (updatedEdges.find(ei) == updatedEdges.end()) {
                float cr = computeCostReductionInfeasibleOnly(ei, edgeVerts[ei]);
                if (cr < 0.0f)
                    edgeCost->update(ei, cr);
                updatedEdges.insert(ei);
            }
        }
    }
}


void MeshDecimatorEC::decimateMesh() {
    int maxiter = (int)edges.size();
    if (maxiter == 0)
        return;

    float time0 = getTimePast();
    computeCostReduction();

    float time1 = getTimePast();
    for (int iter = 0; iter < maxiter; iter++) {
        std::pair<int, float> maxe = edgeCost->getMax();
        if (maxe.second <= 0.0f)
            break;
        contractEdge(maxe.first);
    }

    float time2 = getTimePast();
    std::vector<ivec3> faces1;
    for (int i = 0; i < (int)faces.size(); i++)
        if (!isFaceRemoved[i]) faces1.push_back(faces[i]);
    faces = faces1;
    std::vector<ivec4> edges1;
    for (int i = 0; i < (int)edges.size(); i++)
        if (!isEdgeRemoved[i]) edges1.push_back(edges[i]);
    edges = edges1;

    float time3 = getTimePast();
    if (getTotalTime() != 0.0)
        printf("Profiled time: %lf secs\n", getTotalTime());
    printf("decimateMesh: %.2g + %.2g + %.2g = %.2g secs\n",
        time1-time0, time2-time1, time3-time2, time3-time0);
}
