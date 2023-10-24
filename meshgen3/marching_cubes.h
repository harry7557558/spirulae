#pragma once

#include "meshgen_misc.h"
using namespace MeshgenMisc;


// lookup tables for reconstruction
// http://paulbourke.net/geometry/polygonise/
const int MC_EDGE_TABLE[256] = {
    0x0  , 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c, 0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
    0x190, 0x99 , 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c, 0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
    0x230, 0x339, 0x33 , 0x13a, 0x636, 0x73f, 0x435, 0x53c, 0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
    0x3a0, 0x2a9, 0x1a3, 0xaa , 0x7a6, 0x6af, 0x5a5, 0x4ac, 0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
    0x460, 0x569, 0x663, 0x76a, 0x66 , 0x16f, 0x265, 0x36c, 0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
    0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff , 0x3f5, 0x2fc, 0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
    0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55 , 0x15c, 0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
    0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc , 0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
    0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc, 0xcc , 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
    0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c, 0x15c, 0x55 , 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
    0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc, 0x2fc, 0x3f5, 0xff , 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
    0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c, 0x36c, 0x265, 0x16f, 0x66 , 0x76a, 0x663, 0x569, 0x460,
    0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac, 0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa , 0x1a3, 0x2a9, 0x3a0,
    0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c, 0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33 , 0x339, 0x230,
    0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c, 0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99 , 0x190,
    0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c, 0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0
};
const int MC_TRIG_TABLE[256][16] = {
    {-1}, {0,8,3,-1}, {0,1,9,-1}, {1,8,3,9,8,1,-1}, {1,2,10,-1}, {0,8,3,1,2,10,-1}, {9,2,10,0,2,9,-1}, {2,8,3,2,10,8,10,9,8,-1}, {3,11,2,-1}, {0,11,2,8,11,0,-1}, {1,9,0,2,3,11,-1}, {1,11,2,1,9,11,9,8,11,-1}, {3,10,1,11,10,3,-1}, {0,10,1,0,8,10,8,11,10,-1}, {3,9,0,3,11,9,11,10,9,-1}, {9,8,10,10,8,11,-1},
    {4,7,8,-1}, {4,3,0,7,3,4,-1}, {0,1,9,8,4,7,-1}, {4,1,9,4,7,1,7,3,1,-1}, {1,2,10,8,4,7,-1}, {3,4,7,3,0,4,1,2,10,-1}, {9,2,10,9,0,2,8,4,7,-1}, {2,10,9,2,9,7,2,7,3,7,9,4,-1}, {8,4,7,3,11,2,-1}, {11,4,7,11,2,4,2,0,4,-1}, {9,0,1,8,4,7,2,3,11,-1}, {4,7,11,9,4,11,9,11,2,9,2,1,-1}, {3,10,1,3,11,10,7,8,4,-1}, {1,11,10,1,4,11,1,0,4,7,11,4,-1}, {4,7,8,9,0,11,9,11,10,11,0,3,-1}, {4,7,11,4,11,9,9,11,10,-1},
    {9,5,4,-1}, {9,5,4,0,8,3,-1}, {0,5,4,1,5,0,-1}, {8,5,4,8,3,5,3,1,5,-1}, {1,2,10,9,5,4,-1}, {3,0,8,1,2,10,4,9,5,-1}, {5,2,10,5,4,2,4,0,2,-1}, {2,10,5,3,2,5,3,5,4,3,4,8,-1}, {9,5,4,2,3,11,-1}, {0,11,2,0,8,11,4,9,5,-1}, {0,5,4,0,1,5,2,3,11,-1}, {2,1,5,2,5,8,2,8,11,4,8,5,-1}, {10,3,11,10,1,3,9,5,4,-1}, {4,9,5,0,8,1,8,10,1,8,11,10,-1}, {5,4,0,5,0,11,5,11,10,11,0,3,-1}, {5,4,8,5,8,10,10,8,11,-1},
    {9,7,8,5,7,9,-1}, {9,3,0,9,5,3,5,7,3,-1}, {0,7,8,0,1,7,1,5,7,-1}, {1,5,3,3,5,7,-1}, {9,7,8,9,5,7,10,1,2,-1}, {10,1,2,9,5,0,5,3,0,5,7,3,-1}, {8,0,2,8,2,5,8,5,7,10,5,2,-1}, {2,10,5,2,5,3,3,5,7,-1}, {7,9,5,7,8,9,3,11,2,-1}, {9,5,7,9,7,2,9,2,0,2,7,11,-1}, {2,3,11,0,1,8,1,7,8,1,5,7,-1}, {11,2,1,11,1,7,7,1,5,-1}, {9,5,8,8,5,7,10,1,3,10,3,11,-1}, {5,7,0,5,0,9,7,11,0,1,0,10,11,10,0,-1}, {11,10,0,11,0,3,10,5,0,8,0,7,5,7,0,-1}, {11,10,5,7,11,5,-1},
    {10,6,5,-1}, {0,8,3,5,10,6,-1}, {9,0,1,5,10,6,-1}, {1,8,3,1,9,8,5,10,6,-1}, {1,6,5,2,6,1,-1}, {1,6,5,1,2,6,3,0,8,-1}, {9,6,5,9,0,6,0,2,6,-1}, {5,9,8,5,8,2,5,2,6,3,2,8,-1}, {2,3,11,10,6,5,-1}, {11,0,8,11,2,0,10,6,5,-1}, {0,1,9,2,3,11,5,10,6,-1}, {5,10,6,1,9,2,9,11,2,9,8,11,-1}, {6,3,11,6,5,3,5,1,3,-1}, {0,8,11,0,11,5,0,5,1,5,11,6,-1}, {3,11,6,0,3,6,0,6,5,0,5,9,-1}, {6,5,9,6,9,11,11,9,8,-1},
    {5,10,6,4,7,8,-1}, {4,3,0,4,7,3,6,5,10,-1}, {1,9,0,5,10,6,8,4,7,-1}, {10,6,5,1,9,7,1,7,3,7,9,4,-1}, {6,1,2,6,5,1,4,7,8,-1}, {1,2,5,5,2,6,3,0,4,3,4,7,-1}, {8,4,7,9,0,5,0,6,5,0,2,6,-1}, {7,3,9,7,9,4,3,2,9,5,9,6,2,6,9,-1}, {3,11,2,7,8,4,10,6,5,-1}, {5,10,6,4,7,2,4,2,0,2,7,11,-1}, {0,1,9,4,7,8,2,3,11,5,10,6,-1}, {9,2,1,9,11,2,9,4,11,7,11,4,5,10,6,-1}, {8,4,7,3,11,5,3,5,1,5,11,6,-1}, {5,1,11,5,11,6,1,0,11,7,11,4,0,4,11,-1}, {0,5,9,0,6,5,0,3,6,11,6,3,8,4,7,-1}, {6,5,9,6,9,11,4,7,9,7,11,9,-1},
    {10,4,9,6,4,10,-1}, {4,10,6,4,9,10,0,8,3,-1}, {10,0,1,10,6,0,6,4,0,-1}, {8,3,1,8,1,6,8,6,4,6,1,10,-1}, {1,4,9,1,2,4,2,6,4,-1}, {3,0,8,1,2,9,2,4,9,2,6,4,-1}, {0,2,4,4,2,6,-1}, {8,3,2,8,2,4,4,2,6,-1}, {10,4,9,10,6,4,11,2,3,-1}, {0,8,2,2,8,11,4,9,10,4,10,6,-1}, {3,11,2,0,1,6,0,6,4,6,1,10,-1}, {6,4,1,6,1,10,4,8,1,2,1,11,8,11,1,-1}, {9,6,4,9,3,6,9,1,3,11,6,3,-1}, {8,11,1,8,1,0,11,6,1,9,1,4,6,4,1,-1}, {3,11,6,3,6,0,0,6,4,-1}, {6,4,8,11,6,8,-1},
    {7,10,6,7,8,10,8,9,10,-1}, {0,7,3,0,10,7,0,9,10,6,7,10,-1}, {10,6,7,1,10,7,1,7,8,1,8,0,-1}, {10,6,7,10,7,1,1,7,3,-1}, {1,2,6,1,6,8,1,8,9,8,6,7,-1}, {2,6,9,2,9,1,6,7,9,0,9,3,7,3,9,-1}, {7,8,0,7,0,6,6,0,2,-1}, {7,3,2,6,7,2,-1}, {2,3,11,10,6,8,10,8,9,8,6,7,-1}, {2,0,7,2,7,11,0,9,7,6,7,10,9,10,7,-1}, {1,8,0,1,7,8,1,10,7,6,7,10,2,3,11,-1}, {11,2,1,11,1,7,10,6,1,6,7,1,-1}, {8,9,6,8,6,7,9,1,6,11,6,3,1,3,6,-1}, {0,9,1,11,6,7,-1}, {7,8,0,7,0,6,3,11,0,11,6,0,-1}, {7,11,6,-1},
    {7,6,11,-1}, {3,0,8,11,7,6,-1}, {0,1,9,11,7,6,-1}, {8,1,9,8,3,1,11,7,6,-1}, {10,1,2,6,11,7,-1}, {1,2,10,3,0,8,6,11,7,-1}, {2,9,0,2,10,9,6,11,7,-1}, {6,11,7,2,10,3,10,8,3,10,9,8,-1}, {7,2,3,6,2,7,-1}, {7,0,8,7,6,0,6,2,0,-1}, {2,7,6,2,3,7,0,1,9,-1}, {1,6,2,1,8,6,1,9,8,8,7,6,-1}, {10,7,6,10,1,7,1,3,7,-1}, {10,7,6,1,7,10,1,8,7,1,0,8,-1}, {0,3,7,0,7,10,0,10,9,6,10,7,-1}, {7,6,10,7,10,8,8,10,9,-1},
    {6,8,4,11,8,6,-1}, {3,6,11,3,0,6,0,4,6,-1}, {8,6,11,8,4,6,9,0,1,-1}, {9,4,6,9,6,3,9,3,1,11,3,6,-1}, {6,8,4,6,11,8,2,10,1,-1}, {1,2,10,3,0,11,0,6,11,0,4,6,-1}, {4,11,8,4,6,11,0,2,9,2,10,9,-1}, {10,9,3,10,3,2,9,4,3,11,3,6,4,6,3,-1}, {8,2,3,8,4,2,4,6,2,-1}, {0,4,2,4,6,2,-1}, {1,9,0,2,3,4,2,4,6,4,3,8,-1}, {1,9,4,1,4,2,2,4,6,-1}, {8,1,3,8,6,1,8,4,6,6,10,1,-1}, {10,1,0,10,0,6,6,0,4,-1}, {4,6,3,4,3,8,6,10,3,0,3,9,10,9,3,-1}, {10,9,4,6,10,4,-1},
    {4,9,5,7,6,11,-1}, {0,8,3,4,9,5,11,7,6,-1}, {5,0,1,5,4,0,7,6,11,-1}, {11,7,6,8,3,4,3,5,4,3,1,5,-1}, {9,5,4,10,1,2,7,6,11,-1}, {6,11,7,1,2,10,0,8,3,4,9,5,-1}, {7,6,11,5,4,10,4,2,10,4,0,2,-1}, {3,4,8,3,5,4,3,2,5,10,5,2,11,7,6,-1}, {7,2,3,7,6,2,5,4,9,-1}, {9,5,4,0,8,6,0,6,2,6,8,7,-1}, {3,6,2,3,7,6,1,5,0,5,4,0,-1}, {6,2,8,6,8,7,2,1,8,4,8,5,1,5,8,-1}, {9,5,4,10,1,6,1,7,6,1,3,7,-1}, {1,6,10,1,7,6,1,0,7,8,7,0,9,5,4,-1}, {4,0,10,4,10,5,0,3,10,6,10,7,3,7,10,-1}, {7,6,10,7,10,8,5,4,10,4,8,10,-1},
    {6,9,5,6,11,9,11,8,9,-1}, {3,6,11,0,6,3,0,5,6,0,9,5,-1}, {0,11,8,0,5,11,0,1,5,5,6,11,-1}, {6,11,3,6,3,5,5,3,1,-1}, {1,2,10,9,5,11,9,11,8,11,5,6,-1}, {0,11,3,0,6,11,0,9,6,5,6,9,1,2,10,-1}, {11,8,5,11,5,6,8,0,5,10,5,2,0,2,5,-1}, {6,11,3,6,3,5,2,10,3,10,5,3,-1}, {5,8,9,5,2,8,5,6,2,3,8,2,-1}, {9,5,6,9,6,0,0,6,2,-1}, {1,5,8,1,8,0,5,6,8,3,8,2,6,2,8,-1}, {1,5,6,2,1,6,-1}, {1,3,6,1,6,10,3,8,6,5,6,9,8,9,6,-1}, {10,1,0,10,0,6,9,5,0,5,6,0,-1}, {0,3,8,5,6,10,-1}, {10,5,6,-1},
    {11,5,10,7,5,11,-1}, {11,5,10,11,7,5,8,3,0,-1}, {5,11,7,5,10,11,1,9,0,-1}, {10,7,5,10,11,7,9,8,1,8,3,1,-1}, {11,1,2,11,7,1,7,5,1,-1}, {0,8,3,1,2,7,1,7,5,7,2,11,-1}, {9,7,5,9,2,7,9,0,2,2,11,7,-1}, {7,5,2,7,2,11,5,9,2,3,2,8,9,8,2,-1}, {2,5,10,2,3,5,3,7,5,-1}, {8,2,0,8,5,2,8,7,5,10,2,5,-1}, {9,0,1,5,10,3,5,3,7,3,10,2,-1}, {9,8,2,9,2,1,8,7,2,10,2,5,7,5,2,-1}, {1,3,5,3,7,5,-1}, {0,8,7,0,7,1,1,7,5,-1}, {9,0,3,9,3,5,5,3,7,-1}, {9,8,7,5,9,7,-1},
    {5,8,4,5,10,8,10,11,8,-1}, {5,0,4,5,11,0,5,10,11,11,3,0,-1}, {0,1,9,8,4,10,8,10,11,10,4,5,-1}, {10,11,4,10,4,5,11,3,4,9,4,1,3,1,4,-1}, {2,5,1,2,8,5,2,11,8,4,5,8,-1}, {0,4,11,0,11,3,4,5,11,2,11,1,5,1,11,-1}, {0,2,5,0,5,9,2,11,5,4,5,8,11,8,5,-1}, {9,4,5,2,11,3,-1}, {2,5,10,3,5,2,3,4,5,3,8,4,-1}, {5,10,2,5,2,4,4,2,0,-1}, {3,10,2,3,5,10,3,8,5,4,5,8,0,1,9,-1}, {5,10,2,5,2,4,1,9,2,9,4,2,-1}, {8,4,5,8,5,3,3,5,1,-1}, {0,4,5,1,0,5,-1}, {8,4,5,8,5,3,9,0,5,0,3,5,-1}, {9,4,5,-1},
    {4,11,7,4,9,11,9,10,11,-1}, {0,8,3,4,9,7,9,11,7,9,10,11,-1}, {1,10,11,1,11,4,1,4,0,7,4,11,-1}, {3,1,4,3,4,8,1,10,4,7,4,11,10,11,4,-1}, {4,11,7,9,11,4,9,2,11,9,1,2,-1}, {9,7,4,9,11,7,9,1,11,2,11,1,0,8,3,-1}, {11,7,4,11,4,2,2,4,0,-1}, {11,7,4,11,4,2,8,3,4,3,2,4,-1}, {2,9,10,2,7,9,2,3,7,7,4,9,-1}, {9,10,7,9,7,4,10,2,7,8,7,0,2,0,7,-1}, {3,7,10,3,10,2,7,4,10,1,10,0,4,0,10,-1}, {1,10,2,8,7,4,-1}, {4,9,1,4,1,7,7,1,3,-1}, {4,9,1,4,1,7,0,8,1,8,7,1,-1}, {4,0,3,7,4,3,-1}, {4,8,7,-1},
    {9,10,8,10,11,8,-1}, {3,0,9,3,9,11,11,9,10,-1}, {0,1,10,0,10,8,8,10,11,-1}, {3,1,10,11,3,10,-1}, {1,2,11,1,11,9,9,11,8,-1}, {3,0,9,3,9,11,1,2,9,2,11,9,-1}, {0,2,11,8,0,11,-1}, {3,2,11,-1}, {2,3,8,2,8,10,10,8,9,-1}, {9,10,2,0,9,2,-1}, {2,3,8,2,8,10,0,1,8,1,10,8,-1}, {1,10,2,-1}, {1,3,8,9,1,8,-1}, {0,9,1,-1}, {0,3,8,-1}, {-1}
};
const ivec3 MC_VERTICE_LIST[8] = {
    ivec3(0,0,0), ivec3(0,1,0), ivec3(1,1,0), ivec3(1,0,0),
    ivec3(0,0,1), ivec3(0,1,1), ivec3(1,1,1), ivec3(1,0,1)
};
const ivec2 MC_EDGE_LIST[12] = {
    ivec2(0,1), ivec2(1,2), ivec2(2,3), ivec2(3,0),
    ivec2(4,5), ivec2(5,6), ivec2(6,7), ivec2(7,4),
    ivec2(0,4), ivec2(1,5), ivec2(2,6), ivec2(3,7)
};
const ivec4 MC_FACE_LIST[6] = {
    {0, 1, 5, 4}, {0, 3, 7, 4}, {0, 1, 2, 3},
    {2, 3, 7, 6}, {2, 1, 5, 6}, {4, 5, 6, 7}
};
const ivec3 MC_FACE_DIR[6] = {
    ivec3(-1,0,0), ivec3(0,-1,0), ivec3(0,0,-1),
    ivec3(1,0,0), ivec3(0,1,0), ivec3(0,0,1)
};


