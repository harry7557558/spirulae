#include "elements.h"

#include <stdio.h>
#include <vector>
#include <string>
#include <sstream>

void writeSTL(const char* filename,
    std::vector<vec3> verts, std::vector<ivec3> trigs
) {
    FILE* fp = fopen(&filename[0], "wb");
    if (!fp) {
        printf("Error open file %s\n", filename);
    }
    for (int i = 0; i < 80; i++) fputc(0, fp);
    int n = (int)trigs.size();
    fwrite(&n, 4, 1, fp);
    assert(sizeof(vec3) == 12);
    for (int i = 0; i < n; i++) {
        auto writevec3 = [&](vec3 v) {
            v = vec3(v.x, -v.z, v.y);
            fwrite(&v, 4, 3, fp);
        };
        vec3 v0 = verts[trigs[i][0]];
        vec3 v1 = verts[trigs[i][1]];
        vec3 v2 = verts[trigs[i][2]];
        vec3 n = normalize(cross(v1-v0, v2-v0));
        writevec3(n);
        writevec3(v0);
        writevec3(v1);
        writevec3(v2);
        fputc(0, fp); fputc(0, fp);
    }
    fclose(fp);
}


void writePLY(const char* filename,
    std::vector<vec3> verts, std::vector<ivec3> trigs
) {
    FILE* fp = fopen(filename, "wb");
    if (!fp) {
        printf("Error open file %s\n", filename);
    }
    fprintf(fp, "ply\nformat binary_little_endian 1.0\n");
    fprintf(fp, "element vertex %d\n", (int)verts.size());
    fprintf(fp, "property float x\n");
    fprintf(fp, "property float y\n");
    fprintf(fp, "property float z\n");
    fprintf(fp, "element face %d\n", (int)trigs.size());
    fprintf(fp, "property list uchar int vertex_index\n");
    fprintf(fp, "end_header\n");
    assert(sizeof(vec3) == 12);
    for (vec3 v : verts) {
        fwrite(&v, 4, 3, fp);
    }
    assert(sizeof(ivec3) == 12);
    for (ivec3 t : trigs) {
        fputc(3, fp);
        fwrite(&t, 4, 3, fp);
    }
    fclose(fp);
}


void writeGLB(const char* filename,
    std::vector<vec3> verts, std::vector<ivec3> trigs
) {
    assert(sizeof(vec3) == 12);
    assert(sizeof(ivec3) == 12);
    int vn = (int)verts.size();
    int tn = 3*(int)trigs.size();
    int vbn = 12*vn;
    int tbn = 4*tn;

    std::stringstream json;
    json << "{";
    json << "\"asset\":{\"version\":\"2.0\"},";
    json << "\"scene\":0,";
    json << "\"scenes\":[{\"name\":\"Scene\",\"nodes\":[0]}],";
    json << "\"nodes\":[{\"mesh\":0,\"name\":\"Cube\"}],";
    json << "\"meshes\":[{\"name\":\"Cube\",\"primitives\":[{\"attributes\":{\"POSITION\":0},\"indices\":1}]}],";
    json << "\"accessors\":[";
    json << "{\"bufferView\":0,\"componentType\":5126,\"count\":" << vn << ",\"type\":\"VEC3\"},";
    json << "{\"bufferView\":1,\"componentType\":5125,\"count\":" << tn << ",\"type\":\"SCALAR\"}";
    json << "],";
    json << "\"bufferViews\":[";
    json << "{\"buffer\":0,\"byteLength\":" << vbn << ",\"byteOffset\":0,\"target\":34962},";
    json << "{\"buffer\":0,\"byteLength\":" << tbn << ",\"byteOffset\":" << vbn << ",\"target\":34963}";
    json << "],";
    json << "\"buffers\":[{\"byteLength\":" << (vbn+tbn) << "}]";
    json << "}";

    std::string jsons = json.str();
    while (jsons.size() % 4 != 0)
        jsons += " ";

    FILE* fp = fopen(filename, "wb");
    if (!fp) {
        printf("Error open file %s\n", filename);
    }
    int temp;
    fprintf(fp, "glTF");
    temp = 2;
    fwrite(&temp, 4, 1, fp);
    temp = 12 + (4+4+(int)jsons.size()) + (4+4+vbn+tbn);
    fwrite(&temp, 4, 1, fp);

    temp = (int)jsons.size();
    fwrite(&temp, 4, 1, fp);
    temp = 0x4e4f534a;
    fwrite(&temp, 4, 1, fp);
    fprintf(fp, "%s", &jsons[0]);

    temp = vbn+tbn;
    fwrite(&temp, 4, 1, fp);
    temp = 0x004e4942;
    fwrite(&temp, 4, 1, fp);
    fwrite(&verts[0], 12, vn, fp);
    fwrite(&trigs[0], 12, trigs.size(), fp);

    fclose(fp);
}
