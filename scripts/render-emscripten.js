function resetState() {
    return null;
}

function updateShaderFunction(funCode, funGradCode, params) {

    Module.ccall('updateShaderFunction', // name of C function
        null, // return type
        ['string'], // argument types
        [funCode]);

}


// https://stackoverflow.com/a/47231903
window.addEventListener('keydown', function(event){
    event.stopImmediatePropagation();
}, true);
window.addEventListener('keyup', function(event){
    event.stopImmediatePropagation();
}, true);
