#include "elements.h"

#include <stdio.h>
#include <vector>
#include <string>
#include <sstream>


void extendVector(std::vector<uint8_t> &v, size_t n, const void *p) {
    for (int i = 0; i < n; i++)
        v.push_back(((uint8_t*)p)[i]);
}
void extendVectorS(std::vector<uint8_t> &v, const char* s) {
    extendVector(v, strlen(s), s);
}


std::vector<uint8_t> writeSTL(
    std::vector<vec3> verts, std::vector<ivec3> trigs
) {
    std::vector<uint8_t> res;
    for (int i = 0; i < 80; i++)
        res.push_back(0);
    int n = (int)trigs.size();
    extendVector(res, 4, &n);
    assert(sizeof(vec3) == 12);
    for (int i = 0; i < n; i++) {
        auto writevec3 = [&](vec3 v) {
            // v = vec3(v.x, -v.z, v.y);
            extendVector(res, 12, &v);
        };
        vec3 v0 = verts[trigs[i][0]];
        vec3 v1 = verts[trigs[i][1]];
        vec3 v2 = verts[trigs[i][2]];
        vec3 n = normalize(cross(v1-v0, v2-v0));
        writevec3(n);
        writevec3(v0);
        writevec3(v1);
        writevec3(v2);
        res.push_back(0); res.push_back(0);
    }
    return res;
}


std::vector<uint8_t> writePLY(
    std::vector<vec3> verts, std::vector<ivec3> trigs,
    std::vector<vec3> normals = std::vector<vec3>()
) {
    std::vector<uint8_t> res;

    std::stringstream header;
    header << "ply\nformat binary_little_endian 1.0\n";
    header << "element vertex " << (int)verts.size() << "\n";
    header << "property float x\n";
    header << "property float y\n";
    header << "property float z\n";
    if (!normals.empty()) {
        header << "property float nx\n";
        header << "property float ny\n";
        header << "property float nz\n";
    }
    header << "element face " << (int)trigs.size() << "\n";
    header << "property list uchar int vertex_index\n";
    header << "end_header\n";
    extendVectorS(res, &header.str()[0]);

    assert(sizeof(vec3) == 12);
    for (int i = 0; i < (int)verts.size(); i++) {
        vec3 v = verts[i];
        v = vec3(v.x, v.z, -v.y);
        extendVector(res, 12, &v);
        if (!normals.empty()) {
            vec3 n = normals[i];
            n = vec3(n.x, n.z, -n.y);;
            extendVector(res, 12, &n);
        }
    }
    assert(sizeof(ivec3) == 12);
    for (ivec3 t : trigs) {
        res.push_back(3);
        extendVector(res, 12, &t);
    }
    return res;
}


std::vector<uint8_t> writeOBJ(
    std::vector<vec3> verts, std::vector<ivec3> trigs,
    std::vector<vec3> normals = std::vector<vec3>()
) {
    std::vector<uint8_t> res;
    char buf[1024];
    sprintf(buf, "o meshgen2\n");
    extendVectorS(res, buf);
    for (vec3 v : verts) {
        sprintf(buf, "v %.6g %.6g %.6g\n", v.x, v.z, -v.y);
        extendVectorS(res, buf);
    }
    for (vec3 n : normals) {
        sprintf(buf, "vn %.6g %.6g %.6g\n", n.x, n.z, -n.y);
        extendVectorS(res, buf);
    }
    for (ivec3 t : trigs) {
        t.x += 1, t.y += 1, t.z += 1;
        if (!normals.empty()) {
            sprintf(buf, "f %d//%d %d//%d %d//%d\n", t.x, t.x, t.y, t.y, t.z, t.z);
            extendVectorS(res, buf);
        }
        else {
            sprintf(buf, "f %d %d %d\n", t.x, t.y, t.z);
            extendVectorS(res, buf);
        }
    }
    return res;
}


std::vector<uint8_t> writeGLB(
    std::vector<vec3> verts, std::vector<ivec3> trigs,
    std::vector<vec3> normals = std::vector<vec3>()
) {
    std::vector<uint8_t> res;
    assert(sizeof(vec3) == 12);
    assert(sizeof(ivec3) == 12);
    int vn = (int)verts.size();
    int tn = 3*(int)trigs.size();
    int vbn = 12*vn;
    int tbn = 4*tn;

    int normali = normals.empty() ? 1 : 2;

    std::stringstream json;
    json << "{";
    json << "\"asset\":{\"version\":\"2.0\"},";
    json << "\"scene\":0,";
    json << "\"scenes\":[{\"name\":\"Scene\",\"nodes\":[0]}],";
    json << "\"nodes\":[{\"mesh\":0,\"name\":\"meshgen2\"}],";
    json << "\"meshes\":[{\"name\":\"meshgen2\",\"primitives\":[";
    if (normals.empty()) json << "{\"attributes\":{\"POSITION\":0},\"indices\":1}";
    else json << "{\"attributes\":{\"POSITION\":0,\"NORMAL\":1},\"indices\":2}";
    json << "]}],";
    json << "\"accessors\":[";
    json << "{\"bufferView\":0,\"componentType\":5126,\"count\":" << vn << ",\"type\":\"VEC3\"},";
    if (!normals.empty())
        json << "{\"bufferView\":1,\"componentType\":5126,\"count\":" << vn << ",\"type\":\"VEC3\"},";
    json << "{\"bufferView\":" << normali << ",\"componentType\":5125,\"count\":" << tn << ",\"type\":\"SCALAR\"}";
    json << "],";
    json << "\"bufferViews\":[";
    json << "{\"buffer\":0,\"byteLength\":" << vbn << ",\"byteOffset\":0,\"target\":34962},";
    if (!normals.empty())
        json << "{\"buffer\":0,\"byteLength\":" << vbn << ",\"byteOffset\":" << vbn << ",\"target\":34962},";
    json << "{\"buffer\":0,\"byteLength\":" << tbn << ",\"byteOffset\":" << (normali*vbn) << ",\"target\":34963}";
    json << "],";
    json << "\"buffers\":[{\"byteLength\":" << (normali*vbn+tbn) << "}]";
    json << "}";
    std::string jsons = json.str();
    while (jsons.size() % 4 != 0)
        jsons += " ";

    // header
    int temp;
    extendVectorS(res, "glTF");
    temp = 2;
    extendVector(res, 4, &temp);
    temp = 12 + (4+4+(int)jsons.size()) + (4+4+normali*vbn+tbn);
    extendVector(res, 4, &temp);

    // JSON
    temp = (int)jsons.size();
    extendVector(res, 4, &temp);
    temp = 0x4e4f534a;
    extendVector(res, 4, &temp);
    extendVectorS(res, &jsons[0]);

    // data
    temp = normali*vbn+tbn;
    extendVector(res, 4, &temp);
    temp = 0x004e4942;
    extendVector(res, 4, &temp);
    for (vec3 v : verts) {
        v = vec3(v.x, v.z, -v.y);
        extendVector(res, 12, &v);
    }
    for (vec3 n : normals) {
        n = vec3(n.x, n.z, -n.y);
        extendVector(res, 12, &n);
    }
    extendVector(res, 4*tn, &trigs[0]);

    return res;
}
