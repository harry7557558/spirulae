#pragma once

#include "meshgen_misc.h"
using namespace MeshgenMisc;


void restoreSurface(
    const std::vector<ivec4> &tets,
    std::vector<ivec3> &faces, std::vector<ivec4> &edges
) {
    faces.clear(); edges.clear();

    float time0 = getTimePast();

    // faces
    std::unordered_set<ivec3> uniqueIndicesF;
    for (ivec4 t : tets) {
        for (int _ = 0; _ < 4; _++) {
            ivec3 f = ivec3(t[_], t[(_+1)%4], t[(_+2)%4]);
            if (_ % 2 == 0) std::swap(f.y, f.z);
            f = MeshgenMisc::rotateIvec3(f);
            ivec3 fo = ivec3(f.x, f.z, f.y);
            if (uniqueIndicesF.find(fo) != uniqueIndicesF.end())
                uniqueIndicesF.erase(fo);
            else uniqueIndicesF.insert(f);
        }
    }
    for (ivec3 f : uniqueIndicesF)
        faces.push_back(f);

    float time1 = getTimePast();

    // edges
    auto ivec2Cmp = [](ivec2 a, ivec2 b) {
        return a.x != b.x ? a.x < b.x : a.y < b.y;
    };
    std::map<ivec2, ivec2, decltype(ivec2Cmp)> uniqueIndicesE(ivec2Cmp);
    for (ivec3 t : faces) {
        for (int _ = 0; _ < 3; _++) {
            ivec2 e(t[_], t[(_+1)%3]);
            int i = 0;
            if (e.x > e.y)
                std::swap(e.x, e.y), i = 1;
            uniqueIndicesE[e][i] = t[(_+2)%3];
        }
    }
    for (std::pair<ivec2, ivec2> e : uniqueIndicesE)
        edges.push_back(ivec4(e.first, e.second));

    float time2 = getTimePast();
    printf("restoreSurface: %.2g + %.2g = %.2g secs\n",
        time1-time0, time2-time1, time2-time0);
}


void restoreEdges(
    const std::vector<ivec3> &faces,
    std::vector<ivec4> &edges
) {
    edges.clear();

    float time0 = getTimePast();

    // edges
    auto ivec2Cmp = [](ivec2 a, ivec2 b) {
        return a.x != b.x ? a.x < b.x : a.y < b.y;
    };
    std::map<ivec2, ivec2, decltype(ivec2Cmp)> uniqueIndicesE(ivec2Cmp);
    for (ivec3 t : faces) {
        for (int _ = 0; _ < 3; _++) {
            ivec2 e(t[_], t[(_+1)%3]);
            int i = 0;
            if (e.x > e.y)
                std::swap(e.x, e.y), i = 1;
            if (uniqueIndicesE.find(e) == uniqueIndicesE.end())
                uniqueIndicesE[e] = ivec2(-1);
            uniqueIndicesE[e][i] = t[(_+2)%3];
        }
    }
    for (std::pair<ivec2, ivec2> e : uniqueIndicesE)
        edges.push_back(ivec4(e.first, e.second));

    float time1 = getTimePast();
    printf("restoreEdges: %.2g secs\n", time1-time0);
}
