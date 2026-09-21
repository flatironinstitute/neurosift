// Plot margins shared by the spectrogram canvas and the pan/zoom hit-testing in
// the view. Kept in its own module so the component file only exports a
// component (which keeps React Fast Refresh happy). The left margin holds the
// frequency axis and the right margin holds the colorbar; wheeling over either
// scrolls the page instead of zooming.
export const plotMargins = { top: 20, right: 76, bottom: 44, left: 64 };

export type PlotMargins = typeof plotMargins;
