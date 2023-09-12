#pragma once

#include "meshgen_misc.h"
using namespace MeshgenMisc;

namespace Marching {

const int EDGES[6][2] = {
    {0, 1}, {0, 2}, {0, 3},
    {1, 2}, {1, 3}, {2, 3}
};
const int FACES[4][6] = {  // ccw, missing the index
    {1, 2, 3, 7, 9, 8},
    {0, 3, 2, 6, 9, 5},
    {0, 1, 3, 4, 8, 6},
    {0, 2, 1, 5, 7, 4}
};
const int EDGE_FACES[6][2] = {  // no particular order
    {2, 3}, {1, 3}, {1, 2},
    {0, 3}, {0, 2}, {0, 1}
};

// Lookup table for surface reconstruction
// 16: vertice signs, little endian, bit 1 = negative
// 6: max 6 possible tetrahedrations to choose from
// 12: max 3 groups of 4 vertices of tetrahedra
const int LUT_MARCH_T[16][6][12] = {
{ {-1} },
{ {0,4,5,6,-1}, {-1} },
{ {1,4,8,7,-1}, {-1} },
{ {0,1,7,8,0,6,8,7,0,5,6,7}, {0,1,7,8,0,5,6,8,0,5,8,7}, {0,1,5,6,1,5,6,7,1,6,8,7}, {0,1,5,6,1,5,8,7,1,5,6,8}, {0,5,6,8,0,1,5,8,1,5,8,7}, {0,5,6,7,0,1,7,6,1,6,8,7} },
{ {2,5,7,9,-1}, {-1} },
{ {0,6,7,9,0,4,7,6,0,2,9,7}, {0,4,9,6,0,2,9,4,2,4,7,9}, {0,2,6,4,2,4,7,9,2,4,9,6}, {0,4,9,6,0,4,7,9,0,2,9,7}, {2,6,7,9,0,4,7,6,0,2,6,7}, {0,2,6,4,2,6,7,9,2,4,7,6} },
{ {1,2,4,8,2,4,9,5,2,4,8,9}, {1,2,4,9,1,4,8,9,2,4,9,5}, {1,4,9,5,1,4,8,9,1,2,5,9}, {2,5,8,9,1,4,8,5,1,2,5,8}, {1,4,8,5,1,5,8,9,1,2,5,9}, {2,5,8,9,2,4,8,5,1,2,4,8} },
{ {0,1,9,6,1,6,8,9,0,1,2,9}, {0,1,2,8,2,6,8,9,0,2,6,8}, {1,2,6,8,2,6,8,9,0,1,2,6}, {0,1,2,9,0,1,9,8,0,6,8,9}, {1,2,6,9,1,6,8,9,0,1,2,6}, {0,2,9,8,0,1,2,8,0,6,8,9} },
{ {3,6,9,8,-1}, {-1} },
{ {3,5,9,8,3,4,5,8,0,3,4,5}, {0,3,8,9,0,5,9,8,0,4,5,8}, {3,4,5,9,3,4,9,8,0,3,4,5}, {0,4,5,8,3,5,9,8,0,3,8,5}, {0,3,8,9,0,4,5,9,0,4,9,8}, {0,4,5,9,0,3,4,9,3,4,9,8} },
{ {3,6,9,7,1,3,7,4,3,4,6,7}, {3,4,6,9,1,4,9,7,1,3,9,4}, {1,4,9,7,1,3,9,6,1,4,6,9}, {1,4,6,7,1,3,9,6,1,6,9,7}, {3,6,9,7,1,4,6,7,1,3,7,6}, {3,4,6,9,1,3,7,4,3,4,9,7} },
{ {3,5,9,7,0,1,7,3,0,3,7,5}, {0,5,9,7,0,1,7,9,0,1,9,3}, {0,1,5,9,1,5,9,7,0,1,9,3}, {0,5,9,7,0,1,7,3,0,3,7,9}, {1,3,9,5,0,1,5,3,1,5,9,7}, {3,5,9,7,0,1,5,3,1,3,7,5} },
{ {2,5,7,8,3,5,8,6,2,3,5,8}, {2,5,7,6,3,6,7,8,2,3,6,7}, {3,5,7,6,3,6,7,8,2,3,5,7}, {2,5,7,6,2,6,7,8,2,3,6,8}, {2,5,7,8,2,5,8,6,2,3,6,8}, {3,5,7,8,3,5,8,6,2,3,5,7} },
{ {3,4,7,8,0,3,4,7,0,2,3,7}, {0,2,3,4,2,4,7,8,2,3,4,8}, {0,2,8,4,2,4,7,8,0,2,3,8}, {0,2,3,4,2,3,4,7,3,4,7,8}, {0,4,7,8,0,2,8,7,0,2,3,8}, {0,4,7,8,0,2,3,7,0,3,8,7} },
{ {1,4,6,5,1,2,5,3,1,3,5,6}, {1,4,6,5,1,2,6,3,1,2,5,6}, {1,2,6,3,2,4,6,5,1,2,4,6}, {3,4,6,5,1,3,5,4,1,2,5,3}, {2,3,5,4,1,2,4,3,3,4,6,5}, {2,4,6,5,2,3,6,4,1,2,4,3} },
{ {0,1,2,3,-1}, {-1} },
};

// Lookup table for surface reconstruction
// Whether there is a point on an edge
const bool LUT_MARCH_E[16][6] = {
{0,0,0,0,0,0}, {1,1,1,0,0,0}, {1,0,0,1,1,0}, {0,1,1,1,1,0},
{0,1,0,1,0,1}, {1,0,1,1,0,1}, {1,1,0,0,1,1}, {0,0,1,0,1,1},
{0,0,1,0,1,1}, {1,1,0,0,1,1}, {1,0,1,1,0,1}, {0,1,0,1,0,1},
{0,1,1,1,1,0}, {1,0,0,1,1,0}, {1,1,1,0,0,0}, {0,0,0,0,0,0},
};

// Lookup table for surface reconstruction
// Face modes; Max 2 faces
const int LUT_MARCH_F[8][2][6] = {
    { {-1} },
    { {0,3,5, -1}, {-1} },
    { {1,4,3, -1}, {-1} },
    { {0,1,5, 5,1,4}, {0,1,4, 0,4,5} },
    { {2,5,4, -1}, {-1} },
    { {2,0,4, 4,0,3}, {2,0,3, 2,3,4} },
    { {1,2,3, 3,2,5}, {1,2,5, 1,5,3} },
    { {0,1,2, -1}, {-1} },
};

}  // namespace Marching


