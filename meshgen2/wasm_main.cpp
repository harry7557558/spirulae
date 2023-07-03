// emcc main.cpp -o example.html -s EXPORTED_RUNTIME_METHODS=ccall -s EXPORTED_FUNCTIONS=_main,_malloc,_free,getValue -sMIN_WEBGL_VERSION=2 -sFULL_ES3=1 -sUSE_GLFW=3 -sALLOW_MEMORY_GROWTH
// testing: -O2; release: -O3; smaller: -Os --closure 1

// https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html

#include <stdio.h>
#include <string>
#include <emscripten/emscripten.h>

#ifdef __cplusplus
#define EXTERN extern "C"
#else
#error "Please compile this as a C++ file."
#endif

#define GLM_FORCE_PURE
#define main testMain
#include "main.cpp"
#undef main

int main() {
	printf("`int main()` called.\n \n");
	return testMain();
}
