// A small set of perceptual-ish colormaps for the spectrogram.
// Each returns [r, g, b] (0-255) for a normalized value in [0, 1].

type Rgb = [number, number, number];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Viridis approximation via piecewise-linear control points.
const VIRIDIS_STOPS: Rgb[] = [
  [68, 1, 84],
  [72, 40, 120],
  [62, 74, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [110, 206, 88],
  [181, 222, 43],
  [253, 231, 37],
];

const MAGMA_STOPS: Rgb[] = [
  [0, 0, 4],
  [28, 16, 68],
  [79, 18, 123],
  [129, 37, 129],
  [181, 54, 122],
  [229, 80, 100],
  [251, 135, 97],
  [254, 194, 135],
  [252, 253, 191],
];

const interpStops = (stops: Rgb[], value: number): Rgb => {
  const v = clamp01(value) * (stops.length - 1);
  const i0 = Math.floor(v);
  const i1 = Math.min(i0 + 1, stops.length - 1);
  const frac = v - i0;
  const a = stops[i0];
  const b = stops[i1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * frac),
    Math.round(a[1] + (b[1] - a[1]) * frac),
    Math.round(a[2] + (b[2] - a[2]) * frac),
  ];
};

const grayscale = (value: number): Rgb => {
  const g = Math.round(clamp01(value) * 255);
  return [g, g, g];
};

// Diverging blue-white-red (RdBu reversed), for baseline/z-score modes where
// zero (mid) should read as neutral and sign matters.
const DIVERGING_STOPS: Rgb[] = [
  [5, 48, 97],
  [33, 102, 172],
  [67, 147, 195],
  [146, 197, 222],
  [209, 229, 240],
  [247, 247, 247],
  [253, 219, 199],
  [244, 165, 130],
  [214, 96, 77],
  [178, 24, 43],
  [103, 0, 31],
];

export type ColormapName = "viridis" | "magma" | "grayscale" | "diverging";

export const colormapNames: ColormapName[] = [
  "viridis",
  "magma",
  "grayscale",
  "diverging",
];

// Sequential colormaps suitable for raw power; diverging is reserved for
// signed (baseline/z-score) data.
export const sequentialColormapNames: ColormapName[] = [
  "viridis",
  "magma",
  "grayscale",
];

export const applyColormap = (name: ColormapName, value: number): Rgb => {
  switch (name) {
    case "magma":
      return interpStops(MAGMA_STOPS, value);
    case "grayscale":
      return grayscale(value);
    case "diverging":
      return interpStops(DIVERGING_STOPS, value);
    case "viridis":
    default:
      return interpStops(VIRIDIS_STOPS, value);
  }
};
