import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ElectrodeGeometryWidgetProps = {
  width: number;
  height: number;
  electrodeLocations: ElectrodeLocation[];
  electrodeRegions?: string[];
  colors?: string[];
  deadElectrodeIndices?: number[];
  range?: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
  units?: {
    unitId: number | string;
    x: number;
    y: number;
  }[];
};

export type ElectrodeLocation = {
  channelId: number | string;
  x: number;
  y: number;
};

const ElectrodeGeometryWidget: FunctionComponent<
  ElectrodeGeometryWidgetProps
> = ({
  width,
  height,
  electrodeLocations,
  electrodeRegions,
  colors,
  deadElectrodeIndices,
  range,
  units,
}) => {
  const [hoveredElectrodeIndices, setHoveredElectrodeIndices] = useState<
    number[] | undefined
  >(undefined);

  const [hoveredUnitIndices, setHoveredUnitIndices] = useState<
    number[] | undefined
  >(undefined);

  const doTranspose = useMemo(() => {
    const { xmin, xmax, ymin, ymax } = getBounds(electrodeLocations);
    const xspan = xmax - xmin;
    const yspan = ymax - ymin;
    return shouldTranspose(xspan, yspan, width, height);
  }, [electrodeLocations, width, height]);

  const outlineColors = useMemo(() => {
    if (!electrodeRegions) return undefined;
    const uniqueRegions = Array.from(new Set(electrodeRegions));
    uniqueRegions.sort();
    const regionIndices: number[] = [];
    for (let i = 0; i < electrodeRegions.length; i++) {
      const region = electrodeRegions[i];
      regionIndices.push(uniqueRegions.indexOf(region));
    }
    return regionIndices.map((i) => getColorForIndex(i));
  }, [electrodeRegions]);

  const locations2: ElectrodeLocation[] = useMemo(() => {
    if (!doTranspose) return electrodeLocations;
    else
      return electrodeLocations.map((loc) => ({ ...loc, x: loc.y, y: loc.x }));
  }, [doTranspose, electrodeLocations]);

  const units2 = useMemo(() => {
    if (!units) return undefined;
    return units.map((unit) => {
      if (!doTranspose) return unit;
      else return { ...unit, x: unit.y, y: unit.x };
    });
  }, [doTranspose, units]);

  const { xmin, xmax, ymin, ymax } = useMemo(() => {
    if (range) {
      if (doTranspose) {
        return {
          xmin: range.yMin,
          xmax: range.yMax,
          ymin: range.xMin,
          ymax: range.xMax,
        };
      } else {
        return {
          xmin: range.xMin,
          xmax: range.xMax,
          ymin: range.yMin,
          ymax: range.yMax,
        };
      }
    } else {
      return getBounds(locations2);
    }
  }, [range, locations2, doTranspose]);

  const scaleBarHeight = 30;
  const { isotropicScale, xPixelOffset, yPixelOffset, markerPixelRadius } =
    useMemo(() => {
      // we will determine the xPixelMargin and yPixelMargin after the first pass once we find the markerRadius
      let markerPixelRadius = 0;
      const xspan = xmax - xmin;
      const yspan = ymax - ymin;
      const coordSpacing = medianDistanceToNearestNeighbor(locations2);
      for (const pass of [1, 2]) {
        const xPixelMarginLeft = markerPixelRadius + 2;
        const xPixelMarginRight = markerPixelRadius + 2;
        const yPixelMarginTop = markerPixelRadius + 2;
        const yPixelMarginBottom = markerPixelRadius + 2 + scaleBarHeight;
        const W = width - xPixelMarginLeft - xPixelMarginRight;
        const H = height - yPixelMarginTop - yPixelMarginBottom;
        const xratio = W / xspan;
        const yratio = H / yspan;
        const isotropicScale = Math.min(xratio, yratio);
        const xPixelOffset =
          xPixelMarginLeft + (W - xspan * isotropicScale) / 2;
        const yPixelOffset = yPixelMarginTop + (H - yspan * isotropicScale) / 2;
        const pixelSpacing = coordSpacing * isotropicScale;
        markerPixelRadius = Math.max(1, Math.floor((pixelSpacing / 2) * 0.8));
        if (pass === 2) {
          return {
            isotropicScale,
            xPixelOffset,
            yPixelOffset,
            markerPixelRadius,
          };
        }
      }
      throw Error("Unexpected");
    }, [locations2, width, height, xmin, xmax, ymin, ymax]);

  const coordToPixel = useMemo(
    () => (x: number, y: number) => {
      const xp = xPixelOffset + (x - xmin) * isotropicScale;
      const yp = yPixelOffset + (y - ymin) * isotropicScale;
      return { xp, yp };
    },
    [xPixelOffset, yPixelOffset, xmin, ymin, isotropicScale],
  );

  const pixelToCoord = useMemo(
    () => (xp: number, yp: number) => {
      const x = xmin + (xp - xPixelOffset) / isotropicScale;
      const y = ymin + (yp - yPixelOffset) / isotropicScale;
      return { x, y };
    },
    [xPixelOffset, yPixelOffset, xmin, ymin, isotropicScale],
  );

  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >(undefined);

  useEffect(() => {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    for (let i = 0; i < locations2.length; i++) {
      const loc = locations2[i];
      if (loc.x < xmin || loc.x > xmax || loc.y < ymin || loc.y > ymax) {
        continue;
      }
      const { xp, yp } = coordToPixel(loc.x, loc.y);
      if (outlineColors) {
        ctx.strokeStyle = outlineColors[i];
      }
      ctx.strokeStyle = "black";
      ctx.beginPath();
      ctx.arc(xp, yp, markerPixelRadius, 0, 2 * Math.PI);
      ctx.stroke();
      let textFillStyle = "black";
      if (hoveredElectrodeIndices && hoveredElectrodeIndices.includes(i)) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        textFillStyle = "white";
        ctx.fill();
      } else {
        if (colors) {
          ctx.fillStyle = colors[i];
          textFillStyle = contrastColor(colors[i]);
          ctx.fill();
        } else {
          ctx.fillStyle = "white";
          textFillStyle = "black";
          ctx.fill();
        }
      }
      const text = `${locations2[i].channelId}`;
      ctx.font = `${markerPixelRadius}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = textFillStyle;
      ctx.fillText(text, xp, yp);

      if (deadElectrodeIndices && deadElectrodeIndices.includes(i)) {
        ctx.strokeStyle = "gray";
        ctx.lineWidth = 2;
        const dd = 1;
        ctx.beginPath();
        ctx.moveTo(xp - markerPixelRadius - dd, yp - markerPixelRadius - dd);
        ctx.lineTo(xp + markerPixelRadius + dd, yp + markerPixelRadius + dd);
        ctx.moveTo(xp - markerPixelRadius - dd, yp + markerPixelRadius + dd);
        ctx.lineTo(xp + markerPixelRadius + dd, yp - markerPixelRadius - dd);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
    if (units2) {
      for (let i = 0; i < units2.length; i++) {
        const unit = units2[i];
        const { xp, yp } = coordToPixel(unit.x, unit.y);
        ctx.strokeStyle = "lightgreen";
        ctx.fillStyle = "darkgreen";
        let rad = 4;
        if (hoveredUnitIndices && hoveredUnitIndices.includes(i)) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
          rad = 6;
        }
        ctx.beginPath();
        ctx.arc(xp, yp, rad, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    function drawScaleBar() {
      if (!ctx) return;
      const { yp: yMaxP } = coordToPixel(0, ymax);
      let scaleBarNumMicrons = 100;
      if (xmax - xmin < 200) {
        scaleBarNumMicrons = 20;
      }
      if (xmax - xmin < 40) {
        scaleBarNumMicrons = 10;
      }
      const pixelWidth = scaleBarNumMicrons * isotropicScale;
      // center horizontally
      const xOffset = (width - pixelWidth) / 2;
      const x1 = xOffset;
      const x2 = xOffset + pixelWidth;
      // const y1 = yp - scaleBarHeight + 5
      // const y2 = yp - scaleBarHeight + 5
      const y1 = yMaxP + markerPixelRadius + 10;
      const y2 = yMaxP + markerPixelRadius + 10;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`${scaleBarNumMicrons} μm`, (x1 + x2) / 2, y2 + 5);
    }
    drawScaleBar();
  }, [
    canvasElement,
    width,
    height,
    locations2,
    markerPixelRadius,
    hoveredElectrodeIndices,
    isotropicScale,
    coordToPixel,
    ymin,
    ymax,
    colors,
    outlineColors,
    xmax,
    xmin,
    deadElectrodeIndices,
    units2,
    hoveredUnitIndices,
  ]);

  const handleMouseMove = useCallback(
    (evt: React.MouseEvent) => {
      const { x, y } = pixelToCoord(
        evt.nativeEvent.offsetX,
        evt.nativeEvent.offsetY,
      );
      const hoveredElectrodeIndices = getElectrodeIndicesAt(
        locations2,
        x,
        y,
        markerPixelRadius / isotropicScale / 0.8,
      );
      setHoveredElectrodeIndices(hoveredElectrodeIndices);

      const hoveredUnitIndices = getUnitIndicesAt(units2 || [], x, y, 8);
      setHoveredUnitIndices(hoveredUnitIndices);
    },
    [pixelToCoord, locations2, markerPixelRadius, isotropicScale, units2],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredElectrodeIndices(undefined);
  }, []);

  const hoveredChannelIds = useMemo(() => {
    if (!hoveredElectrodeIndices) return undefined;
    return hoveredElectrodeIndices.map((i) => locations2[i].channelId);
  }, [hoveredElectrodeIndices, locations2]);

  const hoveredUnitIds = useMemo(() => {
    if (!hoveredUnitIndices) return undefined;
    return hoveredUnitIndices.map((i) => units2![i].unitId);
  }, [hoveredUnitIndices, units2]);

  const bottomBarHeight = 30;
  return (
    <div
      style={{ position: "relative", width, height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={(elmt) => elmt && setCanvasElement(elmt)}
        width={width}
        height={height - bottomBarHeight}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: bottomBarHeight,
          width,
        }}
      >
        <div style={{ padding: 5 }}>
          {hoveredChannelIds && hoveredChannelIds.length > 0 && (
            <>Electrode: {hoveredChannelIds.join(", ")}</>
          )}
          &nbsp;&nbsp;&nbsp;&nbsp;
          {hoveredUnitIds && hoveredUnitIds.length > 0 && (
            <>Unit: {hoveredUnitIds.join(", ")}</>
          )}
        </div>
      </div>
    </div>
  );
};

const getBounds = (locations: ElectrodeLocation[]) => {
  if (locations.length === 0) return { xmin: 0, xmax: 0, ymin: 0, ymax: 0 };
  let xmin: number | undefined;
  let xmax: number | undefined;
  let ymin: number | undefined;
  let ymax: number | undefined;
  for (const loc of locations) {
    if (!isNaN(loc.x) && !isNaN(loc.y)) {
      xmin = xmin === undefined ? loc.x : Math.min(xmin, loc.x);
      xmax = xmax === undefined ? loc.x : Math.max(xmax, loc.x);
      ymin = ymin === undefined ? loc.y : Math.min(ymin, loc.y);
      ymax = ymax === undefined ? loc.y : Math.max(ymax, loc.y);
    }
  }
  return { xmin: xmin || 0, xmax: xmax || 0, ymin: ymin || 0, ymax: ymax || 0 };
};

const shouldTranspose = (
  xspan: number,
  yspan: number,
  width: number,
  height: number,
) => {
  const scale1 = Math.min(width / xspan, height / yspan);
  const scale2 = Math.min(width / yspan, height / xspan);
  return scale2 > scale1;
};

const medianDistanceToNearestNeighbor = (locations: ElectrodeLocation[]) => {
  const distances: number[] = [];
  for (let i = 0; i < locations.length; i++) {
    const loc1 = locations[i];
    if (isNaN(loc1.x) || isNaN(loc1.y)) continue;
    let minDist = Infinity;
    for (let j = 0; j < locations.length; j++) {
      if (i === j) continue;
      const loc2 = locations[j];
      if (isNaN(loc2.x) || isNaN(loc2.y)) continue;
      const dist = Math.sqrt(
        Math.pow(loc1.x - loc2.x, 2) + Math.pow(loc1.y - loc2.y, 2),
      );
      if (dist > 0) {
        minDist = Math.min(minDist, dist);
      }
    }
    distances.push(minDist);
  }
  distances.sort();
  return distances[Math.floor(distances.length / 2)];
};

const getElectrodeIndicesAt = (
  locations: ElectrodeLocation[],
  x: number,
  y: number,
  maxDist: number,
) => {
  const ret: number[] = [];
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    const dist = Math.sqrt(Math.pow(loc.x - x, 2) + Math.pow(loc.y - y, 2));
    if (dist <= maxDist) {
      ret.push(i);
    }
  }
  if (ret.length > 0) return ret;
  return undefined;
};

const getUnitIndicesAt = (
  units: { unitId: number | string; x: number; y: number }[],
  x: number,
  y: number,
  maxDist: number,
) => {
  const ret: number[] = [];
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const dist = Math.sqrt(Math.pow(unit.x - x, 2) + Math.pow(unit.y - y, 2));
    if (dist <= maxDist) {
      ret.push(i);
    }
  }
  if (ret.length > 0) return ret;
  return undefined;
};

const getColorForIndex = (i: number) => {
  const colors = [
    "black",
    "darkred",
    "darkgreen",
    "darkblue",
    "darkorange",
    "darkcyan",
    "darkmagenta",
    "darkyellow",
    "darkviolet",
  ];
  return colors[i % colors.length];
};

function hexToRgb(hex: string) {
  // Remove the leading '#' if present
  hex = hex.replace(/^#/, "");

  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  }

  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return [r, g, b];
}

function rgbStringToRgb(rgbString: string) {
  const match = rgbString.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*\d+\.?\d*)?\)/,
  );
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }
  return [0, 0, 0];
}

function luminance(r: number, g: number, b: number) {
  // Convert to luminance
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastColor(color: string) {
  let rgb: number[];

  if (color.startsWith("#")) {
    rgb = hexToRgb(color);
  } else if (color.startsWith("rgb")) {
    rgb = rgbStringToRgb(color);
  } else {
    // we won't resort to the following trick for now
    // const tempElement = document.createElement("div");
    // tempElement.style.color = color;
    // document.body.appendChild(tempElement);
    // const computedColor = window.getComputedStyle(tempElement).color;
    // document.body.removeChild(tempElement);
    // rgb = rgbStringToRgb(computedColor);
    return "black";
  }

  const lum = luminance(rgb[0], rgb[1], rgb[2]);

  // If the luminance is greater than 0.5, return black; otherwise, return white
  return lum > 0.5 ? "#000000" : "#FFFFFF";
}

export default ElectrodeGeometryWidget;
