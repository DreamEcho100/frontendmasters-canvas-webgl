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
	for (let i = 0; i < 40; i++) {
		const mesh = new THREE.Mesh(
			box,
			new THREE.MeshStandardMaterial({
				color: rng.pick(palette),
			}),
		);

		mesh.position.set(rng.between(-1, 1), rng.between(-1, 1), rng.between(-1, 1));
		mesh.scale.set(rng.between(-1, 1), rng.between(-1, 1), rng.between(-1, 1));
		mesh.scale.multiplyScalar(0.5);

		scene.add(mesh);
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
