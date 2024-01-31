// solve the FEM problem

#pragma once

#include <vector>
#include <unordered_map>
#include <set>
#include <unordered_set>

#include "../include/elements.h"
#include "../include/sparse.h"



// PRNG
#ifndef PI
#define PI 3.1415926535897932384626
#endif
unsigned int _IDUM = 1;
unsigned randu() { return _IDUM = _IDUM * 1664525u + 1013904223u; }
float randf() { return randu() * (1. / 4294967296.); }
float randn() { return sqrt(-2.0 * log(1.0 - randf())) * cos(2.0 * PI * randf()); }




template<typename Tf, typename Tu>
struct DiscretizedModel {
    int N;  // number of vertices
    int M;  // number of elements
    std::vector<vec2> X;  // vertices, N
    std::vector<ivec3> SE;  // elements, M
    std::vector<int> boundary;  // indices of boundary vertices
    std::vector<bool> isBoundary;  // boundary vertex? N
    std::vector<Tf> F;  // inputs, N, valid for non boundary
    std::vector<Tu> U;  // solutions, N
    std::vector<vec2> gradU;  // gradient of solutions, valid for float Tu

    void startSolver() {
        N = (int)X.size();
        assert((int)F.size() == N);
        assert((int)U.size() == N);
        M = (int)SE.size();
        printf("%d vertices, %d elements.\n", N, M);
        isBoundary.resize(N, false);
        for (int i : boundary) {
            assert(i >= 0 && i < (int)N);
            isBoundary[i] = true;
        }
    }

    void constructCotangentMatrix(LilMatrix &lil, std::vector<float> &masses, const int* Imap);

    // solvers
    void solveLaplacian();

};

template<>
void DiscretizedModel<float, float>::constructCotangentMatrix(
    LilMatrix &lil, std::vector<float> &masses, const int* Imap
) {
    int N = lil.getN();
    masses = std::vector<float>(N, 0.0);
    for (ivec3 t : SE) {
        float dA = determinant(mat2(
            X[t[1]] - X[t[0]], X[t[2]] - X[t[0]]
        )) / 6.0f;
        for (int i = 0; i < 3; i++)
            if (Imap[t[i]] != -1)
                masses[Imap[t[i]]] += dA;
    }
    for (const ivec3 t : SE) {
        for (int i = 0; i < 3; i++) {
            const int v[3] = {
                t[i], t[(i + 1) % 3], t[(i + 2) % 3]
            };
            vec2 a = X[v[1]] - X[v[0]];
            vec2 b = X[v[2]] - X[v[0]];
            vec2 c = X[v[2]] - X[v[1]];
            float cos = dot(a, b) / fmax(sqrt(dot(a, a) * dot(b, b)), 1e-12f);
            cos = clamp(cos, -0.9999f, 0.9999f);
            float w = 0.5f * cos / sqrt(1.0f - cos * cos);
            lil.addValue(Imap[v[1]], Imap[v[1]], w);
            lil.addValue(Imap[v[1]], Imap[v[2]], -w);
            lil.addValue(Imap[v[2]], Imap[v[1]], -w);
            lil.addValue(Imap[v[2]], Imap[v[2]], w);
        }
    }
}




