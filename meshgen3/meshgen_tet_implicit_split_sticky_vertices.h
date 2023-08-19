#pragma once

#include "meshgen_misc.h"
using namespace MeshgenMisc;


void splitStickyVertices(
    std::vector<vec3> &vertices, std::vector<ivec4> &tets, std::vector<ivec3> &faces,
    std::vector<bool> isConstrained[3]
) {
    int vn = (int)vertices.size();
    assert(vn == isConstrained[0].size() && vn == isConstrained[1].size());

    // get tets on surface
    std::vector<bool> isSurfaceTet(tets.size(), false);
    std::unordered_set<ivec3> uniqueIndicesF;
    for (ivec4 t : tets) {
        for (int _ = 0; _ < 4; _++) {
            ivec3 f = ivec3(t[_], t[(_+1)%4], t[(_+2)%4]);
            if (_ % 2 == 0) std::swap(f.y, f.z);
            f = rotateIvec3(f);
            ivec3 fo = ivec3(f.x, f.z, f.y);
            if (uniqueIndicesF.find(fo) != uniqueIndicesF.end())
                uniqueIndicesF.erase(fo);
            else uniqueIndicesF.insert(f);
        }
    }
    for (int i = 0; i < (int)tets.size(); i++) {
        ivec4 t = tets[i];
        for (int _ = 0; _ < 4; _++) {
            ivec3 f = ivec3(t[_], t[(_+1)%4], t[(_+2)%4]);
            if (_ % 2 == 0) std::swap(f.y, f.z);
            f = rotateIvec3(f);
            if (uniqueIndicesF.find(f) != uniqueIndicesF.end())
                isSurfaceTet[i] = true;
        }
    }
    printf("%d\n", (int)uniqueIndicesF.size());

    // get neighbors
    std::vector<std::vector<int>> neighbors(vn);
    std::vector<std::vector<int>> neighborTs(vn);
    std::vector<std::vector<int>> neighborFs(vn);
    for (int ti = 0; ti < (int)tets.size(); ti++) {
        ivec4 t = tets[ti];
        for (int i = 0; i < 4; i++) {
            neighborTs[t[i]].push_back(ti);
        }
    }
    for (int fi = 0; fi < (int)faces.size(); fi++) {
        ivec3 f = faces[fi];
        for (int i = 0; i < 3; i++) {
            neighborFs[f[i]].push_back(fi);
            for (int j = 0; j < 3; j++) if (j != i) {
                bool has = false;
                for (int v : neighbors[f[i]])
                    if (v == f[j]) has = true;
                if (!has)
                    neighbors[f[i]].push_back(f[j]);
            }
        }
    }

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

    // for each vertex
    std::vector<int> neighborMap(vn, -1);
    std::vector<int> additionalMap(vn);
    for (int i = 0; i < vn; i++)
        additionalMap[i] = i;
    for (int vi = 0; vi < vn; vi++) {
        // printf("%d/%d\n", vi, vn);
        std::vector<int> nb = neighbors[vi];
        int nn = (int)nb.size();
        for (int i = 0; i < nn; i++)
            neighborMap[nb[i]] = i;
        neighborMap[vi] = nn;
        // find disjoint components
        DisjointSet dsj(nn);
        std::map<uint64_t, int> bridges;
        for (int fi : neighborFs[vi]) {
            ivec3 f = faces[fi];
            for (int _ = 0; _ < 3; _++) {
                int a = neighborMap[additionalMap[f[_]]];
                int b = neighborMap[additionalMap[f[(_+1)%3]]];
                assert(a != -1 && b != -1);
                if (a > b) std::swap(a, b);
                bridges[((uint64_t)a<<32)|(uint64_t)b] += 1;
            }
        }
        int skipCount = 0;
        std::vector<bool> skips(nn, false);
        for (std::pair<uint64_t, int> ec : bridges) {
            int a = (int)(ec.first>>32);
            int b = (int)ec.first;
            if (ec.second > 2) {
                assert(a == nn || b == nn);
                assert(ec.second % 2 == 0);
                printf("%d  %d %d /%d\n", ec.second, a, b, nn);
                skips[a+b-nn] = true;
                skipCount++;
            }
        }
        for (std::pair<uint64_t, int> ec : bridges) {
            int a = (int)(ec.first>>32);
            int b = (int)ec.first;
            // if (ec.second == 1) {
            //     assert(a != nn && b != nn);
            if (a != nn && b != nn) {
                if (!skips[a] && !skips[b]) {
                    // if (skipCount == 1) printf("u %d %d\n", a, b);
                    dsj.unionSet(a, b);
                }
            }
        }
        // for (int fi : neighborFs[vi]) {
        //     ivec3 f = faces[fi];
        //     for (int i = 0; i < 3; i++)
        //         f[i] = neighborMap[additionalMap[f[i]]];
        //     if (skips[f[0]] || skips[f[1]] || skips[f[2]])
        //         continue;
        //     for (int _ = 0; _ < 3; _++) {
        //         int a = f[_];
        //         int b = f[(_+1)%3];
        //         if (a != -1 && b != -1 && a < nn && b < nn)
        //             dsj.unionSet(a, b);
        //     }
        // }
        // map disjoint components
        int dsjCount = 0;
        std::vector<int> newVi(nn, -1);
        for (int i = 0; i < nn; i++) {
            int rep = dsj.findRep(i);
            if (rep == i) {
                dsjCount++;
                if (skips[i]) {
                    newVi[rep] = vi;
                    continue;
                }
                if (dsjCount > 1) {
                    newVi[rep] = (int)vertices.size();
                    vertices.push_back(vertices[vi]);
                    for (int _ = 0; _ < 3; _++)
                        isConstrained[_].push_back(isConstrained[_][vi]);
                    additionalMap.push_back(vi);
                }
                else newVi[rep] = vi;
            }
        }
        if (skipCount) {
            printf("%d %d\n", dsjCount, skipCount);
            for (int fi : neighborFs[vi]) {
                ivec3 f = faces[fi];
                for (int i = 0; i < 3; i++)
                    f[i] = neighborMap[additionalMap[f[i]]];
                printf("%d %d %d\n", f[0], f[1], f[2]);
            }
            // if (skipCount == 1) exit(0);
        }
        // update tets
        if (dsjCount > 1) {
            // tets
            for (int ti : neighborTs[vi]) {
                ivec4 t = tets[ti];
                for (int i = 0; i < 4; i++) {
                    if (t[i] != vi) continue;
                    for (int _ = 0; _ < 4; _++) if (i != _) {
                        int ji = neighborMap[additionalMap[t[_]]];
                        if (ji == -1) continue;
                        t[i] = newVi[dsj.findRep(ji)];
                        break;
                    }
                }
                tets[ti] = t;
            }
            // faces
            int changedCount = 0;
            for (int fi : neighborFs[vi]) {
                ivec3 f = faces[fi];
                for (int i = 0; i < 3; i++) {
                    if (f[i] != vi) continue;
                    for (int _ = 0; _ < 3; _++) if (i != _) {
                        int ji = neighborMap[additionalMap[f[_]]];
                        f[i] = newVi[dsj.findRep(ji)];
                        changedCount += 1;
                        break;
                    }
                }
                faces[fi] = f;
            }
            assert(changedCount == (int)neighborFs[vi].size());
            // To-do: edges
        }
        // restore neighbor map
        for (int i = 0; i < nn; i++)
            neighborMap[nb[i]] = -1;
        neighborMap[vi] = -1;
    }
}
