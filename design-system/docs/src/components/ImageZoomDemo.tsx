import { ImageZoom, type ImageZoomValue } from "@ui";
import { useEffect, useRef, useState } from "react";

const WIDTH = 160;
const HEIGHT = 120;
const CELLS = [
  [30, 28, 9],
  [72, 50, 12],
  [118, 30, 8],
  [50, 92, 10],
  [128, 88, 14],
  [96, 104, 6],
];

/** A made-up fluorescence image: dim noise with a few bright cells. */
function drawCells(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const image = ctx.createImageData(WIDTH, HEIGHT);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      let v = 20 + ((x * 7 + y * 13) % 17);
      for (const [cx, cy, r] of CELLS) {
        const d = Math.hypot(x - cx, y - cy) / r;
        if (d < 1) v = Math.max(v, 255 * (1 - d * d));
      }
      const i = (y * WIDTH + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
}

export default function ImageZoomDemo() {
  const [zoom, setZoom] = useState<ImageZoomValue>("fit");
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) drawCells(canvas.current);
  }, []);
  return (
    <ImageZoom
      label="Sample cells"
      width={WIDTH}
      height={HEIGHT}
      value={zoom}
      onChange={setZoom}
      viewWidth={560}
      viewHeight={360}
    >
      <canvas ref={canvas} width={WIDTH} height={HEIGHT} />
    </ImageZoom>
  );
}
