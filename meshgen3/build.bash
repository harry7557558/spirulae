emcc wasm_main.cpp -o module.js -s EXPORTED_RUNTIME_METHODS=ccall -sMIN_WEBGL_VERSION=2 -sUSE_GLFW=3 -sALLOW_MEMORY_GROWTH $@