void marchingCubes(
    ScalarFieldFBatch Fs, vec3 b0, vec3 b1, ivec3 bn, int nd,
    std::vector<vec3> &vertices, std::vector<ivec3> &trigs,
    std::vector<bool> isConstrained[3]
) {
    float time0 = getTimePast();

    ivec3 bnd = bn << nd;
    auto getI = [&](int i, int j, int k) {
        return (k*bnd.y+j)*bnd.x+i;
    };
    vec3 noise = 1e-2f/vec3(bn-1)*exp2f(-nd);
    auto idxToPoint = [&](int idx) {
        int k = idx / (bnd.x*bnd.y);
        int j = (idx / bnd.x) % bnd.y;
        int i = idx % bnd.x;
        vec3 rnd = noise*vec3(cos(i+j), cos(2.0f*j-k), cos(4.0f*k+i));
        return b0+(b1-b0)*(vec3(i,j,k)+rnd)/vec3((bn-1)<<nd);
    };

    // initial grid
    std::vector<vec3> pointst;
    std::unordered_map<int, float> samples;
    pointst.reserve(bn.x*bn.y*bn.z);
    for (int k = 0; k < bn.z; k++)
        for (int j = 0; j < bn.y; j++)
            for (int i = 0; i < bn.x; i++) {
                pointst.push_back(idxToPoint(getI(i<<nd, j<<nd, k<<nd)));
            }
    std::vector<float> vals(pointst.size());
    Fs(pointst.size(), &pointst[0], &vals[0]);
    for (int k = 0; k < bn.z; k++)
        for (int j = 0; j < bn.y; j++)
            for (int i = 0; i < bn.x; i++) {
                samples[getI(i<<nd, j<<nd, k<<nd)] = vals[(k*bn.y+j)*bn.x+i];
            }

    auto calcCubeIdx = [&](ivec3 c, int idx[8], int s) {
        idx[0] = getI(c.x, c.y, c.z);
        idx[1] = getI(c.x, c.y+s, c.z);
        idx[2] = getI(c.x+s, c.y+s, c.z);
        idx[3] = getI(c.x+s, c.y, c.z);
        idx[4] = getI(c.x, c.y, c.z+s);
        idx[5] = getI(c.x, c.y+s, c.z+s);
        idx[6] = getI(c.x+s, c.y+s, c.z+s);
        idx[7] = getI(c.x+s, c.y, c.z+s);
        int cubeIndex = 0;
        for (int i = 0; i < 8; i++) {
            assert(samples.find(idx[i]) != samples.end());
            cubeIndex |= (int(samples[idx[i]] <= 0.) << i);
        }
        return cubeIndex;
    };
    std::vector<ivec3> cubes;
    std::vector<int> cubeSizes;
    for (int k = 0; k < bn.z-1; k++)
        for (int j = 0; j < bn.y-1; j++)
            for (int i = 0; i < bn.x-1; i++) {
                ivec3 c = ivec3(i, j, k) << nd;
                int s = 1 << nd;
                int cvidx[8];
                int idx = calcCubeIdx(c, cvidx, s);
                if (idx != 0 && idx != 0xff) {
                    cubes.push_back(c);
                    cubeSizes.push_back(s);
                }
            }

    float time1 = getTimePast();

    // subdivide
    for (int subdiv = 0; subdiv < nd; subdiv++) {

        // sample
        std::vector<int> sampleIdx;
        std::vector<vec3> samplePoints;
        auto sampleCube = [&](ivec3 c0, int s) {
            for (int i = 0; i < 27; i++) {
                ivec3 c = c0 + s * ivec3(i%3, (i/3)%3, i/9);
                int idx = getI(c.x, c.y, c.z);
                if (samples.find(idx) == samples.end()) {
                    samples[idx] = 0.0f;
                    sampleIdx.push_back(idx);
                    samplePoints.push_back(idxToPoint(idx));
                }
            }
        };
        for (int ci = 0; ci < (int)cubes.size(); ci++) {
            ivec3 c0 = cubes[ci];
            int s0 = cubeSizes[ci];
            assert(s0 << subdiv == 1 << nd);
            sampleCube(c0, s0 >> 1);
        }
        std::vector<float> sampleValues(samplePoints.size());
        Fs(samplePoints.size(), &samplePoints[0], &sampleValues[0]);
        for (int i = 0; i < (int)samplePoints.size(); i++)
            samples[sampleIdx[i]] = sampleValues[i];

        // resolve open cubes
        std::unordered_set<int> addedCubes;
        for (ivec3 c : cubes)
            addedCubes.insert(getI(c.x, c.y, c.z));
        int ci0 = 0, ci1 = (int)cubes.size();
        for (int riter = 0; riter < 256 && ci0 < ci1; riter++) {
            sampleIdx.clear();
            samplePoints.clear();
            sampleValues.clear();
            for (int ci = ci0; ci < ci1; ci++) {
                ivec3 c0 = cubes[ci];
                int s0 = cubeSizes[ci];
                int s = s0 >> 1;
                bool sign[3][3][3];
                for (int i = 0; i < 27; i++) {
                    ivec3 d = ivec3(i%3, (i/3)%3, i/9);
                    ivec3 c = c0 + s * d;
                    int idx = getI(c.x, c.y, c.z);
                    assert(samples.find(idx) != samples.end());
                    sign[d.x][d.y][d.z] = (samples[idx] <= 0.0f);
                }
                auto getSign = [&](ivec3 _) {
                    return sign[_.x+1][_.y+1][_.z+1];
                };
                for (int fi = 0; fi < 6; fi++) {
                    ivec3 c = c0 + ivec3(s);
                    ivec3 k = MC_FACE_DIR[fi];
                    ivec3 i = MC_FACE_DIR[(fi+1)%6];
                    ivec3 j = MC_FACE_DIR[(fi+2)%6];
                    int vsign = 
                        (int)getSign(k+i+j) +
                        (int)getSign(k+i-j) +
                        (int)getSign(k-i+j) +
                        (int)getSign(k-i-j);
                    int esign =
                        (int)getSign(k) +
                        (int)getSign(k+i) +
                        (int)getSign(k-i) +
                        (int)getSign(k+j) +
                        (int)getSign(k-j);
                    if ((vsign == 0 && esign != 0) || (vsign == 4 && esign != 5)) {
                        ivec3 c1 = c0 + s0 * k;
                        if (c1.x < 0 || c1.x+s0 >= bnd.x-nd ||
                            c1.y < 0 || c1.y+s0 >= bnd.y-nd ||
                            c1.z < 0 || c1.z+s0 >= bnd.z-nd) continue;
                        int i1 = getI(c1.x, c1.y, c1.z);
                        if (addedCubes.find(i1) == addedCubes.end()) {
                            cubes.push_back(c1);
                            cubeSizes.push_back(s0);
                            sampleCube(c1, s);
                            addedCubes.insert(i1);
                        }
                    }
                }
            }
            sampleValues.resize(samplePoints.size());
            Fs(samplePoints.size(), &samplePoints[0], &sampleValues[0]);
            for (int i = 0; i < (int)samplePoints.size(); i++)
                samples[sampleIdx[i]] = sampleValues[i];
            // printf("%d %d\n", ci0, ci1);
            ci0 = ci1, ci1 = (int)cubes.size();
        }

        // subdivide
        std::vector<ivec3> newCubes;
        std::vector<int> newCubeSizes;
        auto addCube = [&](ivec3 c0, int s) {
            int cvidx[8];
            for (int i = 0; i < 8; i++) {
                ivec3 c = c0 + s * ivec3(i%2, (i/2)%2, i/4);
                int ci = calcCubeIdx(c, cvidx, s);
                if (ci != 0 && ci != 0xff) {
                    newCubes.push_back(c);
                    newCubeSizes.push_back(s);
                }
            }
        };
        for (int ci = 0; ci < (int)cubes.size(); ci++) {
            ivec3 c0 = cubes[ci];
            int s0 = cubeSizes[ci];
            addCube(c0, s0 >> 1);
        }
        cubes = newCubes;
        cubeSizes = newCubeSizes;
    }

    float time2 = getTimePast();

    // get edges
    std::vector<uint64_t> edges;

    for (int i = 0; i < (int)cubes.size(); i++) {
        int idx[8];
        int cubeIndex = calcCubeIdx(cubes[i], idx, cubeSizes[i]);

        // check table
        if (cubeIndex != 0 && cubeIndex != 0xff) {
            int eidx[12];
            for (int e = 0; e < 12; e++)
                if ((1 << e) & MC_EDGE_TABLE[cubeIndex]) {
                    int i1 = idx[MC_EDGE_LIST[e].x];
                    int i2 = idx[MC_EDGE_LIST[e].y];
                    if (i1 > i2) std::swap(i1, i2);
                    eidx[e] = edges.size();
                    edges.push_back(((uint64_t)i1 << 32) | (uint64_t)i2);
                }

            // construct triangles
            for (int t = 0; MC_TRIG_TABLE[cubeIndex][t] != -1; t += 3) {
                trigs.push_back(vec3(
                    eidx[MC_TRIG_TABLE[cubeIndex][t]],
                    eidx[MC_TRIG_TABLE[cubeIndex][t+1]],
                    eidx[MC_TRIG_TABLE[cubeIndex][t+2]]
                ));
            }
        }

    }

    float time3 = getTimePast();

    std::unordered_map<uint64_t, int> uniqueEdges;
    std::vector<uint64_t> edges1;
    std::vector<int> emap(edges.size());
    for (int i = 0; i < (int)edges.size(); i++) {
        uint64_t e = edges[i];
        if (uniqueEdges.find(e) != uniqueEdges.end()) {
            emap[i] = uniqueEdges[e];
        }
        else {
            emap[i] = uniqueEdges[e] = edges1.size();
            edges1.push_back(e);
        }
    }
    for (int i = 0; i < (int)trigs.size(); i++)
        for (int _ = 0; _ < 3; _++)
            trigs[i][_] = emap[trigs[i][_]];
    edges = edges1;

    float time4 = getTimePast();

    // get interpolated vertices
    vertices.resize(edges.size());
#if 0
    // linear interpolation
    for (std::pair<ivec2, int> ei : edges) {
        int i1 = ei.first.x, i2 = ei.first.y;
        float v1 = vals[i1];
        float v2 = vals[i2];
        float t = v1 / (v1 - v2);
        vertices[ei.second] = idxToPoint(i1) * (1 - t) + idxToPoint(i2) * t;
    }
#else
    // quadratic interpolation
    std::vector<vec3> edgep(edges.size());
    std::vector<ivec2> edgei(edges.size());
    std::vector<float> edgevc(edges.size());
    for (int i = 0; i < (int)edges.size(); i++) {
        int i1 = (int)(edges[i] >> 32), i2 = (int)edges[i];
        edgei[i] = vec2(i1, i2);
        edgep[i] = 0.5f*(idxToPoint(i1)+idxToPoint(i2));
    }
    Fs(edgep.size(), &edgep[0], &edgevc[0]);
    for (int i = 0; i < (int)edgep.size(); i++) {
        typedef double scalar;
        scalar t = (scalar)(0.5);
        scalar v0 = (scalar)samples[edgei[i].x];
        scalar v1 = (scalar)samples[edgei[i].y];
        scalar vc = (scalar)edgevc[i];
        scalar a = (t-(scalar)1) * v0 - t * v1 + vc;
        scalar b = ((scalar)1-t*t) * v0 + t*t * v1 - vc;
        scalar c = (t*t-t) * v0;
        scalar d = sqrt(fmax(b*b-(scalar)4*a*c, (scalar)0));
        float t1 = 0.5f*float((-b+d)/a);
        float t2 = 0.5f*float((-b-d)/a);
        float t_ = a == (scalar)0 ? (float)(-c / b) :
            fabs(t1-0.5f) < fabs(t2 - 0.5f) ? t1 : t2;
        t_ = clamp(t_, 0.01f, 0.99f);
        vertices[i] = mix(idxToPoint(edgei[i].x), idxToPoint(edgei[i].y), t_);
    }
#endif

    float time5 = getTimePast();
    printf("marchingCubes: %.2g + %.2g + %.2g + %.2g + %.2g = %.2g secs\n",
        time1-time0, time2-time1, time3-time2, time4-time3, time5-time4, time5-time0);

}