template<>
void DiscretizedModel<float, float>::solveLaplacian() {
    float time0 = getTimePast();
    startSolver();
    // return;

    // map vertex indices to indices in the linear system
    // (don't consider fixed vertices)
    int* Imap = new int[N];
    for (int i = 0; i < N; i++) Imap[i] = 0;
    for (int i : boundary) Imap[i] = -1;
    int Ns = 0;
    for (int i = 0; i < N; i++) {
        if (Imap[i] != -1) Imap[i] = Ns++;
    }

    // construct the matrix
    LilMatrix lil(Ns);
    std::vector<float> masses(Ns, 1.0f);
    constructCotangentMatrix(lil, masses, Imap);

    // construct the vectors
    float* f = new float[Ns];
    for (int i = 0; i < N; i++)
        if (Imap[i] != -1)
            f[Imap[i]] = masses[Imap[i]] * F[i];
    float* u = new float[Ns];
    for (int i = 0; i < Ns; i++)
        u[i] = 1e-4f * randn();

    // solve the linear system
    CsrMatrix csr(lil);
    auto linopr = [&](const float* src, float* res) {
        csr.matvecmul(src, res);
    };
    float time1 = getTimePast();
    printf("Linear system constructed in %.2g secs. (%dx%d, %d nonzeros)\n",
        time1 - time0, Ns, Ns, csr.getNonzeros());
    // tolerance
    float tol = 1e-4f;
    int miniter = 10, maxiter = 1000;
#define PRECOND 1  // 1: diag; 2: cholesky; 3: ssor
#if !PRECOND
    float time2 = time1;
    int niters = conjugateGradient(
        Ns, linopr, (float*)f, (float*)u, miniter, maxiter, tol);
#else  // !PRECOND
#if PRECOND == 1
    // block diagonal preconditioning
    std::vector<float> invDiag(Ns, 0.0);
    for (int i = 0; i < Ns; i++) {
        float x = lil.at(i, i, 1.0);
        invDiag[i] = x == 0.0f ? 1.0f : 1.0f / x;
    }
    auto precond = [&](const float* src, float* res) {
        for (int i = 0; i < Ns; i++)
            res[i] = invDiag[i] * src[i];
    };
#elif PRECOND == 2
    // incomplete Cholesky decomposition
    LilMatrix iclil = lil.incompleteCholesky1();
    CsrMatrix precondL(iclil), precondU(iclil.transpose());
    auto precond = [&](const float* src, float* res) {
        memcpy(res, src, sizeof(float) * Ns);
        precondL.lowerSolve(res);
        precondU.upperSolve(res);
    };
#elif PRECOND == 3
    // SSoR preconditioning
    std::vector<float> diag(Ns, 0.0);
    for (int i = 0; i < Ns; i++)
        diag[i] = lil.at(i, i, 1.0);
    CsrMatrix precondL(lil, CsrMatrix::FROM_LIL_LOWER);
    CsrMatrix precondU(lil, CsrMatrix::FROM_LIL_UPPER);
    auto precond = [&](const float* src, float* res) {
        memcpy(res, src, sizeof(float) * Ns);
        precondL.lowerSolve(res);
        for (int i = 0; i < Ns; i++) res[i] *= diag[i];
        precondU.upperSolve(res);
    };
#endif  // preconditioner
    float time2 = getTimePast();
    printf("Linear system preconditioned in %.2g secs.\n", time2 - time1);
    int niters = conjugateGradientPreconditioned(
        Ns, linopr, precond, (float*)f, (float*)u, miniter, maxiter, tol);
#endif  // !PRECOND
    printf("%d iterations.\n", niters);
    float time3 = getTimePast();
    printf("Linear system solved in %.2g secs. (includes preconditioning)\n", time3 - time1);

    // get the result
    for (int i = 0; i < N; i++)
        U[i] = Imap[i] == -1 ? 0.0 : u[Imap[i]];
    delete[] Imap; delete[] f; delete[] u;
}


DiscretizedModel<float, float> solveLaplacianLinearTrig(
    std::vector<vec2> X_,  // N
    std::vector<float> L_,  // N
    std::vector<ivec3> E_  // M
) {
    DiscretizedModel<float, float> structure;
    structure.X = X_;
    structure.F = L_;
    structure.U = std::vector<float>(X_.size(), 0.0f);
    structure.boundary.clear();

    std::map<uint64_t, int> edges;
    for (ivec3 t : E_) {
        for (int _ = 0; _ < 3; _++) {
            uint64_t i = t[_], j = t[(_+1)%3];
            if (i > j) std::swap(j, i);
            edges[(i<<32)|j] += 1;
        }
    }
    std::vector<bool> isBoundary = std::vector<bool>(X_.size(), false);
    for (std::pair<uint64_t, int> ec : edges) {
        if (ec.second != 1) continue;
        uint64_t e = ec.first;
        int i = (int)(e >> 32), j = (int)e;
        isBoundary[i] = isBoundary[j] = true;
    }
    for (int i = 0; i < (int)isBoundary.size(); i++)
        if (isBoundary[i]) structure.boundary.push_back(i);

    structure.SE = E_;
    structure.solveLaplacian();

    return structure;
}
