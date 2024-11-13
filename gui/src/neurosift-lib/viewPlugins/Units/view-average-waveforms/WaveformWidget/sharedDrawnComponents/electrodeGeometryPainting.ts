import { AffineTransform } from "../../../../../misc/AffineTransform";
import { PixelSpaceElectrode } from "./ElectrodeGeometry";

export type ElectrodeColors = {
  border: string;
  base: string;
  selected: string;
  hover: string;
  selectedHover: string;
  dragged: string;
  draggedSelected: string;
  dragRect: string;
  textLight: string;
  textDark: string;
};

export const defaultColors: ElectrodeColors = {
  border: "rgb(30, 30, 30)",
  base: "rgb(0, 0, 255)",
  selected: "rgb(50, 200, 50)",
  hover: "rgb(128, 128, 255)",
  selectedHover: "rgb(200, 200, 196)",
  dragged: "rgb(0, 0, 196)",
  draggedSelected: "rgb(180, 180, 150)",
  dragRect: "rgba(196, 196, 196, 0.5)",
  textLight: "rgb(228, 228, 228)",
  textDark: "rgb(32, 32, 32)",
};

export type PaintProps = {
  pixelElectrodes: PixelSpaceElectrode[];
  selectedElectrodeIds: (number | string)[];
  hoveredElectrodeId?: number | string;
  draggedElectrodeIds: (number | string)[];
  pixelRadius: number;
  showLabels: boolean;
  offsetLabels: boolean;
  layoutMode: "geom" | "vertical";
  colors?: ElectrodeColors;
  xMargin: number;
  affineTransform?: AffineTransform;
  // omitting hideElectrodes b/c what are we drawing if we don't draw electrodes??
};

const circle = 2 * Math.PI;

export const paint = (ctxt: CanvasRenderingContext2D, props: PaintProps) => {
  const { layoutMode, affineTransform } = props;
  ctxt.save();
  if (affineTransform) {
    const ff = affineTransform.forward;
    ctxt.transform(ff[0][0], ff[1][0], ff[0][1], ff[1][1], ff[0][2], ff[1][2]);
  }
  layoutMode === "geom"
    ? paintGeometryView(ctxt, props)
    : paintVertical(ctxt, props);
  ctxt.restore();
};

const paintVertical = (ctxt: CanvasRenderingContext2D, props: PaintProps) => {
  const { pixelElectrodes, pixelRadius, showLabels, xMargin } = props;
  const useLabels = pixelRadius > 5 && showLabels;
  const colors = props.colors ?? defaultColors;

  // One Em should be the pixel size of the font; numeric labels should fit in two ems' space
  const labelOffset = useLabels ? 2 * pixelRadius : 0;
  ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);
  const xmin = xMargin + labelOffset;
  const xmax = ctxt.canvas.width - xMargin;
  ctxt.beginPath();
  pixelElectrodes.forEach((e) => {
    ctxt.moveTo(xmin, e.pixelY);
    ctxt.lineTo(xmax, e.pixelY);
  });
  ctxt.strokeStyle = colors.border;
  ctxt.stroke();

  if (useLabels) {
    // In vertical mode, we should always use offset labels.
    // So dark text, aligned right, at a set offset from electrode
    const textRight = xmin - 0.5 * pixelRadius;
    ctxt.font = `${pixelRadius - 3}px Arial`; // Is this the right thing to do?
    ctxt.fillStyle = colors.textDark;
    ctxt.textAlign = "right";
    ctxt.textBaseline = "middle";
    pixelElectrodes.forEach((e) => {
      ctxt.fillText(`${e.e.label}`, textRight, e.pixelY);
    });
  }
};

const paintGeometryView = (
  ctxt: CanvasRenderingContext2D,
  props: PaintProps,
) => {
  const {
    pixelElectrodes,
    selectedElectrodeIds,
    hoveredElectrodeId,
    draggedElectrodeIds,
    pixelRadius,
    showLabels,
    offsetLabels,
  } = props;
  const useLabels = pixelRadius > 5 && showLabels;
  const colors = props.colors ?? defaultColors;

  // set up fills
  const electrodesWithColors = pixelElectrodes.map((e) => {
    const selected = selectedElectrodeIds.includes(e.e.id);
    const hovered = (hoveredElectrodeId ?? -1) === e.e.id;
    const dragged = draggedElectrodeIds.includes(e.e.id);
    const color = selected
      ? dragged
        ? colors.draggedSelected
        : hovered
          ? colors.selectedHover
          : colors.selected
      : dragged
        ? colors.dragged
        : hovered
          ? colors.hover
          : colors.base;
    return {
      ...e,
      color: color,
      textColor:
        selected || (hovered && !dragged) ? colors.textDark : colors.textLight,
    };
  });

  ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);
  // Draw fills
  // all-colors-at-once style: involves a lot fewer strokes & state resets but probably not enough to matter
  // (or to justify the extra complication of breaking out the electrodes into subgroups)
  // electrodesWithColors.sort((a, b) => { return a.color.localeCompare(b.color) })
  // let lastColor = ''
  // electrodesWithColors.forEach(e => {
  //     if (lastColor !== e.color) {
  //         ctxt.fill()
  //         lastColor = e.color
  //         ctxt.fillStyle = e.color
  //         ctxt.beginPath()
  //     }
  // })
  electrodesWithColors.forEach((e) => {
    ctxt.fillStyle = e.color;
    ctxt.beginPath();
    if (pixelRadius < 0) return;
    ctxt.ellipse(e.pixelX, e.pixelY, pixelRadius, pixelRadius, 0, 0, circle);
    ctxt.fill();
  });

  // Draw borders
  // ctxt.strokeStyle = colors.border
  // pixelElectrodes.forEach(e => {
  //     ctxt.beginPath()
  //     ctxt.ellipse(e.pixelX, e.pixelY, pixelRadius, pixelRadius, 0, 0, circle)
  //     ctxt.stroke()
  // })

  // draw electrode labels
  if (useLabels) {
    ctxt.font = `${pixelRadius}px Arial`;
    ctxt.textAlign = offsetLabels ? "right" : "center";
    ctxt.textBaseline = "middle";
    const xOffset = offsetLabels ? 1.4 * pixelRadius : 0;
    electrodesWithColors.forEach((e) => {
      ctxt.fillStyle = offsetLabels ? colors.textDark : e.textColor;
      ctxt.fillText(`${e.e.label}`, e.pixelX - xOffset, e.pixelY);
    });
  }
};
