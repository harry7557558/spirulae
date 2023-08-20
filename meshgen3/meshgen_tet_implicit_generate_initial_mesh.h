#pragma once

#include "meshgen_misc.h"
using namespace MeshgenMisc;


// fast and stable, doesn't work well for saddles
bool subdivCriterionSphere(
    vec3 h, float e,
    float v000, float v010, float v100, float v110,
    float v001, float v011, float v101, float v111, float vccc
) {
    // Basic idea:
    // - least squares fit to a sphere
    //   - a (x^2+y^2+z^2) + b x + c y + d z + f
    //   - [ccc 000 100 010 110 001 101 011 111]
    // - compare the radius of the sphere to grid size
    // MATLAB:
    // - syms x y z
    // - A = [0 0 0 0 1; x^2+y^2+z^2 -x -y -z 1; x^2+y^2+z^2 x -y -z 1; x^2+y^2+z^2 -x y -z 1; x^2+y^2+z^2 x y -z 1; x^2+y^2+z^2 -x -y z 1; x^2+y^2+z^2 x -y z 1; x^2+y^2+z^2 -x y z 1; x^2+y^2+z^2 x y z 1]
    // - G = (A'*A)\A'
    float a = (v000+v100+v010+v110+v001+v101+v011+v111 - 8.0f * vccc) / (8.0f * dot(h, h));
    if (a == 0.0f)
        return false;
    float b = (-v000+v100-v010+v110-v001+v101-v011+v111) / (8.0f * h.x * a);
    float c = (-v000-v100+v010+v110-v001-v101+v011+v111) / (8.0f * h.y * a);
    float d = (-v000-v100-v010-v110+v001+v101+v011+v111) / (8.0f * h.z * a);
    float f = vccc / a;
    float x0 = -0.5f * b;
    float y0 = -0.5f * c;
    float z0 = -0.5f * d;
    float r = sqrt(fmax(x0 * x0 + y0 * y0 + z0 * z0 - f, 0.0f));
    float s = cbrt(h.x * h.y * h.z);
    // return r < 10.0f * s;  // curvature
    return s * s > 0.5f * e * r;  // error
}

