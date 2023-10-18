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

// requirements
// - cost functions
// - data structure for updating cost and finding minimum cost
// - edge contraction operator
// - finding affected edges
// - manifold change checking


#include "maxsegtree.h"


class MeshDecimatorEC {
public:
    MeshDecimatorEC(
        std::vector<vec3> &verts,
        std::vector<ivec3> &faces,
        std::vector<ivec4> &edges) :
        verts(verts), faces(faces), edges(edges),
        isVertRemoved(verts.size(), false),
        isFaceRemoved(faces.size(), false),
        isEdgeRemoved(edges.size(), false) {
            edgeCost = new MaxSegmentTree(computeCostReduction());
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

    MaxSegmentTree *edgeCost;  // cost reduction

    std::vector<std::vector<int>> neighborVerts;
    std::vector<std::vector<int>> neighborFaces;
    std::vector<std::vector<int>> neighborEdges;
    static void insertNeighbor(
            std::vector<std::vector<int>>& neighbors, int i, int j) {
        if (i == -1 || j == -1) return;
        bool has = false;
        for (int j0 : neighbors[i])
            if (j0 == j) has = true;
        if (!has)
            neighbors[i].push_back(j);
    }
    static void eraseNeighbor(
            std::vector<std::vector<int>>& neighbors, int i, int j) {
        if (i == -1 || j == -1) return;
        std::vector<int> *v = &neighbors[i];
        v->erase(std::remove(v->begin(), v->end(), j), v->end());
    }
    void assertNeighborCorrectness() const;

    // costs
    void computeErrorQuadrics();
    mat3 computeErrorQuadrics(int vi);
    float computeCostReduction(ivec4 e);
    std::vector<float> computeCostReduction();

    // decimation
    void contractEdge(int ei);

    // misc
    vec3 getUnitNormal(ivec3 f) {
        return normalize(cross(
            verts[f.y]-verts[f.x], verts[f.z]-verts[f.x]
        ));
    }
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

float MeshDecimatorEC::computeCostReduction(ivec4 e) {
    float costReduction = 0.0f;

    // topology change
    {
        // dV + dF - dE == 0
        ;
        // orphan vertex
        if (e.z != -1 && neighborVerts[e.z].size() <= 2)
            return 0.0f;
        if (e.w != -1 && neighborVerts[e.w].size() <= 2)
            return 0.0f;
        // bridge vertex
        if (neighborVerts[e.x].size() <= 3)
            return 0.0f;
        if (neighborVerts[e.y].size() <= 3)
            return 0.0f;
    }


    // each triangle costs 1
    costReduction += float(e.z != -1) + float(e.w != -1);

    // accuracy cost using error quadrics
    {
        const float kAcc = 1.0f / 0.0006f;
        vec3 vmean = 0.5f * (verts[e.x] + verts[e.y]);
        costReduction -= 0.5f * kAcc * (
            sqrt(dot(vmean-verts[e.x], Q[e.x]*(vmean-verts[e.x]))+1e-6) +
            sqrt(dot(vmean-verts[e.y], Q[e.y]*(vmean-verts[e.y]))+1e-6) );
    }

    // angle cost
    if (e.z != -1 && e.w != -1) {
        const float kAng = 100.0;
        vec3 n1 = getUnitNormal({ e.x, e.y, e.z });
        vec3 n2 = getUnitNormal({ e.y, e.z, e.w });
    }

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
    for (ivec4 e : edges)
        res.push_back(computeCostReduction(e));
    return res;
}


void MeshDecimatorEC::assertNeighborCorrectness() const {
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
    verts[edge.x] = 0.5f*(verts[edge.x]+verts[edge.y]);
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
    for (int ei : neighborEdges[edge.x])
        edgeCost->update(ei, computeCostReduction(edges[ei]));
}


void MeshDecimatorEC::decimateMesh() {
    computeCostReduction();
    int maxiter = (int)edges.size();
    for (int iter = 0; iter < maxiter; iter++) {
        // printf("iter %d\n", iter);
        // computeErrorQuadrics();
        // computeCostReduction();
        // for (int i = 0; i < (int)edges.size(); i++)
        //     if (!isEdgeRemoved[i])
        //         edgeCost->update(i, computeCostReduction(edges[i]));
        std::pair<int, float> maxe = edgeCost->getMax();
        // printf("%f ", maxe.second);
        if (maxe.second <= 0.0f)
            break;
        // printf("\n[");
        // std::vector<ivec4> edges1;
        // for (int i = 0; i < (int)edges.size(); i++)
        //     if (!isEdgeRemoved[i]) edges1.push_back(edges[i]);
        // for (int i = 0; i < (int)edges1.size(); i++)
        //     printf("(%f,%f,%f)%c", verts[edges1[i].x].x, verts[edges1[i].x].y, verts[edges1[i].x].z, i+1==edges1.size()?']':',');
        // printf("(1-t)+[");
        // for (int i = 0; i < (int)edges1.size(); i++)
        //     printf("(%f,%f,%f)%c", verts[edges1[i].y].x, verts[edges1[i].y].y, verts[edges1[i].y].z, i+1==edges1.size()?']':',');
        // printf("t\n");
        contractEdge(maxe.first);
    }
    printf("\n");
    std::vector<ivec3> faces1;
    for (int i = 0; i < (int)faces.size(); i++)
        if (!isFaceRemoved[i]) faces1.push_back(faces[i]);
    faces = faces1;
    std::vector<ivec4> edges1;
    for (int i = 0; i < (int)edges.size(); i++)
        if (!isEdgeRemoved[i]) edges1.push_back(edges[i]);
    edges = edges1;
}
