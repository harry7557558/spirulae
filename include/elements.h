// FEM elements

#pragma once

#include <cmath>
#include <initializer_list>
#include <cassert>
#include <functional>

#if SUPPRESS_ASSERT
#undef assert
#define assert(x) 0
#endif

#ifndef PI
#define PI 3.1415926535897932384626
#endif

template<typename T> T abs(T x) { return x > 0 ? x : -x; }

#include "glm/glm.hpp"
using glm::clamp; using glm::mix; using glm::sign;
using glm::vec2; using glm::vec3; using glm::vec4;
using glm::dot; using glm::cross; using glm::outerProduct;
using glm::mat2; using glm::mat3; using glm::mat4;
using glm::mat2x3; using glm::mat3x2; using glm::mat4x3;
using glm::inverse; using glm::transpose; using glm::determinant;

using glm::ivec2;
using glm::ivec3;
using glm::ivec4;


// timer
#include <chrono>
auto _TIME_START = std::chrono::high_resolution_clock::now();
float getTimePast() {
    auto t1 = std::chrono::high_resolution_clock::now();
    return std::chrono::duration<float>(t1 - _TIME_START).count();
}

// hash
namespace std {
    template<>
    struct hash<glm::ivec2> {
        size_t operator()(const glm::ivec2& v) const {
            return hash<int>()(v.x) ^ hash<int>()(v.y);
        }
    };
    template<>
    struct hash<glm::ivec3> {
        size_t operator()(const glm::ivec3& v) const {
            return hash<int>()(v.x) ^ hash<int>()(v.y) ^ hash<int>()(v.z);
        }
    };
    template<>
    struct hash<glm::ivec4> {
        size_t operator()(const glm::ivec4& v) const {
            return hash<int>()(v.x) ^ hash<int>()(v.y) ^ hash<int>()(v.z) ^ hash<int>()(v.w);
        }
    };
}
