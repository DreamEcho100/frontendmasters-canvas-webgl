/**
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *  prefix?: string;
 *  postfix?: string;
 *  extension?: string;
 *  quality?: number;
 *  scale?: number;
 *  exportWidth?: null;
 *  exportHeight?: null;
 *  pixelRatio?: number;
 *  background?: null;
 *  smooth?: boolean;
 *  timestamp?: boolean;
 *  frame?: boolean;
 *  pad?: number;
 *  key?: string;
 * }} options
 */
export function createCanvasSaver(canvas, options = {}) {
	const {
		// Filename
		prefix = "sketch",
		postfix = "",
		extension = "png", // png | jpg | webp
		quality = 0.95,

		// Resolution control
		scale = 1, // export multiplier (like canvas-sketch)
		exportWidth = null, // override width
		exportHeight = null, // override height
		pixelRatio = window.devicePixelRatio || 1,

		// Rendering
		background = null, // e.g. '#fff' to force background
		smooth = true,

		// Naming
		timestamp = true,
		frame = false, // true → auto increment
		pad = 4,

		// Hotkey
		key = "s",
	} = options;

	let frameCount = 0;

	function getFilename() {
		const parts = [prefix];

		if (frame) {
			frameCount++;
			parts.push(String(frameCount).padStart(pad, "0"));
		}

		if (timestamp) {
			const d = new Date();
			const ts = d.toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
			parts.push(ts);
		}

		parts.push(postfix);

		return `${parts.join("_")}.${extension}`;
	}

	function createExportCanvas() {
		const srcWidth = canvas.width;
		const srcHeight = canvas.height;

		// Export size in *canvas pixels*
		const width = exportWidth ?? srcWidth;
		const height = exportHeight ?? srcHeight;

		const ratio = scale; // <-- IMPORTANT: no devicePixelRatio here

		const off = document.createElement("canvas");
		off.width = Math.floor(width * ratio);
		off.height = Math.floor(height * ratio);

		const ctx = off.getContext("2d");
		if (!ctx) return null;

		// Reset transform (critical)
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.imageSmoothingEnabled = smooth;
		ctx.imageSmoothingQuality = "high";

		// Apply export scale
		ctx.scale(ratio, ratio);

		if (background) {
			ctx.fillStyle = background;
			ctx.fillRect(0, 0, width, height);
		}

		// Draw using FULL SOURCE RESOLUTION
		ctx.drawImage(canvas, 0, 0, srcWidth, srcHeight, 0, 0, width, height);

		return off;
	}

	/**
	 * @param {HTMLCanvasElement} exportCanvas
	 */
	function downloadCanvas(exportCanvas) {
		const mime = `image/${extension === "jpg" ? "jpeg" : extension}`;
		const filename = getFilename();

		exportCanvas.toBlob(
			(blob) => {
				if (!blob) {
					console.error("Failed to create blob");
					return;
				}
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			},
			mime,
			quality,
		);
	}

	function save() {
		const exportCanvas = createExportCanvas();
		if (!exportCanvas) {
			console.error("Failed to create export canvas");
			return;
		}
		downloadCanvas(exportCanvas);
	}

	/**
	 * @param {KeyboardEvent} e
	 */
	function onKeyDown(e) {
		const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === key;

		if (!isSave) return;

		e.preventDefault();
		save();
	}

	window.addEventListener("keydown", onKeyDown);

	return {
		save,
		onKeyDown,
	};
}

// Note: look at the following approaches to expose a better performant solutions for saving
// rather than using the three.js `preserveDrawingBuffer: true`
// Performance Impact
//
// Memory usage: The GPU must preserve the frame buffer between draws, using extra VRAM
// Mobile devices: More noticeable impact on phones/tablets with limited GPU memory
// Rendering overhead: Some GPUs perform optimizations when they can discard buffers - preserving prevents these
//
// How Bad Is It?
// For most applications: minimal to negligible impact. You'll likely never notice it unless:
//
// Running complex scenes on low-end hardware
// Targeting mobile browsers heavily
// Rendering at very high resolutions

/*
// In create-canvas-saver.js, modify the save function:
function save() {
  // Trigger a custom event that your render loop can listen to
  window.dispatchEvent(new CustomEvent('capture-frame'));
}

// In your three-canvas.js render loop:
let shouldCapture = false;

window.addEventListener('capture-frame', () => {
  shouldCapture = true;
});

function animate() {
  renderer.render(scene, camera);
  
  if (shouldCapture) {
    shouldCapture = false;
    const exportCanvas = createExportCanvas();
    downloadCanvas(exportCanvas);
  }
  
  requestAnimationFrame(animate);
}
*/

/*
// In three-canvas.js
export function setupThreeCanvas(canvasElem, containerElem) {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasElem,
    preserveDrawingBuffer: false, // Default: off for performance
    antialias: true,
  });

  let captureNext = false;
  let captureCallback = null;

  window.addEventListener('request-capture', (e) => {
    captureNext = true;
    captureCallback = e.detail.callback;
  });

  function animate() {
    renderer.render(scene, camera);
    
    if (captureNext) {
      captureNext = false;
      // Canvas is now rendered and ready to capture
      if (captureCallback) captureCallback();
    }
    
    requestAnimationFrame(animate);
  }

  animate();
  
  return { dispose: () => { 
		// cleanup
	 } };
}

// In create-canvas-saver.js
function save() {
  window.dispatchEvent(new CustomEvent('request-capture', {
    detail: {
      callback: () => {
        const exportCanvas = createExportCanvas();
        if (exportCanvas) downloadCanvas(exportCanvas);
      }
    }
  }));
}
*/
