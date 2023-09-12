#pragma once

#include "meshgen_misc.h"
using namespace MeshgenMisc;


void splitStickyVertices(
    std::vector<vec3> &vertices, std::vector<ivec4> &tets,
    std::vector<ivec3> &faces, std::vector<ivec4> &edges,
    std::vector<bool> isConstrained[3]
) {
    int vn = (int)vertices.size();
    assert(vn == isConstrained[0].size() && vn == isConstrained[1].size());
    int tn = (int)tets.size();

    float time0 = getTimePast();

    // get tets on surface
    std::vector<bool> isSurfaceVert(vn, false);
    for (ivec3 f : faces) {
        for (int _ = 0; _ < 3; _++)
            isSurfaceVert[f[_]] = true;
    }

    // get neighbors
    std::vector<std::vector<int>> neighbors, neighborTs, neighborFs, neighborEs;
    auto push_back = [](std::vector<int> &v, int i) {
        for (int j : v)
            if (i == j) return;
        v.push_back(i);
    };
    auto vec_erase = [](std::vector<int> &v, int i) {
        std::vector<int> v1;
        for (int j : v)
            if (i != j) v1.push_back(j);
        v = v1;
    };
    auto recomputeNeighbors = [&]() {
        // have this as a callable function for easy checking neighbor update correctness
        neighbors = std::vector<std::vector<int>>(vertices.size());
        neighborTs = std::vector<std::vector<int>>(vertices.size());
        neighborFs = std::vector<std::vector<int>>(vertices.size());
        neighborEs = std::vector<std::vector<int>>(vertices.size());
        for (int i = 0; i < (int)tets.size(); i++) {
            ivec4 t = tets[i];
            for (int _ = 0; _ < 4; _++) {
                neighborTs[t[_]].push_back(i);
            }
        }
        for (int i = 0; i < (int)faces.size(); i++) {
            ivec3 f = faces[i];
            for (int _ = 0; _ < 3; _++) {
                neighborFs[f[_]].push_back(i);
            }
        }
        for (int i = 0; i < (int)edges.size(); i++) {
            ivec4 e = edges[i];
            for (int _ = 0; _ < 4; _++) {
                neighborEs[e[_]].push_back(i);
            }
            push_back(neighbors[e[0]], e[1]);
            push_back(neighbors[e[1]], e[0]);
        }
    };
    recomputeNeighbors();

    // break some constraints
    for (int vi = 0; vi < vn; vi++) {
        std::vector<int> nb = neighbors[vi];
        for (int dim = 0; dim < 3; dim++) {
            if (!isConstrained[dim][vi])
                continue;
            bool hasC = false;
            for (int vj : nb)
                if (isConstrained[dim][vj])
                    hasC = true;
            if (!hasC)
                isConstrained[dim][vi] = false;
        }
    }

    float time1 = getTimePast();

    // split sticky verts
    std::vector<int> neighborMap(vn, -1);
    for (int vi = 0; vi < vn; vi++) {
        // neighborMap = std::vector<int>(vertices.size(), -1);
        // recomputeNeighbors();

        // init neighbor map
        std::vector<int> nb0 = neighbors[vi];
        int nn = (int)nb0.size();
        if (!nn) continue;
        for (int i = 0; i < nn; i++)
            neighborMap[nb0[i]] = i;

        // find disjoint components
        DisjointSet dsj(nn);
        for (int fi : neighborFs[vi]) {
            ivec3 f = faces[fi];
            for (int _ = 0; _ < 3; _++) {
                int a = f[_];
                int b = f[(_+1)%3];
                if (a == vi || b == vi) continue;
                a = neighborMap[a], b = neighborMap[b];
                assert(a != -1 && b != -1);
                dsj.unionSet(a, b);
            }
        }

        // map disjoint components
        int dsjCount = 0;
        std::vector<int> newVi(nn, -1);
        for (int i = 0; i < nn; i++) {
            int rep = dsj.findRep(i);
            if (rep == i) {
                dsjCount++;
                if (dsjCount > 1) {
                    newVi[rep] = (int)vertices.size();
                    vertices.push_back(vertices[vi]);
                    neighbors.push_back(std::vector<int>());
                    neighborTs.push_back(std::vector<int>());
                    neighborFs.push_back(std::vector<int>());
                    neighborEs.push_back(std::vector<int>());
                    for (int _ = 0; _ < 3; _++)
                        isConstrained[_].push_back(isConstrained[_][vi]);
                    neighborMap.push_back(-1);
                }
                else newVi[rep] = vi;
            }
        }
        assert(dsjCount >= 1);
        if (dsjCount == 1) {
            for (int i = 0; i < nn; i++)
                neighborMap[nb0[i]] = -1;
            continue;
        }

        // update tets
        for (int ti : neighborTs[vi]) {
            ivec4 t = tets[ti];
            for (int i = 0; i < 4; i++) {
                if (t[i] != vi) continue;
                for (int _ = 0; _ < 4; _++) {
                    int ji = neighborMap[t[_]];
                    if (ji == -1) continue;
                    t[i] = newVi[dsj.findRep(ji)];
                    break;
                }
            }
            tets[ti] = t;
        }

        // update faces
        int changedCount = 0;
        for (int fi : neighborFs[vi]) {
            ivec3 f = faces[fi];
            for (int i = 0; i < 3; i++) {
                if (f[i] != vi) continue;
                for (int _ = 0; _ < 3; _++) {
                    int ji = neighborMap[f[_]];
                    if (ji == -1) continue;
                    f[i] = newVi[dsj.findRep(ji)];
                    changedCount += 1;
                    break;
                }
            }
            faces[fi] = f;
        }
        assert(changedCount == (int)neighborFs[vi].size());

        // update edges
        for (int ei : neighborEs[vi]) {
            ivec4 e = edges[ei];
            for (int i = 0; i < 4; i++) {
                if (e[i] != vi) continue;
                for (int _ = 0; _ < 4; _++) {
                    int ji = neighborMap[e[_]];
                    if (ji == -1) continue;
                    e[i] = newVi[dsj.findRep(ji)];
                    break;
                }
            }
            edges[ei] = e;
        }

        // recompute neighbors
        std::vector<int> nbs = neighbors[vi];
        std::vector<int> nbts = neighborTs[vi];
        std::vector<int> nbfs = neighborFs[vi];
        std::vector<int> nbes = neighborEs[vi];
        neighbors[vi].clear(), neighborTs[vi].clear(), neighborFs[vi].clear(), neighborEs[vi].clear();
        for (int i : nbs) {
            vec_erase(neighbors[i], vi);
        }
        for (int i : nbts) {
            ivec4 t = tets[i];
            for (int _ = 0; _ < 4; _++)
                push_back(neighborTs[t[_]], i);
        }
        for (int i : nbfs) {
            ivec3 f = faces[i];
            for (int _ = 0; _ < 3; _++)
                push_back(neighborFs[f[_]], i);
        }
        for (int i : nbes) {
            ivec4 e = edges[i];
            for (int _ = 0; _ < 4; _++)
                push_back(neighborEs[e[_]], i);
            push_back(neighbors[e[0]], e[1]);
            push_back(neighbors[e[1]], e[0]);
        }

        // restore neighbor map
        for (int i = 0; i < nn; i++)
            neighborMap[nb0[i]] = -1;
    }

    vn = (int)vertices.size();

    float time2 = getTimePast();
    printf("splitStickyVertices: %.2g + %.2g = %.2g secs\n",
        time1-time0, time2-time1, time2-time0);
}
