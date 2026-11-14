// WCAG 2.2 contrast between two tokens in a theme; the contrast test and the docs Themes page share it.
const channels = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// A translucent color is flattened onto what it sits on, as the browser draws it.
const flatten = ({ hex, alpha = 1 }, under) => {
  const top = channels(hex);
  const base = channels(under);
  return `#${top
    .map((v, i) =>
      Math.round(v * alpha + base[i] * (1 - alpha))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};

const luminance = (hex) => {
  const [r, g, b] = channels(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** The ratio of foreground on background, both token paths, in a theme (undefined for light). */
export const contrastRatio = (set, foreground, background, theme) => {
  const page = set.resolve("surface.page", theme).hex;
  const bg = flatten(set.resolve(background, theme), page);
  const fg = flatten(set.resolve(foreground, theme), bg);
  const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
};
