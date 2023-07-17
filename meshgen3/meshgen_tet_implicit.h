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

namespace MeshgenTetLoss {
#include "meshgen_tet_loss.h"
}


void generateInitialMesh(
    ScalarFieldFBatch Fs, vec3 b0, vec3 b1, ivec3 bn, int nd,
    std::vector<vec3> &vertices, std::vector<ivec4> &tets,
    std::vector<bool> isConstrained[3]
) {
    assert(bn.x >= 1 && bn.y >= 1 && bn.z >= 1);
    nd++;
    ivec3 bnd(bn.x << nd, bn.y << nd, bn.z << nd);
    assert(bn.x < 1023 && bn.y < 1023 && bn.z < 1023); // prevent overflow

    std::unordered_map<int, int> vmap;
    std::vector<float> vals;
    std::vector<int> reqValIdx;

    auto getIdx = [&](int i, int j, int k) {
        return (((i << 10) | j) << 10) | k;
    };
    auto idxToIjk = [&](int idx) {
        int i = idx >> 20;
        int j = (idx - (i << 20)) >> 10;
        int k = idx - (i << 20) - (j << 10);
        return ivec3(i, j, k);
    };
    auto idxToPos = [&](int idx) {
        ivec3 ij = idxToIjk(idx);
        float tx = ij.x / (float)bnd.x;
        float ty = ij.y / (float)bnd.y;
        float tz = ij.z / (float)bnd.z;
        return b0 + (b1 - b0) * vec3(tx, ty, tz);
    };
    auto reqVal = [&](int i, int j, int k) {
        int idx = getIdx(i, j, k);
        if (vmap.find(idx) == vmap.end()) {
            reqValIdx.push_back(getIdx(i, j, k));
            vmap[idx] = 0.0;
        }
    };
    auto batchVal = [&]() {
        if (reqValIdx.empty())
            return;
        std::vector<vec3> ps;
        ps.reserve(reqValIdx.size());
        for (int i = 0; i < (int)reqValIdx.size(); i++) {
            int idx = reqValIdx[i];
            vmap[idx] = (int)vals.size() + i;
            ps.push_back(idxToPos(idx));
        }
        vals.resize(vals.size() + ps.size());
        Fs(ps.size(), &ps[0], &vals[vals.size() - ps.size()]);
        reqValIdx.clear();
    };
    auto getVal = [&](int i, int j, int k) {
        int idx = getIdx(i, j, k);
        assert(vmap.find(idx) != vmap.end());
        return vals[vmap[idx]];
    };
    auto isConstrainedX = [&](int idx) {
        ivec3 ijk = idxToIjk(idx);
        return ijk.x == 0 || ijk.x == bnd.x;
    };
    auto isConstrainedY = [&](int idx) {
        ivec3 ijk = idxToIjk(idx);
        return ijk.y == 0 || ijk.y == bnd.y;
    };
    auto isConstrainedZ = [&](int idx) {
        ivec3 ijk = idxToIjk(idx);
        return ijk.z == 0 || ijk.z == bnd.z;
    };

    // tets
    tets.clear();
    auto calcTet = [&](int t1, int t2, int t3, int t4) {
        ivec4 t(t1, t2, t3, t4);
        int inCount = 0, cCount = 0;
        for (int _ = 0; _ < 4; _++) {
            assert(vmap.find(t[_]) != vmap.end());
            inCount += int(vals[vmap[t[_]]] < 0.0);
            cCount += (int)(isConstrainedX(t[_]) || isConstrainedY(t[_]) || isConstrainedZ(t[_]));
        }
        return ivec2(inCount, cCount);
    };
    auto testTet = [&](ivec2 p) {
        return p.x - 1 * p.y >= 1;
    };
    auto addTet = [&](int t1, int t2, int t3, int t4) {
        ivec2 p = calcTet(t1, t2, t3, t4);
        if (testTet(p))
            tets.push_back(ivec4(t1, t2, t3, t4));
    };
    std::vector<ivec3> cubesToAdd;
    std::vector<int> cubeSizes;
    auto addCube = [&](int i, int j, int k, int step) {
        cubesToAdd.push_back(ivec3(i, j, k));
        cubeSizes.push_back(step);
    };

    // verts
    int step = 1 << nd;
    for (int k = 0; k <= bn[2]; k++)
        for (int j = 0; j <= bn[1]; j++)
            for (int i = 0; i <= bn[0]; i++)
                reqVal(i * step, j * step, k * step);
    for (int k = 0; k < bn[2]; k++)
        for (int j = 0; j < bn[1]; j++)
            for (int i = 0; i < bn[0]; i++)
                reqVal(i * step + step / 2, j * step + step / 2, k * step + step / 2);
    batchVal();

    // next level
    std::vector<ivec3> cubes;
    for (int k = 0; k < bn[2]; k++)
        for (int j = 0; j < bn[1]; j++)
            for (int i = 0; i < bn[0]; i++)
                cubes.push_back(ivec3(i*step, j*step, k*step));

    for (int _ = 1; _ < nd; _++) {
        std::unordered_map<int, int> cubesmap;
        for (int i = 0; i < (int)cubes.size(); i++) {
            ivec3 cb = cubes[i];
            cubesmap[getIdx(cb.x, cb.y, cb.z)] = i;
        }

        int step1 = step >> 1;

        // todiv criterion by sign
        std::vector<bool> toDiv0(cubes.size(), false);
        for (int i = 0; i < (int)cubes.size(); i++) {
            ivec3 cb = cubes[i];
            float v000 = getVal(cb.x+0*step, cb.y+0*step, cb.z+0*step);
            float v010 = getVal(cb.x+0*step, cb.y+1*step, cb.z+0*step);
            float v100 = getVal(cb.x+1*step, cb.y+0*step, cb.z+0*step);
            float v110 = getVal(cb.x+1*step, cb.y+1*step, cb.z+0*step);
            float v001 = getVal(cb.x+0*step, cb.y+0*step, cb.z+1*step);
            float v011 = getVal(cb.x+0*step, cb.y+1*step, cb.z+1*step);
            float v101 = getVal(cb.x+1*step, cb.y+0*step, cb.z+1*step);
            float v111 = getVal(cb.x+1*step, cb.y+1*step, cb.z+1*step);
            float vccc = getVal(cb.x+step/2, cb.y+step/2, cb.z+step/2);
            if (((int)(v000 > 0.0) + (int)(v010 > 0.0) +
                 (int)(v100 > 0.0) + (int)(v110 > 0.0) +
                 (int)(v001 > 0.0) + (int)(v011 > 0.0) +
                 (int)(v101 > 0.0) + (int)(v111 > 0.0) +
                 (int)(vccc > 0.0)) % 9 == 0)
                continue;
        #if 0
            // Basic idea:
            // - least squares fit to a circle
            //   - a (x^2+y^2) + b x + c y + d
            //   - [cc 00 10 01 11]
            // - compare the radius of the circle to grid size
            // MATLAB:
            // - syms x y
            // - A = [0 0 0 1; x^2+y^2 -x -y 1; x^2+y^2 x -y 1; x^2+y^2 -x y 1; x^2+y^2 x y 1]
            // - G = (A'*A)\A'
            float hx = 0.5f * (b1.x - b0.x) / (float)bnd.x * step;
            float hy = 0.5f * (b1.y - b0.y) / (float)bnd.y * step;
            float a = (v00 + v10 + v01 + v11 - 4.0f * vcc) / (4.0f * (hx * hx + hy * hy));
            if (a == 0.0f) continue;
            float b = (v10 + v11 - v00 - v01) / (4.0f * hx * a);
            float c = (v01 + v11 - v00 - v10) / (4.0f * hy * a);
            float d = vcc / a;
            float x0 = -0.5f * b;
            float y0 = -0.5f * c;
            float r = sqrt(fmax(x0 * x0 + y0 * y0 - d, 0.0f));
            float e = sqrt((b1.x - b0.x) * (b1.y - b0.y) / (bnd.x * bnd.y));
            float s = sqrt(hx * hy);
            // if (r < 10.0f * s)  // curvature
            if (s * s > 0.5f * e * r)  // error
                toDiv0[i] = true;
        #endif
            toDiv0[i] = true;
        }
        // spread todiv
        std::vector<bool> toDiv = toDiv0;
        if (_ + 1 != nd) {
            for (int i = 0; i < (int)cubes.size(); i++) {
                if (!toDiv[i]) continue;
                ivec3 cb = cubes[i];
                for (int u = -2; u <= 2; u++)
                    for (int v = -2; v <= 2; v++)
                        for (int w = -2; w <= 2; w++) {
                            if (u * u  + v * v + w * w <= 2) {
                                ivec3 cb1(cb.x + u * step, cb.y + v * step, cb.z + w * step);
                                int idx = getIdx(cb1.x, cb1.y, cb1.z);
                                if (cubesmap.find(idx) != cubesmap.end()) {
                                    toDiv0[cubesmap[idx]] = true;
                                }
                            }
                        }
            }
            toDiv = toDiv0;
        }
        // todiv: neighbors must in cubes
        for (int i = 0; i < (int)cubes.size(); i++) {
            if (!toDiv[i]) continue;
            ivec3 cb = cubes[i];
            int cbidx = getIdx(cb.x, cb.y, cb.z);
            for (int u = -1; u <= 1; u++)
                for (int v = -1; v <= 1; v++)
                    for (int w = -1; w <= 1; w++) {
                        if (abs(u) + abs(v) + abs(w) == 1) {
                            ivec3 cb1(cb.x + u * step, cb.y + v * step, cb.z + w * step);
                            int idx = getIdx(cb1.x, cb1.y, cb1.z);
                            if (cubesmap.find(idx) == cubesmap.end() && !(
                                cb1.x < 0 || cb1.y < 0 || cb1.z < 0 ||
                                cb1.x >= bnd.x || cb1.y >= bnd.y || cb1.z >= bnd.z
                            ))
                                toDiv0[cubesmap[cbidx]] = false;
                        }
                    }
        }
        toDiv = toDiv0;

        // add cubes
        step = step1;
        for (int ci = 0; ci < (int)cubes.size(); ci++) {
            if (!toDiv[ci]) continue;
            int s = step / 2;
            int ic = cubes[ci].x + 2 * s;
            int jc = cubes[ci].y + 2 * s;
            int kc = cubes[ci].z + 2 * s;
            for (int i = -2; i <= 2; i++)
                for (int j = -2; j <= 2; j++)
                    for (int k = -2; k <= 2; k++) {
                        if ((abs(i) == 1 && abs(j) == 1 && abs(k) == 1) ||
                            ((i % 2 == 0 && j % 2 == 0 && k % 2 == 0 && (abs(i) + abs(j) + abs(k)) % 6 != 0))
                        ) reqVal(ic + i * s, jc + j * s, kc + k * s);
                    }
        }
        batchVal();
        for (int i = 0; i < (int)cubes.size(); i++) {
            ivec3 cb = cubes[i];
            if (!toDiv[i]) {
                addCube(cb.x, cb.y, cb.z, step * 2);
            }
        }

        // next iteration
        std::vector<ivec3> cubes1;
        for (int i = 0; i < (int)cubes.size(); i++) {
            if (!toDiv[i]) continue;
            ivec3 cb = cubes[i];
            for (int u = 0; u < 2; u++)
                for (int v = 0; v < 2; v++)
                    for (int w = 0; w < 2; w++)
                        cubes1.push_back(ivec3(
                            cb.x + u * step,
                            cb.y + v * step,
                            cb.z + w * step));
        }
        cubes = cubes1;
        if (cubes.empty()) break;
    }
    for (ivec3 cb : cubes) {
        addCube(cb.x, cb.y, cb.z, step);
    }

    // add cubes
    auto addT2 = [&](int idx1, int idx2, int idx3, int idx4, int idx0, int s) {
        // if (s > 1 && vmap.find(idx0) != vmap.end()) {
        //     addTet(idx1, idx0, idx3);
        //     addTet(idx2, idx3, idx0);
        // }
        // else addTet(idx1, idx2, idx3, idx4);
        addTet(idx1, idx2, idx3, idx4);
    };
    for (int i = 0; i < (int)cubesToAdd.size(); i++) {
        ivec3 cb = cubesToAdd[i];
        int s = cubeSizes[i];
        if (s == 1) continue;
        int i0 = cb.x, i1 = i0 + s / 2, i2 = i0 + s;
        int j0 = cb.y, j1 = j0 + s / 2, j2 = j0 + s;
        int k0 = cb.z, k1 = k0 + s / 2, k2 = k0 + s;
        int idxc = getIdx(i1, j1, k1);
        // addT2(getIdx(i0, j0, k0), getIdx(i2, j0, k0), getIdx(i2, j2, k0), idxc, getIdx(i1, j1, k0), s);
        // addT2(getIdx(i0, j0, k0), getIdx(i2, j2, k0), getIdx(i0, j2, k0), idxc, getIdx(i1, j1, k0), s);
        addT2(getIdx(i0, j0, k0), getIdx(i2, j2, k0), getIdx(i0, j2, k2), getIdx(i2, j0, k2), idxc, s);
    }

    // remove unused vertices
    std::vector<int> vpsa(vmap.size(), 0);
    for (ivec4 t : tets)
        for (int _ = 0; _ < 4; _++)
            vpsa[vmap[t[_]]] = 1;
    vertices.clear();
    for (int i = 0; i < (int)vpsa.size(); i++) {
        if (vpsa[i]) {
            vpsa[i] = (int)vertices.size();
            vertices.push_back(vec3());
        }
        else vpsa[i] = -1;
    }
    isConstrained[0] = isConstrained[1] =
        std::vector<bool>(vertices.size(), false);
    for (std::pair<int, int> ii : vmap) {
        int i = vpsa[ii.second];
        if (i != -1) {
            int idx = ii.first;
            ivec3 ijk = idxToIjk(idx);
            vertices[i] = idxToPos(idx);
            if (getVal(ijk.x, ijk.y, ijk.z) <= 0.0) {
                if (isConstrainedX(idx))
                    isConstrained[0][i] = true;
                if (isConstrainedY(idx))
                    isConstrained[1][i] = true;
                if (isConstrainedZ(idx))
                    isConstrained[2][i] = true;
            }
        }
    }
    for (int i = 0; i < (int)tets.size(); i++) {
        for (int _ = 0; _ < 4; _++) {
            tets[i][_] = vpsa[vmap[tets[i][_]]];
            assert(tets[i][_] >= 0);
        }
    }

}


