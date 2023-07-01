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

EXTERN EMSCRIPTEN_KEEPALIVE
void gl_test() {
	testMain();
}
int main() {
	printf("`int main()` called.\n\n");
	return testMain();
}

EXTERN EMSCRIPTEN_KEEPALIVE
int add(int argc, int* argv) {
	printf("argc = %d\n", argc);
	int sum = 0;
	for (int i = 0; i < argc; i++) {
		int x = argv[i];
		printf("argv[%d] == %d\n", i, x);
		sum += x;
	}
	return sum;
}

EXTERN EMSCRIPTEN_KEEPALIVE
int* list(int n) {
	int *p = new int[n];
	for (int i = 0; i < n; i++)
		p[i] = i;
	return p;
}

EXTERN EMSCRIPTEN_KEEPALIVE
char* liststr(int n) {
	std::string s = "hello";
	//return &s[0];  // might work? might not work?
	return nullptr;
}