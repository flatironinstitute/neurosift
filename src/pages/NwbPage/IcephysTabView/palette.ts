// Shared color palettes for the icephys family overlay and the temporal
// distribution view, so a sweep gets the same color in both places.

// Sequential palette (ColorBrewer single-hue Blues, 9-class with the lightest
// stop dropped to keep traces visible on a white background). Used for ordered
// groups (sweep index within a Protocol).
export const BLUES = [
  "#deebf7",
  "#c6dbef",
  "#9ecae1",
  "#6baed6",
  "#4292c6",
  "#2171b5",
  "#08519c",
  "#08306b",
];

export function sequential(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  if (t > 1) t = 1;
  const index = Math.round(t * (BLUES.length - 1));
  return BLUES[index];
}

// Categorical palette (Okabe-Ito) for unordered groups (Protocol identity).
export const OKABE_ITO = [
  "#E69F00", // orange
  "#56B4E9", // sky blue
  "#009E73", // bluish green
  "#F0E442", // yellow
  "#0072B2", // blue
  "#D55E00", // vermilion
  "#CC79A7", // reddish purple
  "#000000", // black
];

export function categorical(i: number): string {
  return OKABE_ITO[
    ((i % OKABE_ITO.length) + OKABE_ITO.length) % OKABE_ITO.length
  ];
}

// Build a sequential ramp from a single base hue: light tint (t=0) to a darker
// shade (t=1). Used so a "separate panels" gradient stays in the panel group's
// categorical color, keeping it consistent with the overlay's Color-by encoding.
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function mix(
  a: [number, number, number],
  b: [number, number, number],
  f: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}
function rgbToHex(c: [number, number, number]): string {
  return (
    "#" +
    c
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

// Stable numeric id for a string key (e.g. an electrode label) so it can be
// used where numeric group ids are expected. Color is assigned by
// first-appearance order, not by this value, so it just needs to be unique.
const internMap = new Map<string, number>();
export function internId(s: string): number {
  let id = internMap.get(s);
  if (id === undefined) {
    id = internMap.size;
    internMap.set(s, id);
  }
  return id;
}

export function shadesOf(baseHex: string, t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  if (t > 1) t = 1;
  const base = hexToRgb(baseHex);
  const light = mix(base, [255, 255, 255], 0.55); // toward white
  const dark = mix(base, [0, 0, 0], 0.3); // toward black
  return rgbToHex(mix(light, dark, t));
}

// Assign a stable (groupId -> color) map given the first-appearance order of
// groups, matching the family overlay's logic so colors agree across views.
//   groupBy "sweep"    -> sequential Blues, compressed toward the dark end for
//                         small families so the lightest stop stays visible.
//   groupBy "protocol" -> categorical Okabe-Ito.
export function colorsForGroups(
  order: number[],
  groupBy: "protocol" | "sweep" | "condition" | "repetition" | "electrode",
): Map<number, string> {
  const n = order.length;
  const tMin = Math.max(0, (5 - n) / 10);
  const out = new Map<number, string>();
  order.forEach((id, i) => {
    if (groupBy === "sweep") {
      const u = n > 1 ? i / (n - 1) : 0;
      out.set(id, sequential(tMin + u * (1 - tMin)));
    } else {
      out.set(id, categorical(i));
    }
  });
  return out;
}