// works for saddle points, can be numerically unstable, not well tested
bool subdivCriterionPlanar(
    vec3 h, float e,
    float v000, float v010, float v100, float v110,
    float v001, float v011, float v101, float v111, float vccc
) {
    // Basic idea:
    // Find an orthonormal basis in R3 where one is in gradient direction
    // In the orthonormal basis, fit A x^2 + B xy + C y^2 + D x + E y + F - G z

    // orthonormal basis
    float g2 = (v000+v100+v010+v110+v001+v101+v011+v111 - 8.0f*vccc) / (8.0f*dot(h, h));
    float gx = (-v000+v100-v010+v110-v001+v101-v011+v111) / (8.0f*h.x);
    float gy = (-v000-v100+v010+v110-v001-v101+v011+v111) / (8.0f*h.y);
    float gz = (-v000-v100-v010-v110+v001+v101+v011+v111) / (8.0f*h.z);
    if (gx == 0.0f && gy == 0.0f && gz == 0.0f)
        return false;
    vec3 g = vec3(gx, gy, gz);
    if (g2*g2 < 1e-3f*dot(g, g))
        return false;
    vec3 n = normalize(g);
    vec3 u = abs(n.z) == 1.0f ? vec3(1, 0, 0) : normalize(cross(n, vec3(0, 0, 1)));
    vec3 v = cross(n, u);

    // change of basis
    vec3 ps[9] = {
        vec3(-1, -1, -1), vec3(-1, 1, -1), vec3(1, -1, -1), vec3(1, 1, -1),
        vec3(-1, -1, 1), vec3(-1, 1, 1), vec3(1, -1, 1), vec3(1, 1, 1),
        vec3(0, 0, 0)
    };
    float vs[9] = { v000, v010, v100, v110, v001, v011, v101, v111, vccc };
    for (int i = 0; i < 9; i++) {
        vec3 t = ps[i] * h;
        ps[i] = vec3(dot(t, u), dot(t, v), dot(t, n));
    }

    // linear least squares
    const int N = 7;
    float A[N][N], b[N];
    memset(&A[0][0], 0, N*N*sizeof(float));
    memset(&b[0], 0, N*sizeof(float));
    for (int k = 0; k < 9; k++) {
        vec3 p = ps[k];
        float c[N] = { p.x*p.x, p.x*p.y, p.y*p.y, p.x, p.y, 1.0f, p.z };
        for (int i = 0; i < N; i++)
            for (int j = 0; j < N; j++)
                A[i][j] += c[i] * c[j];
        for (int i = 0; i < N; i++)
            b[i] += c[i] * vs[k];
    }

    // gaussian elimination
    // to-do: cholesky
    for (int i = 0; i < N; i++) {
    	for (int j = 0; j < N; j++) if (j != i) {
    	    double m = A[j][i] / A[i][i];
    	    for (int k = i; k < N; k++)
    	        A[j][k] -= m * A[i][k];
    	    b[j] -= m * b[i];
    	}
        if (A[i][i] == 0.0f)
            return false;
    }
    for (int i = 0; i < N; i++)
        b[i] /= A[i][i];

    // criteria
    if (b[6] == 0.0)
        return false;
    for (int i = 0; i < N-1; i++)
        b[i] /= b[6];
    float d = sqrt((b[0]-b[2])*(b[0]-b[2])+b[1]*b[1]);
    // float l = fmax(fabs(b[0]+b[2]-d), fabs(b[0]+b[2]+d));
    float l = hypot(b[0]+b[2]-d, b[0]+b[2]+d) / sqrt(2.0f);
    // printf("%f %f %f %f %f %f  %f\n", b[0], b[1], b[2], b[3], b[4], b[5], b[6]);
    // printf("%f %f %f\n", l, length(vec3(gx, gy, gz)), g2);
    float s = cbrt(h.x * h.y * h.z);
    return s * s * l > 3.0f * e;
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
    auto getIdx3 = [&](ivec3 i) {
        return (((i.x << 10) | i.y) << 10) | i.z;
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
    auto getIdxV = [&](int i, int j, int k) -> int {
        auto p = vmap.find(getIdx(i, j, k));
        if (p == vmap.end()) return -1;
        return p->second;
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
        std::vector<vec3> ps(reqValIdx.size());
        for (int i = 0; i < (int)reqValIdx.size(); i++) {
            int idx = reqValIdx[i];
            vmap[idx] = (int)vals.size() + i;
            ps[i] = idxToPos(idx);
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
        assert(determinant(mat3(
            idxToPos(t2)-idxToPos(t1),
            idxToPos(t3)-idxToPos(t1),
            idxToPos(t4)-idxToPos(t1)
        )) > 0.0);
        // tets.push_back(ivec4(t1, t2, t3, t4));
        ivec2 p = calcTet(t1, t2, t3, t4);
        if (testTet(p))
            tets.push_back(ivec4(t1, t2, t3, t4));
    };
    std::unordered_map<int, std::vector<ivec3>> cubesToAdd;
    auto addCube = [&](int i, int j, int k, int step) {
        cubesToAdd[step].push_back(ivec3(i, j, k));
    };

    float time0 = getTimePast();

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
            if (((int)(v000 >= 0.0) + (int)(v010 >= 0.0) +
                 (int)(v100 >= 0.0) + (int)(v110 >= 0.0) +
                 (int)(v001 >= 0.0) + (int)(v011 >= 0.0) +
                 (int)(v101 >= 0.0) + (int)(v111 >= 0.0) +
                 (int)(vccc >= 0.0)) % 9 == 0)
                continue;
            if (((int)std::isfinite(v000) + (int)std::isfinite(v010) +
                 (int)std::isfinite(v100) + (int)std::isfinite(v110) +
                 (int)std::isfinite(v001) + (int)std::isfinite(v011) +
                 (int)std::isfinite(v101) + (int)std::isfinite(v111) +
                 8 * (int)std::isfinite(vccc)) <= 4)
                continue;
        #if 1
            vec3 h = 0.5f * (b1 - b0) / vec3(bnd) * (float)step;
            float e = cbrt((b1.x-b0.x) * (b1.y-b0.y) * (b1.z-b0.z) / (bnd.x*bnd.y*bnd.z));
            if (subdivCriterionSphere(h, e,
                v000, v010, v100, v110, v001, v011, v101, v111, vccc))
                toDiv0[i] = true;
            else if (subdivCriterionPlanar(h, e,
                v000, v010, v100, v110, v001, v011, v101, v111, vccc))
                toDiv0[i] = true;
        #else
            toDiv0[i] = true;
        #endif
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
                            if (u * u  + v * v + w * w <= 3) {
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
                        int gi = abs(u) + abs(v) + abs(w);
                        if (gi == 1 || gi == 2) {
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

    float time1 = getTimePast();

    // add cubes
    for (int s = 2; s <= 1 << nd; s <<= 1) {
        int h = s / 2;
        const static ivec3 DIRS[6] = {
            { 1, 0, 0 }, { 0, 1, 0 }, { 0, 0, 1 },
            { -1, 0, 0 }, { 0, -1, 0 }, { 0, 0, -1 }
        };
        const static ivec3 US[6] = {
            { 0, 1, 0 }, { -1, 0, 0 }, { 1, 0, 0 },
            { 0, 0, -1 }, { 0, 0, -1 }, { 0, -1, 0 }
        };
        const static ivec3 VS[6] = {
            { 0, 0, 1 }, { 0, 0, 1 }, { 0, 1, 0 },
            { 0, -1, 0 }, { 1, 0, 0 }, { -1, 0, 0 }
        };
        const static ivec3 SFW[15] = {
            { 0, 0, 0 },
            { 2, -2, -2 }, { 2, 2, -2 }, { 2, 2, 2 }, { 2, -2, 2 },
            { 2, -2, 0 }, { 2, 0, -2 }, { 2, 2, 0 }, { 2, 0, 2 },
            { 2, 0, 0 },
            { 3, -1, -1 }, { 3, 1, -1 }, { 3, 1, 1 }, { 3, -1, 1 },
            { 4, 0, 0 }
        };
        const static ivec4 TETS[] = {
            { 0, 5, 9, 4 }, { 0, 4, 9, 8 }, { 0, 8, 9, 3 }, { 0, 3, 9, 7 },
            { 0, 7, 9, 2 }, { 0, 2, 9, 6 }, { 0, 6, 9, 1 }, { 0, 1, 9, 5 },
            { 5, 9, 4, 13 }, { 4, 9, 8, 13 }, { 8, 9, 3, 12 }, { 3, 9, 7, 12 },
            { 7, 9, 2, 11 }, { 2, 9, 6, 11 }, { 6, 9, 1, 10 }, { 1, 9, 5, 10 },
            // { 5, 9, 13, 10 }, { 8, 9, 12, 13 }, { 7, 9, 11, 12 }, { 6, 9, 10, 11 },
            // { 9, 14, 12, 13 }, { 9, 14, 11, 12 }, { 9, 14, 10, 11 }, { 9, 14, 13, 10 }
        };
        const int WU[8] = { -1, 1, 1, -1, 0, 1, 0, -1 };
        const int WV[8] = { -1, -1, 1, 1, -1, 0, 1, 0 };
        const static int LUTF[16][2][18] = {
            { { 0, 1, 2, 0, 2, 3, -1 },
                { 1, 2, 3, 1, 3, 0, -1 } },
            { { 0, 4, 3, 3, 4, 2, 2, 4, 1, -1 },
                { 0, 4, 3, 3, 4, 2, 2, 4, 1, -1 } },
            { { 0, 1, 5, 0, 5, 3, 3, 5, 2, -1 },
                { 0, 1, 5, 0, 5, 3, 3, 5, 2, -1 } },
            { { 3, 0, 4, 3, 4, 5, 3, 5, 2, 4, 1, 5, -1 },
                { 3, 0, 4, 3, 4, 5, 3, 5, 2, 4, 1, 5, -1 } },
            { { 6, 3, 0, 6, 0, 1, 6, 1, 2, -1 },
                { 6, 3, 0, 6, 0, 1, 6, 1, 2, -1 } },
            { { 0, 6, 3, 6, 0, 4, 4, 2, 6, 2, 4, 1, -1 },
                { 0, 4, 3, 3, 4, 6, 6, 4, 1, 1, 2, 6, -1 } },
            { { 0, 1, 5, 0, 5, 6, 0, 6, 3, 6, 5, 2, -1 },
                { 0, 1, 5, 0, 5, 6, 0, 6, 3, 6, 5, 2, -1 } },
            { { 0, 6, 3, 0, 4, 6, 4, 1, 5, 4, 5, 6, 6, 5, 2, -1 },
                { 0, 4, 3, 3, 4, 6, 4, 1, 5, 4, 5, 6, 6, 5, 2, -1 } },
            { { 0, 1, 7, 7, 1, 2, 7, 2, 3, -1 },
                { 0, 1, 7, 7, 1, 2, 7, 2, 3, -1 } },
            { { 0, 4, 7, 2, 3, 7, 2, 7, 4, 2, 4, 1, -1 },
                { 0, 4, 7, 2, 3, 7, 2, 7, 4, 2, 4, 1, -1 } },
            { { 0, 1, 5, 0, 5, 7, 7, 5, 2, 7, 2, 3, -1 },
                { 0, 1, 7, 7, 1, 5, 7, 5, 3, 3, 5, 2, -1 } },
            { { 0, 4, 7, 7, 4, 5, 5, 4, 1, 7, 5, 2, 7, 2, 3, -1 },
                { 0, 4, 7, 7, 4, 5, 5, 4, 1, 7, 5, 3, 3, 5, 2, -1 } },
            { { 0, 1, 7, 7, 1, 6, 6, 1, 2, 3, 7, 6, -1 },
                { 0, 1, 7, 7, 1, 6, 6, 1, 2, 3, 7, 6, -1 } },
            { { 0, 4, 7, 7, 4, 6, 7, 6, 3, 4, 2, 6, 4, 1, 2, -1 },
                { 0, 4, 7, 7, 4, 6, 7, 6, 3, 4, 1, 6, 6, 1, 2, -1 } },
            { { 0, 1, 5, 0, 5, 7, 3, 7, 6, 6, 7, 5, 6, 5, 2, -1 },
                { 0, 1, 7, 7, 1, 5, 3, 7, 6, 6, 7, 5, 6, 5, 2, -1 } },
            { { 0, 4, 7, 3, 7, 6, 2, 6, 5, 1, 5, 4, 4, 6, 7, 4, 5, 6 },
                { 0, 4, 7, 3, 7, 6, 2, 6, 5, 1, 5, 4, 7, 4, 5, 7, 5, 6 } }
        };
        for (ivec3 cb : cubesToAdd[s]) {
            int i0 = cb.x, i1 = i0 + h, i2 = i0 + s;
            int j0 = cb.y, j1 = j0 + h, j2 = j0 + s;
            int k0 = cb.z, k1 = k0 + h, k2 = k0 + s;
            ivec3 ic = { i1, j1, k1 };
            int idxc = getIdx3(ic);
            // subdivided?
            bool subdivided[6];
            for (int i = 0; i < 6; i++) {
                int idx1 = getIdx3(ic+h*DIRS[i]);
                subdivided[i] = (vmap.find(idx1) != vmap.end());
            }
            // non subdivide faces
            for (int d = 0; d < 3; d++) {
                if (subdivided[d])
                    continue;
                int idx1 = getIdx3(ic+s*DIRS[d]);
                if (vmap.find(idx1) != vmap.end()) {
                    int idxs[8];
                    for (int _ = 0; _ < 8; _++) {
                        idxs[_] = getIdx3(ic+h*(DIRS[d]+WU[_]*US[d]+WV[_]*VS[d]));
                    }
                    for (int _ = 0; _ < 4; _++) {
                        if (vmap.find(idxs[_+4]) != vmap.end()) {
                            addTet(idxc, idx1, idxs[_], idxs[_+4]);
                            addTet(idxc, idx1, idxs[_+4], idxs[(_+1)%4]);
                        }
                        else addTet(idxc, idx1, idxs[_], idxs[(_+1)%4]);
                    }
                }
            }
            // subdivide faces
            for (int d = 0; d < 6; d++) {
                if (!subdivided[d])
                    continue;
                int q = h / 2;
                int idxs[15];
                for (int i = 0; i < 15; i++)
                    idxs[i] = getIdx3(ic+q*(
                        DIRS[d]*SFW[i][0]+US[d]*SFW[i][1]+VS[d]*SFW[i][2]));
                for (int i = 0; i < 16; i++)
                    addTet(idxs[TETS[i][0]], idxs[TETS[i][1]],
                        idxs[TETS[i][2]], idxs[TETS[i][3]]);
            }
            // boundary
            for (int d = 0; d < 6; d++) {
                ivec3 ib = ic + h * DIRS[d];
                int idxb = getIdx3(ib);
                if (!((d%3 == 0 && isConstrainedX(idxb)) ||
                      (d%3 == 1 && isConstrainedY(idxb)) ||
                      (d%3 == 2 && isConstrainedZ(idxb))
                    )) continue;
                int idxs[8];
                for (int _ = 0; _ < 8; _++) {
                    idxs[_] = getIdx3(ic+h*(DIRS[d]+WU[_]*US[d]+WV[_]*VS[d]));
                }
                int casei = 0;
                for (int _ = 0; _ < 4; _++)
                    casei |= int(vmap.find(idxs[_+4]) != vmap.end()) << _;
                const int *lut = LUTF[casei][((ib[0]+ib[1]+ib[2]-ib[d%3])/s)&1];
                for (int i = 0; i < 18; i += 3) {
                    if (lut[i] == -1) break;
                    addTet(idxc, idxs[lut[i]], idxs[lut[i+1]], idxs[lut[i+2]]);
                }
            }
        }
        // break;
    }

    float time2 = getTimePast();

    // remove unused vertices
    std::vector<int> vpsa(vmap.size(), 0);
    for (int i = 0; i < (int)tets.size(); i++) {
        for (int _ = 0; _ < 4; _++)
            vpsa[tets[i][_] = vmap[tets[i][_]]] = 1;
    }
    vertices.clear();
    for (int i = 0; i < (int)vpsa.size(); i++) {
        if (vpsa[i]) {
            vpsa[i] = (int)vertices.size();
            vertices.push_back(vec3());
        }
        else vpsa[i] = -1;
    }
    isConstrained[0] = isConstrained[1] = isConstrained[2] =
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
            tets[i][_] = vpsa[tets[i][_]];
            assert(tets[i][_] >= 0);
        }
    }

    float time3 = getTimePast();
    printf("generateInitialMesh: %.2g + %.2g + %.2g = %.2g secs\n",
        time1-time0, time2-time1, time3-time2, time3-time0);
}