#if 0

void splitStickyVertices(
    std::vector<vec2> &vertices, std::vector<ivec3> &trigs,
    std::vector<bool> isConstrained[2]
) {
    int vn = (int)vertices.size();
    assert(vn == isConstrained[0].size() && vn == isConstrained[1].size());

    // get neighbors
    std::vector<std::vector<int>> neighbors(vn);
    std::vector<std::vector<int>> neighborTs(vn);
    for (int ti = 0; ti < (int)trigs.size(); ti++) {
        ivec3 t = trigs[ti];
        for (int i = 0; i < 3; i++) {
            neighborTs[t[i]].push_back(ti);
            for (int j = 0; j < 3; j++) if (j != i) {
                bool has = false;
                for (int v : neighbors[t[i]])
                    if (v == t[j]) has = true;
                if (!has)
                    neighbors[t[i]].push_back(t[j]);
            }
        }
    }

    // break some constraints
    for (int vi = 0; vi < vn; vi++) {
        std::vector<int> nb = neighbors[vi];
        for (int dim = 0; dim < 2; dim++) {
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
        std::vector<int> nb = neighbors[vi];
        int nn = (int)nb.size();
        for (int i = 0; i < nn; i++)
            neighborMap[nb[i]] = i;
        // find disjoint components
        DisjointSet dsj(nn);
        for (int ii = 0; ii < nn; ii++) {
            for (int ti : neighborTs[vi]) {
                ivec3 t = trigs[ti];
                int count = 0;
                for (int i = 0; i < 3; i++) {
                    int j = (i + 1) % 3;
                    int a = neighborMap[additionalMap[t[i]]];
                    int b = neighborMap[additionalMap[t[j]]];
                    if (a != -1 && b != -1) {
                        dsj.unionSet(a, b);
                        count++;
                    }
                }
                assert(count == 1);
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
                    for (int _ = 0; _ < 2; _++)
                        isConstrained[_].push_back(isConstrained[_][vi]);
                    additionalMap.push_back(vi);
                }
                else newVi[rep] = vi;
            }
        }
        // update trigs
        if (dsjCount > 1) {
            int changedCount = 0;
            for (int ti : neighborTs[vi]) {
                ivec3 t = trigs[ti];
                for (int i = 0; i < 3; i++) {
                    if (t[i] != vi) continue;
                    for (int _ = 0; _ < 3; _++) if (i != _) {
                        int ji = neighborMap[additionalMap[t[_]]];
                        t[i] = newVi[dsj.findRep(ji)];
                        changedCount += 1;
                        break;
                    }
                }
                trigs[ti] = t;
            }
            assert(changedCount == (int)neighborTs[vi].size());
        }
        // restore neighbor map
        for (int i = 0; i < nn; i++)
            neighborMap[nb[i]] = -1;
    }
}


