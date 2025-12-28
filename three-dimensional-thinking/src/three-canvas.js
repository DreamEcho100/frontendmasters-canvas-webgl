import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SeedRandom } from "./seed-random.js";
import palettes from "nice-color-palettes";
// import { expoInOut } from "eases";
import BezierEasing from "bezier-easing";

const rng = new SeedRandom(null);

/**
 * @param {HTMLCanvasElement} canvasElem
 * @param {HTMLElement} containerElem
 */
export function setupThreeCanvas(canvasElem, containerElem) {
	const renderer = new THREE.WebGLRenderer({
		canvas: canvasElem,
		antialias: true,
		preserveDrawingBuffer: true,
	});
	renderer.setClearColor(0xf2f2f2, 1);

	const scene = new THREE.Scene();

	const camera = new THREE.OrthographicCamera();
	camera.zoom = 0.5; // smaller = farther
	camera.updateProjectionMatrix();

	camera.position.set(4, 2, 20);
	camera.lookAt(0, 0, 0);

	const controls = new OrbitControls(camera, canvasElem);
	controls.enableDamping = true;

	const palette = rng.pick(palettes);

	const box = new THREE.BoxGeometry(1, 1, 1);
	const meshesCount = 40;
	const meshes = new Array(meshesCount);
	for (let i = 0; i < meshesCount; i++) {
		const mesh = new THREE.Mesh(
			box,
			// new THREE.MeshStandardMaterial({
			// 	color: rng.pick(palette),
			// }),
			/*
`
  precision highp float;

  uniform float time;
  uniform float aspect;
  varying vec2 vUv;

  void main () {
    // vec3 color = 0.5 + 0.5 * cos(time + vUv.xyx + vec3(0.0, 2.0, 4.0));
    // gl_FragColor = vec4(color, 1.0);
    // gl_FragColor = vec4(vec3(vUv.x), 1.0);
    vec3 colorA = sin(time + vUv.x * 3.14) * vec3(1.0, 0.0, 0.0);
    vec3 colorB = vec3(0.0, 1.0, 1.0);

    vec2 center = vUv - 0.5;
    // center.x *= aspect;
    center.y /= aspect;

    float dist = length(center);

    float alpha = smoothstep(0.5 * sin(time), 0.25, dist);

    vec3 color = mix(colorA, colorB, vUv.y + vUv.x * sin(time * 0.8));
    gl_FragColor = vec4(color, alpha);
  }
`
			*/
			new THREE.ShaderMaterial({
				uniforms: {
					time: { value: 0 },
					color: { value: new THREE.Color(rng.pick(palette)) },
				},
				vertexShader: /* glsl */ `
					varying vec3 vPos;
					varying vec3 vNormal;

					void main() {
						vPos = position;

						// Transform normal to view space
						vNormal = normalize(normalMatrix * normal);

						gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
					}
				`,
				fragmentShader: /* glsl */ `
					precision highp float;

					uniform float time;
					uniform vec3 color;

					varying vec3 vPos;
					varying vec3 vNormal;

					// Luminance helper
					float luma(vec3 c) {
						return dot(c, vec3(0.299, 0.587, 0.114));
					}

					void main() {

						/* -------------------- LIGHTING -------------------- */

						// Match your DirectionalLight position
						vec3 lightDir = normalize(vec3(2.0, 2.0, 4.0));

						// Lambert shading
						float diffuse = max(dot(vNormal, lightDir), 0.0);

						// Ambient + diffuse balance
						float lighting = 0.25 + 0.75 * diffuse;

						/* -------------------- COLOR LOGIC -------------------- */

						float field = 0.5 + 0.5 * sin(
							time +
							vPos.x * 3.0 +
							vPos.y * 4.0
						)  * 4.5;

						float shape = smoothstep(0.0, 1.0, field);

						vec3 base = color;
						vec3 accent = 1.0 - color;

						float contrast = mix(0.6, 1.4, shape);

						vec3 finalColor = mix(
							base * contrast,
							accent,
							shape * 0.35
						);

						// Subtle time-based modulation
						float colorStrength = luma(color);
						finalColor *= 0.85 + 0.15 * sin(time + colorStrength * 6.0);

						/* -------------------- APPLY LIGHT -------------------- */

						finalColor *= lighting;

						gl_FragColor = vec4(finalColor, 1.0);
					}
				`,
			}),
		);
		scene.add(mesh);
		meshes[i] = mesh;

		mesh.position.set(rng.between(-1, 1), rng.between(-1, 1), rng.between(-1, 1));
		mesh.scale.set(rng.between(-1, 1), rng.between(-1, 1), rng.between(-1, 1));
		mesh.scale.multiplyScalar(0.5);
	}

	scene.add(new THREE.AmbientLight(rng.pick(palette), rng.between(0.5, 1)));

	const light = new THREE.DirectionalLight(rng.pick(palette), 1);
	scene.add(light);
	light.position.set(2, 2, 4);

	const resizeObserver = new ResizeObserver((entries) => {
		const entry = entries[0];
		const { width, height } = entry.contentRect;

		const dpr = window.devicePixelRatio || 1;

		renderer.setPixelRatio(dpr);
		renderer.setSize(width, height, false);

		// camera.aspect = width / height;
		const aspect = width / height;

		// Ortho zoom
		const zoom = 1.0;

		// Bounds
		camera.left = -zoom * aspect;
		camera.right = zoom * aspect;
		camera.top = zoom;
		camera.bottom = -zoom;

		// Near/Far
		camera.near = -100;
		camera.far = 100;

		// Set position & look at world center
		camera.position.set(zoom, zoom, zoom);
		camera.lookAt(new THREE.Vector3());

		// Update the camera
		camera.updateProjectionMatrix();
	});

	resizeObserver.observe(containerElem);

	const easeFn = BezierEasing(
		// 0.42, 0, 0.58, 1
		0.67,
		0.03,
		0.29,
		0.99,
	);

	const clock = new THREE.Clock();

	/** @type {number|undefined} */
	let renderHandle;
	function render() {
		const elapsedTime = clock.getElapsedTime();

		// scene.traverse((obj) => {
		// 	if (obj.material?.uniforms?.time) {
		// 		obj.material.uniforms.time.value = elapsedTime;
		// 	}
		// });
		for (let i = 0; i < meshes.length; i++) {
			const mesh = meshes[i];
			if (mesh.material?.uniforms?.time) {
				mesh.material.uniforms.time.value = elapsedTime;
			}
		}

		const t = Math.sin(Math.PI * elapsedTime);
		scene.rotation.z = easeFn(t);

		controls.update();
		renderer.render(scene, camera);
		renderHandle = requestAnimationFrame(render);
	}

	requestAnimationFrame(render);

	/**
	 * Cleanup (useful for HMR or manual teardown)
	 */
	function dispose() {
		// window.removeEventListener("resize", resize);
		resizeObserver.disconnect();
		controls.dispose();
		renderer.dispose();
		if (typeof renderHandle === "number") cancelAnimationFrame(renderHandle);
	}

	return {
		dispose,
	};
}
