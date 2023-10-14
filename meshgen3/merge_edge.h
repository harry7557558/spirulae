#pragma once

#include "meshgen_misc.h"
#include "restore_surface.h"
using namespace MeshgenMisc;


// mesh decimation, merge short edges
// merge if edge length is less than k times max edge length of neighbor triangle

void mergeEdge(
    std::vector<vec3> &verts,
    std::vector<ivec3> &trigs,
    float k
) {
    // construct edges
    std::vector<ivec4> edges;
    restoreEdges(trigs, edges);

    float time0 = getTimePast();

    // find edges to merge
    std::vector<bool> merge(edges.size(), false);
    DisjointSet dsj((int)verts.size());
    for (int i = 0; i < (int)edges.size(); i++) {
        ivec4 e = edges[i];
        float l = dot2(verts[e.y]-verts[e.x]) / (k*k);
        if (e.z != -1 && l < dot2(verts[e.z]-verts[e.x]) ||
            e.w != -1 && l < dot2(verts[e.w]-verts[e.x]) ||
            e.z != -1 && l < dot2(verts[e.z]-verts[e.y]) ||
            e.w != -1 && l < dot2(verts[e.w]-verts[e.y])
            ) {
            merge[i] = true;
            dsj.unionSet(e.x, e.y);
        }
    }

    float time1 = getTimePast();

    // check topology change
    // dV+dF-dE=0 if no topology change
    std::vector<int> dtop(verts.size(), 0);
    for (int i = 0; i < (int)verts.size(); i++) {
        int j = dsj.findRep(i);
        if (j != i) dtop[j] -= 1;  // dV
    }
    for (ivec3 f : trigs) {
        for (int _ = 0; _ < 3; _++)
            f[_] = dsj.findRep(f[_]);
        if (f[0] == f[1] || f[0] == f[2] || f[1] == f[2]) {
            int i = ((f[0] + f[1] + f[2]) - (f[0] ^ f[1] ^ f[2])) >> 1;
            dtop[i] -= 1;  // dF
            if (f[0] == f[1] && f[0] == f[2])
                dtop[i] += 0;  // dE
            else dtop[i] += 1;  // dE
        }
    }
    for (ivec4 e : edges) {
        for (int _ = 0; _ < 2; _++)
            e[_] = dsj.findRep(e[_]);
        if (e[0] == e[1])
            dtop[e[0]] += 1;  // dE
    }
    // for (int i = 0; i < (int)verts.size(); i++)
    //     if (dsj.findRep(i) == i && dtop[i]) printf("%d ", dtop[i]); printf("\n");

    float time2 = getTimePast();

    // map verts
    std::vector<int> vmap(verts.size(), 0);
    int vn = 0;
    for (int i = 0; i < (int)verts.size(); i++) {
        vmap[i] = vn;
        int j = dsj.findRep(i);
        if (j == i || dtop[j] != 0)
            vn += 1;
    }
    for (int i = 0; i < (int)verts.size(); i++) {
        int j = dsj.findRep(i);
        if (j != i && dtop[j] == 0)
            vmap[i] = vmap[j];
    }
    std::vector<vec3> newVerts(vn, vec3(0));
    std::vector<int> newVertsCount(vn, 0);
    for (int i = 0; i < (int)verts.size(); i++) {
        int j = vmap[i];
        newVerts[j] += verts[i];
        newVertsCount[j] += 1;
    }
    for (int i = 0; i < vn; i++) {
        assert(newVertsCount[i] != 0);
        newVerts[i] /= newVertsCount[i];
    }

    // map trigs
    std::vector<ivec3> newTrigs;
    for (ivec3 f: trigs) {
        for (int _ = 0; _ < 3; _++)
            f[_] = vmap[f[_]];
        if (f[0] != f[1] && f[0] != f[2] && f[1] != f[2])
            newTrigs.push_back(f);
    }

    verts = newVerts;
    trigs = newTrigs;

    float time3 = getTimePast();
    printf("mergeEdge: %.2g + %.2g + %.2g = %.2g secs\n",
        time1-time0, time2-time1, time3-time2, time3-time0);

}