void cutIsosurface(
    const std::vector<vec3>& verts, std::vector<float> funvals, std::vector<bool> toCut,
    const std::vector<ivec4>& tets, const std::vector<bool> isConstrained[3],
    std::vector<vec3>& resVerts, std::vector<ivec4>& resTets, std::vector<bool> resIsConstrained[3]
) {
    using namespace Marching;
    assert(verts.size() == funvals.size());
    resVerts.clear();
    resTets.clear();
    for (int _ = 0; _ < 3; _++)
        resIsConstrained[_].clear();
    
    if (!toCut.empty())
        for (size_t i = 0; i < verts.size(); i++)
            funvals[i] = toCut[i] ? 1.0f : -1.0f;

    float time0 = getTimePast();

    // map index in `verts` to index in `resVerts`
    std::vector<int> vMap(verts.size(), -1);

    // map edge vertex to index in `resVerts`
    std::unordered_map<ivec2, int> eMap;

    // generate a list of points
    auto calcIndex = [&](ivec4 tet) -> int {
        int idx = 0;
        for (int _ = 0; _ < 4; _++)
            idx |= int(funvals[tet[_]] < 0.) << _;
        return idx;
    };
    for (ivec4 tet : tets) {
        // add vertices to list
        for (int _ = 0; _ < 4; _++) {
            int i = tet[_];
            if (vMap[i] == -1 && funvals[i] < 0.) {
                vMap[i] = (int)resVerts.size();
                resVerts.push_back(verts[i]);
                for (int _ = 0; _ < 3; _++)
                    resIsConstrained[_].push_back(isConstrained[_][i]);
            }
        }
        // add edges to list
        int idx = calcIndex(tet);
        auto LutE = LUT_MARCH_E[idx];
        for (int _ = 0; _ < 6; _++) {
            if (LutE[_]) {
                int i = tet[EDGES[_][0]], j = tet[EDGES[_][1]];
                if (i > j) std::swap(i, j);
                if (eMap.find(ivec2(i, j)) == eMap.end()) {
                    eMap[ivec2(i, j)] = (int)resVerts.size();
                    vec3 x0 = verts[i], x1 = verts[j];
                    float t0 = funvals[i], t1 = funvals[j];
                    resVerts.push_back(0.5f*(x0+x1));
                    // resVerts.push_back(mix(x0, x1, -t0/(t1-t0)));
                    for (int _ = 0; _ < 3; _++)
                        resIsConstrained[_].push_back(isConstrained[_][i] && isConstrained[_][j]);
                }
            }
        }
    }

    float time1 = getTimePast();

    // generate a list of faces
    std::unordered_map<ivec3, const int*> fMap;  // face, type in LUT
    for (ivec4 tet : tets) {
        int idxt = calcIndex(tet);
        if (idxt == 0) continue;
        // if it's a prism, all quad face indices must not be the same for it to have a solution
        bool isPrismIndex = (idxt == 0b0111 || idxt == 0b1011 || idxt == 0b1101 || idxt == 0b1110);
        // go through each face
        int idx[4]; bool isQuadIndex[4]; ivec3 f[4];
        int qti[4] = { -1,-1,-1,-1 };  // triangulation choice index
        for (int fi = 0; fi < 4; fi++) {
            // get face
            for (int _ = 0; _ < 3; _++)
                f[fi][_] = tet[FACES[fi][_]];
            // calculate face index
            idx[fi] = 0;
            for (int _ = 0; _ < 3; _++)
                idx[fi] |= int(funvals[f[fi][_]] < 0.) << _;
            isQuadIndex[fi] = (idx[fi] == 3 || idx[fi] == 5 || idx[fi] == 6);
            f[fi] = rotateIvec3(f[fi]);
            // already exists
            ivec3 fo = rotateIvec3(ivec3(f[fi].x, f[fi].z, f[fi].y));
            if (isQuadIndex[fi] && fMap.find(fo) != fMap.end()) {
                const int* p = fMap[fo];
                int idxo = ((p - LUT_MARCH_F[0][0]) / 6) % 2;
                qti[fi] = 1 - idxo;
            }
        }
        // fill qti, 2 ways to divide
        if (isPrismIndex) {
            int has1 = 0, has0 = 0;
            for (int fi = 0; fi < 4; fi++)
                has1 += (qti[fi] == 1), has0 += (qti[fi] == 0);
            int fill = has1 ? 0 : 1;  // default filling
            int fill0 = (has1 | has0) || (3 - (has1 + has0) <= 1)
                ? fill : 1 - fill;  // first one, unique
            for (int fi = 0; fi < 4; fi++)
                if (qti[fi] == -1) {
                    if (idx[fi] == 0b111) qti[fi] = 0;  // the base
                    else if (fill0 != fill) qti[fi] = fill0, fill0 = fill;  // unique
                    else qti[fi] = fill;  // default
                }
        }
        // only one way to divide
        else {
            for (int fi = 0; fi < 4; fi++)
                qti[fi] = std::max(qti[fi], 0);
        }
        // put face
        for (int fi = 0; fi < 4; fi++) {
            auto LutF = LUT_MARCH_F[idx[fi]];
            fMap[f[fi]] = LutF[0][0] == -1 ?
                nullptr : LutF[qti[fi]];
        }
    }

    float time2 = getTimePast();

    // add tets
    for (ivec4 tet : tets) {
        // lookup edges
        int es[10] = {
            vMap[tet.x], vMap[tet.y], vMap[tet.z], vMap[tet.w],
            -1, -1, -1, -1, -1, -1
        };
        int idx = calcIndex(tet);
        for (int _ = 0; _ < 6; _++) {
            if (LUT_MARCH_E[idx][_]) {
                int i = tet[EDGES[_][0]], j = tet[EDGES[_][1]];
                if (i > j) std::swap(i, j);
                es[_ + 4] = eMap[ivec2(i, j)];
            }
        }
        // get a list of must-have faces
        ivec3 reqFaces[8];
        int facesN = 0;
        for (int fi = 0; fi < 4; fi++) {
            ivec3 f;
            for (int _ = 0; _ < 3; _++)
                f[_] = tet[FACES[fi][_]];
            f = rotateIvec3(f);
            const int* fs = fMap[f];
            if (!fs) continue;
            for (int vi = 0; vi < 6; vi += 3) {
                if (fs[vi] == -1) break;
                for (int _ = 0; _ < 3; _++)
                    f[_] = FACES[fi][fs[vi + _]];
                reqFaces[facesN] = rotateIvec3(f);
                facesN += 1;
            }
        }
        // find a tet combination that meets all faces
        const int* LutTBest = nullptr;
        bool found = false;
        for (int tsi = 0; tsi < 6; tsi++) {
            auto LutT = LUT_MARCH_T[idx][tsi];
            if (LutT[0] == -1) break;
            bool meetFaces[8] = { 0,0,0,0,0,0,0,0 };
            int meetCount = 0;
            for (int ti = 0; ti < 12; ti += 4) {
                const int* t = &LutT[ti];
                if (*t == -1) break;
                for (int fi = 0; fi < 4; fi++) {
                    ivec3 f;
                    for (int _ = 0; _ < 3; _++)
                        f[_] = t[FACES[fi][_]];
                    f = rotateIvec3(f);
                    for (int _ = 0; _ < facesN; _++)
                        if (f == reqFaces[_]) {
                            assert(!meetFaces[_]);
                            meetFaces[_] = true;
                            meetCount += 1;
                        }
                }
            }
            if (meetCount == facesN) {
                LutTBest = LutT;
                found = true;
                break;
            }
        }
        // add tets
        if (LutTBest) {
            for (int i = 0; i < 12; i += 4) {
                if (LutTBest[i] == -1) break;
                ivec4 tet1;
                for (int _ = 0; _ < 4; _++) {
                    tet1[_] = es[LutTBest[i + _]];
                    assert(tet1[_] != -1);
                }
                resTets.push_back(tet1);
            }
        }
        // not found - create a new vertex
        else if (!found) {
            assert(facesN == 7);
            // add a vertex in the middle
            es[idx == 0b0111 ? 3 : idx == 0b1011 ? 2 :
                idx == 0b1101 ? 1 : idx == 0b1110 ? 0 : -1] = -1;
            vec3 mid(0); int count = 0;
            for (int i = 0; i < 10; i++)
                if (es[i] != -1)
                    mid += resVerts[es[i]], count++;
            assert(count == 6);
            mid = mid * (1.0f / count);
            int vn = (int)resVerts.size();
            resVerts.push_back(mid);
            for (int _ = 0; _ < 3; _++)
                resIsConstrained[_].push_back(false);
            // construct tets
            for (int i = 0; i < facesN; i++) {
                ivec3 t = reqFaces[i];
                resTets.push_back(ivec4(vn,
                    es[t[0]], es[t[1]], es[t[2]]));
            }
            ivec3 t = idx == 0b1110 ? ivec3(4, 6, 5)
                : idx == 0b1101 ? ivec3(4, 7, 8)
                : idx == 0b1011 ? ivec3(7, 5, 9)
                : idx == 0b0111 ? ivec3(6, 8, 9) : ivec3(-1);
            resTets.push_back(ivec4(vn,
                es[t[0]], es[t[1]], es[t[2]]));
        }
    }

    float time3 = getTimePast();
    printf("cutIsosurface: %.2g + %.2g + %.2g = %.2g secs\n",
        time1-time0, time2-time1, time3-time2, time3-time0);
}
