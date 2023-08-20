// miscellaneous mesh generation functions

#pragma once

#define MESHGEN_TET_IMPLICIT_USE_GL 1

#include <functional>
#include <map>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <cstdint>
#include <algorithm>
#include <initializer_list>
#include <bitset>
#include <memory.h>
#include "../include/elements.h"

#if MESHGEN_TET_IMPLICIT_USE_GL
#include "../include/gl.h"
#endif


#define MESHGEN_MISC_NS_START namespace MeshgenMisc {
#define MESHGEN_MISC_NS_END }

MESHGEN_MISC_NS_START


typedef std::function<float(float, float, float)> ScalarFieldF;
typedef std::function<void(size_t, const vec3*, float*)> ScalarFieldFBatch;


// for maps/sets

// normalize a triangle to be unique while reserving the orientation
ivec3 rotateIvec3(ivec3 v) {
    assert(v.x != v.y && v.x != v.z && v.y != v.z);
    int i = v.x < v.y && v.x < v.z ? 0 :
        v.y < v.x && v.y < v.z ? 1 : 2;
    return ivec3(v[i], v[(i + 1) % 3], v[(i + 2) % 3]);
}
// compare two triangles component wise
auto ivec3Cmp = [](ivec3 a, ivec3 b) {
    return a.z != b.z ? a.z < b.z :
        *((uint64_t*)&a.x) < *((uint64_t*)&b.x);
};


// disjoint set union
class DisjointSet {
    int N;
    int *parent;
    uint8_t *rank;
public:
    DisjointSet(int N) :N(N) {
        parent = new int[N];
        rank = new uint8_t[N];
        for (int i = 0; i < N; i++)
            parent[i] = -1, rank[i] = 0;
    }
    DisjointSet(const DisjointSet &that) {
        this->N = that.N;
        parent = new int[N];
        rank = new uint8_t[N];
        for (int i = 0; i < N; i++)
            parent[i] = that.parent[i],
            rank[i] = that.rank[i];
    }
    ~DisjointSet() {
        delete parent;
        delete rank;
    }

    // find representatitve
    int findRep(int i) {
        if (parent[i] == -1)
            return i;
        int ans = findRep(parent[i]);
        parent[i] = ans;
        return ans;
    }

    // set union, returns False if already merged
    bool unionSet(int i, int j) {
        int i_rep = findRep(i);
        int j_rep = findRep(j);
        if (i_rep == j_rep) return false;
        if (rank[i_rep] < rank[j_rep])
            parent[i_rep] = j_rep;
        else if (rank[i_rep] > rank[j_rep])
            parent[j_rep] = i_rep;
        else parent[j_rep] = i_rep, rank[i_rep]++;
        return true;
    }

    // map index to compressed index, returns size
    int getCompressedMap(std::vector<int> &res) {
        std::vector<int> uncompressed(N, -1);
        int count = 0;
        for (int i = 0; i < N; i++)
            if (findRep(i) == i)
                uncompressed[i] = count++;
        res.resize(N);
        for (int i = 0; i < N; i++) {
            int rep = findRep(i);
            res[i] = uncompressed[rep];
        }
        return count;
    }

};


// memory saver
template<typename T>
void freeVector(std::vector<T> &v) {
    v.clear();
    v.shrink_to_fit();
}


MESHGEN_MISC_NS_END
