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

const p2 = /* glsl */ `
precision highp float;

uniform float time;
uniform float aspect;
varying vec2 vUv;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: hsl2rgb = require('glsl-hsl2rgb');

void main () {
  // Centered UVs with aspect correction
  vec2 uv = vUv - 0.5;
  uv.y /= aspect;
  uv += 0.5;

  // Animated simplex noise
  float n = noise(vec3(uv * 5.0, time * 0.4));
  n = n * 0.5 + 0.5; // remap from [-1,1] to [0,1]


  // Slight UV distortion using noise
  vec2 distortedUV = uv + (n - 0.5) * 0.08;

  // Base colors
  vec3 colorA = vec3(1.0, 0.2, 0.2);
  vec3 colorB = vec3(0.0, 1.0, 1.0);

  // Noise-driven blend
  float blend = distortedUV.y + n * 0.4;
  // vec3 color = mix(colorA, colorB, blend);
  vec3 tmpColor = mix(colorA, colorB, blend);
  vec3 hueColor = hsl2rgb(n * 360.0, 1.0, n * 0.3 + 0.7);
  vec3 color = mix(tmpColor * 0.7, hueColor , n * 0.5 + 0.5);

  // Radial alpha mask
  vec2 center = uv - 0.5;
  // center.y /= aspect;
  float dist = length(center);
  float alpha = smoothstep(0.441, 0.44, dist);

  gl_FragColor = vec4(color, alpha);
}

`;

const p3 = /* glsl */ `
precision highp float;

uniform float time;
uniform float aspect;
varying vec2 vUv;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: hsl2rgb = require('glsl-hsl2rgb');

void main () {

  // Aspect-correct UVs
  vec2 uv = vUv - 0.5;
  uv.y /= aspect;
  uv += 0.5;

  // Strong, smooth noise
  float n = noise(vec3(uv * 4.0, time * 0.4));
  n = n * 0.5 + 0.5;

  // Flow distortion
  uv += vec2(
    noise(vec3(uv * 2.5, time * 0.3)),
    noise(vec3(uv * 2.5 + 5.0, time * 0.3))
  ) * 0.05;

  // High-energy palette
  vec3 colorA = vec3(0.9, 0.2, 0.6); // magenta
  vec3 colorB = vec3(0.1, 0.6, 1.0); // electric blue

  // Smooth blend (clamped!)
  float blend = smoothstep(0.251, 0.8, uv.y + n * 0.35);
  vec3 color = mix(colorA, colorB, blend);

  // Color pop via HSL (adds vibrance without gray)
  vec3 accent = hsl2rgb(
    360.0 + n * 80.0,
    1.0,
    0.55
  );

  color = mix(color, accent, n * 0.35);

  // Soft circular mask
  vec2 c = vUv - 0.5;
  c.y /= aspect;
  float r = length(c);
  float alpha = smoothstep(0.55, 0.25, r);

  gl_FragColor = vec4(color, alpha);
}

`;

// Your glsl code
const frag = glsl(/* glsl */ `
precision highp float;

uniform float time;
uniform float aspect;
varying vec2 vUv;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: hsl2rgb = require('glsl-hsl2rgb');

void main () {
  vec2 center = vUv - 0.5;
  center.x *= aspect;

  float dist = length(center);

  float alpha = smoothstep(0.25, 0.2475, dist);
  
  float n = noise(vec3(center * 0.5, time * 0.25));
  
  vec3 color = hsl2rgb(
    0.6 + n * 0.2,
    0.5,
    0.5
  );

  gl_FragColor = vec4(color, alpha);
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
    clearColor: false,
    // Pass along WebGL context
    gl,
    // Specify fragment and/or vertex shader strings
    frag,
    // Specify additional uniforms to pass down to the shaders
    uniforms: {
      // Expose props from canvas-sketch
      /** @param {{ time: number }} props */
      time: ({ time }) => time,
      /** @param {{ width: number; height: number }} props */
      aspect: ({ width, height }) => width / height,
    },
  });
};

canvasSketch(sketch, settings);
