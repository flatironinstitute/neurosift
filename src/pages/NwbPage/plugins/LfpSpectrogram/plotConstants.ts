// Plot margins shared by the spectrogram canvas and the pan/zoom hit-testing in
// the view. Kept in its own module so the component file only exports a
// component (which keeps React Fast Refresh happy).
export const plotMargins = { top: 20, right: 90, bottom: 44, left: 64 };

export type PlotMargins = typeof plotMargins;

// Split mode stacks one panel per channel, so reaching a distant channel means
// scrolling the page past a column of plots. Wheeling over the plot area zooms
// instead of scrolling, which leaves only the narrow gutters between panels as
// somewhere safe to point at. Widening the side margins in that mode turns the
// full height of both edges into that safe zone.
export const SPLIT_MODE_SIDE_MARGIN_SCALE = 2;

export const marginsForChannelMode = (
  channelMode: "mean" | "perChannel",
): PlotMargins =>
  channelMode === "perChannel"
    ? {
        ...plotMargins,
        left: plotMargins.left * SPLIT_MODE_SIDE_MARGIN_SCALE,
        right: plotMargins.right * SPLIT_MODE_SIDE_MARGIN_SCALE,
      }
    : plotMargins;