/* Mesh Optimizer */


void assertVolumeEqual(
    const std::vector<vec2>& verts,
    const std::vector<ivec3>& trigs
) {
    // sum of trig values
    float At = 0.0;
    for (ivec3 t : trigs) {
        float dA = determinant(mat2(
            verts[t[1]] - verts[t[0]],
            verts[t[2]] - verts[t[0]]
        )) / 2.0;
        assert(dA > 0.0);
        At += dA;
    }

    // edges
    std::set<uint64_t> edges;
    for (ivec3 t : trigs) {
        for (int i = 0; i < 3; i++) {
            ivec2 e;
            for (int _ = 0; _ < 2; _++)
                e[_] = t[(i+_)%3];
            uint64_t ei = ((uint64_t)e.x << 32) | (uint64_t)e.y;
            assert(edges.find(ei) == edges.end());
            uint64_t eo = ((uint64_t)e.y << 32) | (uint64_t)e.x;
            if (edges.find(eo) != edges.end())
                edges.erase(eo);
            else edges.insert(ei);
        }
    }

    // area from boundary
    float As = 0.0;
    for (uint64_t ei : edges) {
        ivec2 e = ivec2((int)(ei>>32), (int)ei);
        float dA = determinant(mat2(
            verts[e.x], verts[e.y]
        )) / 2.0;
        As += dA;
    }
    assert(As > 0);

    // compare
    printf("At=%f As=%f\n", At, As);
    assert(abs(As / At - 1.0) < 1e-3);
}


