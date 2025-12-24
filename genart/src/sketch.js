// biome-ignore lint/suspicious/noTsIgnore: <explanation> We need to ignore this import for TS checking.
// @ts-ignore
const canvasSketch = require("canvas-sketch");

const settings = {
  // duration: 5,
  // animate: true,
  // dimensions: [512, 512],
  // dimensions: [16, 20],
  dimensions: "A4",
  orientation: "portrait",
  units: "cm",
  // dimensions: "A4",
  pixelsPerInch: 300,
};

/**
 * @typedef {{
 *   context: CanvasRenderingContext2D;
 *   width: number;
 *   height: number;
 *   time: number;
 *   playhead: number;
 * }} Props
 */

const sketch = () => {
  /** @param {Props} props */
  return ({ context: ctx, width, height, playhead }) => {
    // context.fillStyle = "hsl(0, 0%, 95%)";
    // context.fillRect(0, 0, width, height);

    // const x = width / 2;
    // const y = height / 2;
    // const radius = width * 0.25;
    // const start = Math.sin(playhead * Math.PI * 2) * Math.PI;
    // const end =
    //   start +
    //   Math.PI / 2 +
    //   Math.sin(playhead * Math.PI * 2 + Math.PI / 2) * Math.PI * 0.4;
    // const thickness =
    //   width * 0.01 +
    //   (Math.sin(playhead * Math.PI * 2) * 0.5 + 0.5) * width * 0.05;

    // context.beginPath();
    // context.arc(x, y, radius, start, end, false);
    // context.lineWidth = thickness;
    // context.lineJoin = "round";
    // context.lineCap = "round";
    // context.strokeStyle = "tomato";
    // context.stroke();
    ctx.fillStyle = "orange";
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.5, 1, 0, Math.PI * 2, false);
    ctx.fillStyle = "purple";
    ctx.fill();
    ctx.lineWidth = 0.1;
    ctx.strokeStyle = "black";
    ctx.stroke();
  };
};

canvasSketch(sketch, settings);
