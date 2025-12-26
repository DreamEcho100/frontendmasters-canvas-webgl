// biome-ignore lint/suspicious/noTsIgnore: <explanation> We need to ignore this import for TS checking.
// @ts-ignore
import canvasSketch from "canvas-sketch";
// @ts-ignore
import { lerp } from "canvas-sketch-util/math";
// @ts-ignore
import random from "canvas-sketch-util/random";
// @ts-ignore
import palettes from "nice-color-palettes";

random.setSeed(random.getRandomSeed());
const randomSeed = random.getSeed();
console.log(`Random seed used here: ${randomSeed}`);
const settings = {
  suffix: randomSeed,
  // duration: 5,
  // animate: true,
  // dimensions: [512, 512],
  dimensions: [2048, 2048],
  // dimensions: [16, 20],
  // dimensions: "A4",
  // orientation: "portrait",
  // units: "cm",
  // dimensions: "A4",
  // pixelsPerInch: 300,
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
  /**
   * @param {number} count
   * @returns {{
   *  position: [u: number, v: number];
   *  radius: number;
   *  rotation: number;
   *  color: string;
   * }[]}
   */
  function createGrid(count) {
    const colorCount = random.rangeFloor(2, 6);
    const palette = random.shuffle(random.pick(palettes)).slice(0, colorCount);
    /**
     * @type {{
     *  position: [u: number, v: number]
     *  radius: number;
     *  rotation: number;
     *  color: string;
     * }[]}
     */
    const points = new Array(count * count);

    for (let x = 0; x < count; x++) {
      for (let y = 0; y < count; y++) {
        const u = (count <= 1 ? 0.5 : x) / (count - 1);
        const v = (count <= 1 ? 0.5 : y) / (count - 1);
        const randNoise2D = random.noise2D(u, v);
        points[x + y * count] = {
          position: [u, v],
          radius: Math.abs(randNoise2D) * 0.2, //Math.abs(random.gaussian() * 0.01 + 0.01),
          rotation: randNoise2D,
          color: random.pick(palette),
        };
      }
    }

    return points;
  }

  let points = createGrid(25);
  /** @type {typeof points} */
  const newPoints = [];
  for (let i = 0; i < points.length; i++) {
    if (random.value() >= 0.000001) {
      newPoints.push(/** @type {typeof points[number]} */ (points[i]));
    }
  }
  points = newPoints;

  /** @param {Props} props */
  return ({ context: ctx, width, height, playhead }) => {
    const margin = width * 0.1;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    // random.setSeed(512);

    for (const point of points) {
      const px = lerp(margin, width - margin, point.position[0]);
      const py = lerp(margin, height - margin, point.position[1]);
      // ctx.beginPath();
      // ctx.arc(px, py, point.radius * width, 0, Math.PI * 2, false);
      // ctx.fillStyle = point.color;
      // ctx.fill();

      ctx.save();
      ctx.fillStyle = point.color;
      ctx.font = `${point.radius * width}px "Helvetica"`;
      ctx.translate(px, py);
      ctx.rotate(point.rotation);
      ctx.fillText("=", 0, 0);
      ctx.restore();
    }
  };
};

canvasSketch(sketch, settings);
