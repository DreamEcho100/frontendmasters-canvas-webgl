// biome-ignore lint/suspicious/noTsIgnore: <explanation> We need to ignore this import for TS checking.
// @ts-ignore
import canvasSketch from "canvas-sketch";
// @ts-ignore
import createShader from "canvas-sketch-util/shader";
// @ts-ignore
import glsl from "glslify";

// Setup our sketch
const settings = {
  context: "webgl",
  animate: true,
};

// Your glsl code
const frag = glsl(`
  precision highp float;

  uniform float time;
  varying vec2 vUv;

  void main () {
    vec3 color = 0.5 + 0.5 * cos(time + vUv.xyx + vec3(0.0, 2.0, 4.0));
    gl_FragColor = vec4(color, 1.0);
  }
`);

/**
 * @typedef {{
 *   gl: WebGLRenderingContext;
 * }} SketchProps
 */

// Your sketch, which simply returns the shader
/**
 * @param {SketchProps} props
 */
const sketch = ({ gl }) => {
  // Create the shader and return it
  return createShader({
    // Pass along WebGL context
    gl,
    // Specify fragment and/or vertex shader strings
    frag,
    // Specify additional uniforms to pass down to the shaders
    uniforms: {
      // Expose props from canvas-sketch
      /** @param {{ time: number }} props */
      time: ({ time }) => time,
    },
  });
};

canvasSketch(sketch, settings);
