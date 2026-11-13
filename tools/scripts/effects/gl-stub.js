// shdc-lib validates GLSL1 with the native "gl" package. We skip that check (the browser validates at runtime).
module.exports = () => ({
  getSupportedExtensions: () => [], getExtension() {}, createShader: () => ({}), shaderSource() {}, compileShader() {},
  getShaderParameter: () => true, getShaderInfoLog: () => '', deleteShader() {}, createProgram: () => ({}), attachShader() {},
  linkProgram() {}, getProgramParameter: () => true, getProgramInfoLog: () => '', deleteProgram() {},
  VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
});