// Refine the mesh, requires positive volumes for all trigs
void smoothMesh(
    std::vector<vec2>& verts,
    std::vector<ivec3>& trigs,
    int nsteps,
    ScalarFieldFBatch F = nullptr,
    std::function<vec2(vec2)> constraint = nullptr,  // add this to bring point back
    std::vector<bool> isConstrained_[2] = nullptr
) {
    int vn = (int)verts.size(), svn = 0;  // # of vertices; # on boundary
    int tn = (int)trigs.size(), stn = 0;  // # of trigs; # on boundary

    // boundary
    std::set<uint64_t> boundary;
    for (ivec3 t : trigs) {
        for (int i = 0; i < 3; i++) {
            ivec2 e;
            for (int _ = 0; _ < 2; _++)
                e[_] = t[(i+_)%3];
            uint64_t ei = ((uint64_t)e.x << 32) | (uint64_t)e.y;
            assert(boundary.find(ei) == boundary.end());
            uint64_t eo = ((uint64_t)e.y << 32) | (uint64_t)e.x;
            if (boundary.find(eo) != boundary.end())
                boundary.erase(eo);
            else boundary.insert(ei);
        }
    }

    // geometry
    std::vector<int> compressedIndex(vn, -1);  // [vn] global -> near boundary
    std::vector<int> fullIndex;  // [svn] near boundary -> global
    std::vector<int> boundaryTrigs;  // [stn] indices of trigs near boundary
    std::vector<bool> isConstrained[3];  // [vn] constrained on domain boundary? (any, x, y)
    std::vector<bool> applyBoundaryConstraints(vn, false);  // [vn] constrained on isoboundary?
    auto isOnBoundary = [&](int i) {
        return isConstrained[0][i] || applyBoundaryConstraints[i];
    };
    // geometry and values
    std::vector<vec2> boundaryVertPs;  // [svn] positions
    std::vector<float> boundaryVertVals;  // [svn] function values
    std::vector<vec2> boundaryVertGrads, boundaryTrigGrads;  // [svn, stn] gradients
    std::vector<float> boundaryVertGradWeights;  // [svn] used to project trig gradients to verts
    // smoothing
    std::vector<vec2> grads(vn);
    std::vector<float> maxFactor(vn), maxMovement(vn);

    // vertices near boundary
    for (int _ = 0; _ < 3; _++)
        isConstrained[_] = std::vector<bool>(vn, false);
    if (isConstrained_) {
        assert(isConstrained[0].size() == vn && isConstrained[1].size() == vn);
        for (int i = 0; i < vn; i++) {
            isConstrained[1][i] = isConstrained_[0][i];
            isConstrained[2][i] = isConstrained_[1][i];
            isConstrained[0][i] = isConstrained[1][i] || isConstrained[2][i];
        }
    }
    if (F) {
        // on boundary
        for (uint64_t f_ : boundary) {
            ivec2 f = ivec2((int)(f_>>32), (int)f_);
            bool isC = isConstrained[0][f[0]]
                && isConstrained[0][f[1]];
            for (int _ = 0; _ < 2; _++) {
                if (compressedIndex[f[_]] == -1) {
                    compressedIndex[f[_]] = svn;
                    fullIndex.push_back(f[_]);
                    svn++;
                }
                if (!isC)
                    applyBoundaryConstraints[f[_]] = true;
            }
        }
        // one layer
        int i0 = 0, i1 = svn;
        for (int ti = 0; ti < tn; ti++) {
            ivec3 t = trigs[ti];
            int onboundary = 0;
            for (int _ = 0; _ < 3; _++)
                if (compressedIndex[t[_]] >= i0 &&
                    compressedIndex[t[_]] < i1)
                    onboundary += 1;
            if (onboundary == 0)
                continue;
            boundaryTrigs.push_back(ti);
            for (int _ = 0; _ < 3; _++)
                if (compressedIndex[t[_]] == -1) {
                    compressedIndex[t[_]] = svn;
                    fullIndex.push_back(t[_]);
                    svn++;
                }
            stn++;
        }
        // make sure isOnBoundary() works
        std::vector<bool> onBoundary(vn, false);
        for (uint64_t f : boundary)
            for (int _ = 0; _ < 2; _++)
                onBoundary[((int*)&f)[_]] = true;
        for (int i = 0; i < vn; i++)
            assert(onBoundary[i] == isOnBoundary(i));
    }
    boundaryVertPs.resize(svn);
    boundaryVertVals.resize(svn);
    boundaryVertGrads.resize(svn);
    boundaryVertGradWeights.resize(svn);
    boundaryTrigGrads.resize(stn);

    for (int stepi = 0; stepi < nsteps; stepi++) {

        /* Smoothing */

        // accumulate gradient
        for (int i = 0; i < vn; i++)
            grads[i] = vec2(0.0);
        for (ivec3 trig : trigs) {
            vec2 v[3], g[3];
            for (int _ = 0; _ < 3; _++)
                v[_] = verts[trig[_]];
            const float* vd = (const float*)&v[0];
            float val, size2;
            float* res[3] = { &val, (float*)g, &size2 };
            MeshgenTetLoss::MESHGEN_TET_loss(&vd, res, nullptr, nullptr, 0);
            for (int _ = 0; _ < 3; _++) {
                vec2 dg = 0.1f * g[_] * size2;
                if (std::isfinite(dot(dg, dg)))
                    grads[trig[_]] -= dg;
            }
        }

        // force the mesh on the boundary
        if (F) {
            // evaluate
            for (int i = 0; i < svn; i++) {
                int j = fullIndex[i];
                if (j != -1)
                    boundaryVertPs[i] = verts[j] + grads[j];
            }
            F(svn, &boundaryVertPs[0], &boundaryVertVals[0]);
            // gradient on trigs
            for (int i = 0; i < stn; i++) {
                vec2 x[3]; float v[3];
                for (int _ = 0; _ < 3; _++) {
                    int j = compressedIndex[trigs[boundaryTrigs[i]][_]];
                    assert(j >= 0 && j < svn);
                    x[_] = boundaryVertPs[j];
                    v[_] = boundaryVertVals[j];
                }
                mat2 m(x[1]-x[0], x[2]-x[0]);
                vec2 b(v[1]-v[0], v[2]-v[0]);
                boundaryTrigGrads[i] = inverse(transpose(m)) * b;
            }
            // gradient on verts
            for (int i = 0; i < svn; i++) {
                boundaryVertGradWeights[i] = 0.0;
                boundaryVertGrads[i] = vec2(0.0);
            }
            for (int i = 0; i < stn; i++) {
                for (int _ = 0; _ < 3; _++) {
                    int j = compressedIndex[trigs[boundaryTrigs[i]][_]];
                    boundaryVertGrads[j] += boundaryTrigGrads[i];
                    boundaryVertGradWeights[j] += 1.0;
                }
            }
            for (int i = 0; i < svn; i++) {
                if (boundaryVertGradWeights[i] <= 0.0) printf("%d %lf\n", i, boundaryVertGradWeights[i]);
                assert(boundaryVertGradWeights[i] > 0.0);
                boundaryVertGrads[i] /= boundaryVertGradWeights[i];
            }
            // move the vertex to the boundary
            for (int i = 0; i < svn; i++) {
                if (fullIndex[i] == -1)
                    continue;
                if (!applyBoundaryConstraints[fullIndex[i]])
                    continue;
                float v = boundaryVertVals[i];
                vec2 g = boundaryVertGrads[i];
                grads[fullIndex[i]] -= v * g / dot(g, g);
            }
        }

        // apply boundary constraints
        for (int i = 0; i < vn; i++) {
            for (int _ = 0; _ < 2; _++)
                if (isConstrained[_ + 1][i])
                    ((float*)&grads[i])[_] = 0.0;
        }
        if (constraint) {
            for (int i = 0; i < vn; i++)
                grads[i] += constraint(verts[i] + grads[i]);
        }

        // calculate maximum allowed vertex movement factor
        for (int i = 0; i < vn; i++)
            maxFactor[i] = 1.0, maxMovement[i] = 0.0;
        for (ivec3 trig : trigs) {
            // prevent going negative by passing through a face
            // check boundary
            vec2 v[3], g[3];
            float mf[3] = { 1.0, 1.0, 1.0 };
            for (int i = 0; i < 3; i++) {
                for (int _ = 0; _ < 3; _++) {
                    int j = trig[(i+_)%3];
                    v[_] = verts[j], g[_] = grads[j];
                }
                // plane normal and distance to the vertex
                vec2 n = v[1] - v[0]; n = vec2(-n.y, n.x);
                float d = dot(n, v[2] - v[0]);
                if (!(d > 0.0)) printf("error: d = %f\n", d);
                // how far you need to go to make it negative
                float d3 = fmax(-dot(n, g[2]), 0.0f);
                float k[3] = { 1, 1, 1 };
                for (int _ = 0; _ < 2; _++) {
                    float d_ = fmax(dot(n, g[_]), 0.0f);
                    float ds = fmax(d_ + d3, 0.0f);
                    if (ds == 0.0) continue;
                    k[_] = fmin(k[_], d / ds);
                }
                k[2] = fmin(k[0], k[1]);
                for (int _ = 0; _ < 3; _++)
                    mf[(i+_)%3] = fmin(mf[(i+_)%3], k[_]);
            }
            for (int _ = 0; _ < 3; _++)
                maxFactor[trig[_]] = fmin(maxFactor[trig[_]],
                    mf[_] > 0.0f ? mf[_] : 1.0f);
            // prevent going crazy
            float sl = sqrt(abs(determinant(mat2(v[1] - v[0], v[2] - v[0])) / 2.0f));
            for (int _ = 0; _ < 3; _++)
                maxMovement[trig[_]] = fmax(maxMovement[trig[_]], sl);
        }

        // displacements
        for (int i = 0; i < vn; i++) {
            vec2 g = 0.5f * maxFactor[i] * grads[i];
            float gl = length(g);
            if (gl != 0.0f) {
                float a = maxMovement[i];
                g *= a * tanh(gl / a) / gl;
                if (std::isnan(g.x)) {
                    // printf("warning: nan displacement %d %f %f %f\n", i, a, gl, maxFactor[i]);
                    continue;
                }
            }
            grads[i] = g;
        }

        // expect this to drop to 0.1x after 20 iterations
        // if not, adjust step size
        float meanDisp = 0.0;
        int nanCount = 0;
        for (int i = 0; i < vn; i++) {
            float disp = length(grads[i]) / vn;
            if (std::isfinite(disp))
                meanDisp += disp;
            else nanCount++;
        }
        if (nanCount == 0)
            printf("%.3g\n", meanDisp);
        else
            printf("%.3g (%d nan)\n", meanDisp, nanCount);

        // reduce displacement if negative area occurs
        std::vector<bool> reduce(vn, true);
        for (int iter = 0; iter < 4; iter++) {
            // update vertex position
            const float r = 0.8;
            float k = (iter == 0 ? 1.0f : (r - 1.0f) * pow(r, iter - 1.0f));
            for (int i = 0; i < vn; i++) if (reduce[i]) {
                vec2 dv = k * grads[i];
                if (std::isfinite(dot(dv, dv)))
                    verts[i] += dv;
            }
            // check if negative area occurs
            reduce = std::vector<bool>(vn, false);
            bool found = false;
            for (ivec3 trig : trigs) {
                vec2 v[3] = {
                    verts[trig[0]], verts[trig[1]], verts[trig[2]]
                };
                if (determinant(mat2(v[1] - v[0], v[2] - v[0])) < 0.0) {
                    reduce[trig[0]] = reduce[trig[1]] =
                        reduce[trig[2]] = reduce[trig[3]] = true;
                    found = true;
                    printf("%d\n", iter);
                }
            }
            if (!found) break;
        }

    }

}

#endif

MESHGEN_TET_IMPLICIT_NS_END
