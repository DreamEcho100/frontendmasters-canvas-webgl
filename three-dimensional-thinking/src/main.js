import { createCanvasSaver } from "./create-canvas-saver.js";
import "./style.css";
import { setupThreeCanvas } from "./three-canvas.js";

const appElem = document.querySelector("#app");

if (!appElem) {
  throw new Error("App element not found");
}

appElem.innerHTML = `
<div class="canvas-container" style="flex-grow: 1; width: 100%; max-height: 100%; display: flex; justify-content: center; align-items: center;">
<canvas class="three-canvas" style="max-width: 100%; width: 100%; max-height: 100%; height: 100%;"></canvas>
</div>
`;

const canvasContainerElem = document.querySelector(".canvas-container");

if (!canvasContainerElem || !(canvasContainerElem instanceof HTMLElement)) {
  throw new Error("Canvas container element not found");
}

const canvasElem = canvasContainerElem.querySelector(".three-canvas");

if (!canvasElem || !(canvasElem instanceof HTMLCanvasElement)) {
  throw new Error("Canvas element not found");
}

const { onKeyDown } = createCanvasSaver(canvasElem);
window.addEventListener("keydown", onKeyDown);

const { dispose } = setupThreeCanvas(canvasElem, canvasContainerElem);

// Optional: expose for Vite HMR debugging
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    dispose();
    window.removeEventListener("keydown", onKeyDown);
  });
}
