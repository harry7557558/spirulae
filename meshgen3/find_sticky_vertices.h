#pragma once

#include "meshgen_misc.h"
using namespace MeshgenMisc;


std::vector<bool> findStickyVertices(
    const std::vector<vec3> &vertices, const std::vector<ivec4> &tets
) {
    int vn = (int)vertices.size();
    std::vector<bool> isSticky(vn, false);

    float time0 = getTimePast();

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
    std::vector<ivec3> faces(uniqueIndicesF.begin(), uniqueIndicesF.end());

    float time1 = getTimePast();

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

    float time2 = getTimePast();

    // check if each vertex is sticky
    std::vector<int> neighborMap(vn, -1);
    for (int vi = 0; vi < vn; vi++) {
        // compute neighbors
        std::vector<int> nb = neighbors[vi];
        int nn = (int)nb.size();
        for (int i = 0; i < nn; i++)
            neighborMap[nb[i]] = i;
        neighborMap[vi] = nn;

        // face bridges with occurrence count
        std::map<uint64_t, int> bridges;
        for (int fi : neighborFs[vi]) {
            ivec3 f = faces[fi];
            for (int _ = 0; _ < 3; _++) {
                int a = neighborMap[f[_]];
                int b = neighborMap[f[(_+1)%3]];
                assert(a != -1 && b != -1);
                if (a > b) std::swap(a, b);
                bridges[((uint64_t)a<<32)|(uint64_t)b] += 1;
            }
        }

        // find disjoint components
        DisjointSet dsj(nn);
        int dsjCount = 0;
        for (std::pair<uint64_t, int> ec : bridges) {
            if (ec.second > 2) {
                // sticky edge
                // printf("e %d\n", vi);
                isSticky[vi] = true;
                goto restore_neighbor_map;
            }
            int a = (int)(ec.first>>32);
            int b = (int)ec.first;
            if (a != nn && b != nn) {
                dsj.unionSet(a, b);
            }
        }

        // check sticky vertices
        for (int i = 0; i < nn; i++) {
            int rep = dsj.findRep(i);
            if (rep == i) {
                dsjCount++;
                if (dsjCount > 1) {
                    // sticky vertex
                    // printf("v %d\n", vi);
                    isSticky[vi] = true;
                    goto restore_neighbor_map;
                }
            }
        }

        // restore neighbor map
    restore_neighbor_map:;
        for (int i = 0; i < nn; i++)
            neighborMap[nb[i]] = -1;
        neighborMap[vi] = -1;
    }

    float time3 = getTimePast();
    printf("findStickyVertices: %.2g + %.2g + %.2g = %.2g secs\n",
        time1-time0, time2-time1, time3-time2, time3-time0);

    return isSticky;
}
