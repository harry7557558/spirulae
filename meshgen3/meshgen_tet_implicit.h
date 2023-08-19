#pragma once

#include <stdio.h>
#include "meshgen_misc.h"

#if SUPPRESS_ASSERT
#undef assert
#define assert(x) 0
#endif

#define MESHGEN_TET_IMPLICIT_NS_START namespace MeshgenTetImplicit {
#define MESHGEN_TET_IMPLICIT_NS_END }

MESHGEN_TET_IMPLICIT_NS_START

using namespace MeshgenMisc;

#include "meshgen_tet_implicit_generate_initial_mesh.h"
#include "meshgen_tet_implicit_restore_surface.h"
#include "meshgen_tet_implicit_split_sticky_vertices.h"
#include "meshgen_tet_implicit_compress_mesh.h"


void initMeshGenerator() {
#if MESHGEN_TET_IMPLICIT_USE_GL
    glMaxMovementEvaluator = new GlMaxMovementEvaluator();
#endif
}


// assert this
bool isVolumeConsistent(
    const std::vector<vec3>& verts,
    const std::vector<ivec4>& tets
) {
    // sum of tet volumes
    double Vt = 0.0;
    for (ivec4 t : tets) {
        float dV = determinant(mat3(
            verts[t[1]] - verts[t[0]],
            verts[t[2]] - verts[t[0]],
            verts[t[3]] - verts[t[0]]
        )) / 6.0f;
        if (!(dV > 0.0))
            return false;
        Vt += (double)dV;
    }

    // faces
    std::unordered_set<ivec3> faces;
    for (ivec4 t : tets) {
        for (int i = 0; i < 4; i++) {
            ivec3 f;
            for (int _ = 0; _ < 3; _++)
                f[_] = t[(i+_)%4];
            if (i % 2 == 0)
                std::swap(f[1], f[2]);
            f = rotateIvec3(f);
            if (faces.find(f) != faces.end())
                return false;
            ivec3 fo = ivec3(f.x, f.z, f.y);
            if (faces.find(fo) != faces.end())
                faces.erase(fo);
            else faces.insert(f);
        }
    }

    // edges x volume from boundary
    std::unordered_set<ivec2> edges;
    int sticky_edge_count = 0;
    double Vs = 0.0;
    for (ivec3 f : faces) {
        for (int i = 0; i < 3; i++) {
            ivec2 e(f[i], f[(i+1)%3]);
            if (edges.find(e) != edges.end()) {
                sticky_edge_count += 1;
                edges.erase(e);
                continue;
            }
            ivec2 eo = ivec2(e.y, e.x);
            if (edges.find(eo) != edges.end())
                edges.erase(eo);
            else edges.insert(e);
        }
        float dV = determinant(mat3(
            verts[f.x], verts[f.y], verts[f.z]
        )) / 6.0f;
        Vs += (double)dV;
    }
    printf(">=%d sticky edges\n", sticky_edge_count);
    if (edges.size() != 0)
        return false;
    if (!(Vs > 0.0))
        return false;

    // compare
    printf("Vt=%f Vs=%f\n", Vt, Vs);
    return abs(Vs / Vt - 1.0) < 1e-4;
}


MESHGEN_TET_IMPLICIT_NS_END
