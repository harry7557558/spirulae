emcc wasm_main.cpp -o module.js -s EXPORTED_RUNTIME_METHODS=ccall -sMIN_WEBGL_VERSION=2 -sUSE_GLFW=3 -sALLOW_MEMORY_GROWTH $@
# ccache emcc wasm_main.cpp -gsource-map -fsanitize=address -o module.js -s EXPORTED_RUNTIME_METHODS=ccall -sASSERTIONS -s EXPORTED_FUNCTIONS=_main,_malloc,_free,getValue -sMIN_WEBGL_VERSION=2 -sFULL_ES3=1 -sUSE_GLFW=3 -sALLOW_MEMORY_GROWTH
