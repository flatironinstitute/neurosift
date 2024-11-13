import { min, norm } from "mathjs";
import {
  funcToTransform,
  getHeight,
  getWidth,
  RectangularRegion,
  TransformationMatrix,
  transformPoints,
  Vec2,
} from "./figurl-canvas";
import {
  defaultMaxPixelRadius,
  Electrode,
  PixelSpaceElectrode,
} from "./ElectrodeGeometry";
import { getArrayMax, getArrayMin } from "./utility";

export const xMargin = 10;
const yMargin = 10;

export const computeElectrodesFromIdsAndLocations = (
  ids: (number | string)[],
  channelLocations?: { [key: string]: number[] },
): Electrode[] => {
  const locs = channelLocations || {};
  if (
    channelLocations &&
    (Object.keys(locs).length !== ids.length ||
      ids.some((id) => !locs[`${id}`]))
  ) {
    console.warn(
      `Attempt to compute electrode locations with mismatched lists. Skipping...`,
    );
    return [];
  }

  const electrodes = ids.map((id) => {
    const locationForElectrode = locs[`${id}`] || [id, 0];
    return {
      id,
      label: `${id}`,
      x: locationForElectrode[0],
      y: locationForElectrode[1],
    };
  });

  return electrodes;
};

const computeRadiusCache = new Map<string, number>();
const computeRadiusDataSpace = (electrodes: Electrode[]): number => {
  const key = JSON.stringify(electrodes);
  const val = computeRadiusCache.get(key);
  if (val !== undefined) {
    return val;
  }
  // how big should each electrode dot be? Really depends on how close
  // the dots are to each other. Let's find the closest pair of dots and
  // set the radius to 45% of the distance between them.
  let leastNorm = Number.MAX_VALUE;
  electrodes.forEach((point) => {
    electrodes.forEach((otherPoint) => {
      const dist = norm([point.x - otherPoint.x, point.y - otherPoint.y]);
      if (dist === 0) return;
      leastNorm = Math.min(leastNorm, dist as number);
    });
  });
  // (could set a hard cap, but remember these numbers are in electrode-space coordinates)
  const radius = 0.45 * leastNorm;
  computeRadiusCache.set(key, radius);
  return radius;
};

const getElectrodeSetBoundingBox = (
  electrodes: Electrode[],
  radius: number,
): RectangularRegion => {
  return {
    xmin: getArrayMin(electrodes.map((e) => e.x)) - radius,
    xmax: getArrayMax(electrodes.map((e) => e.x)) + radius,
    ymin: getArrayMin(electrodes.map((e) => e.y)) - radius,
    ymax: getArrayMax(electrodes.map((e) => e.y)) + radius,
  };
};

const getElectrodesAspectRatio = (electrodes: Electrode[]) => {
  const radius = computeRadiusDataSpace(electrodes);
  const boundingBox = getElectrodeSetBoundingBox(electrodes, radius);
  const boxWidth = getWidth(boundingBox);
  const boxHeight = getHeight(boundingBox);
  const boxCenter = {
    x: boxWidth / 2 + boundingBox.xmin,
    y: boxHeight / 2 + boundingBox.ymin,
  };
  const boxAspect = boxWidth / boxHeight;
  return { boxAspect, boxCenter };
};

const replaceEmptyLocationsWithDefaultLayout = (
  electrodes: Electrode[],
): Electrode[] => {
  // if the electrodes have no actual geometry information, then we'll arrange them
  // linearly in the order they were received.
  const electrodeGeometryRange = {
    xmin: getArrayMin(electrodes.map((e) => e.x)),
    xmax: getArrayMax(electrodes.map((e) => e.x)),
    ymin: getArrayMin(electrodes.map((e) => e.y)),
    ymax: getArrayMax(electrodes.map((e) => e.y)),
  };
  if (
    electrodeGeometryRange.xmin === electrodeGeometryRange.xmax &&
    electrodeGeometryRange.ymin === electrodeGeometryRange.ymax
  ) {
    return electrodes.map((e, ii) => {
      return { ...e, x: ii, y: 0 };
    });
  }
  return electrodes;
};

// For vertical layout, we're just going to draw into the canvas with default margins. No centering (?) or scaling.
const computeDataToPixelTransformVerticalLayout = (
  width: number,
  height: number,
) => {
  return funcToTransform((p: Vec2): Vec2 => {
    const x = xMargin + p[0] * (width - 2 * xMargin);
    const y = yMargin + p[1] * (height - 2 * yMargin);
    return [x, y];
  });
};

// NOTE: for vertical layout, radius is 1/(n+1) in dataspace.
// pixelradius is thus (canvas height less vertical margins) / n+1 (where n = # of electrodes).
const convertElectrodesToPixelSpaceVerticalLayout = (
  electrodes: Electrode[],
  transform: TransformationMatrix,
): PixelSpaceElectrode[] => {
  // for vertical layout, we ignore any actual location information (except for sorting) and just distribute the electrodes evenly over a column.
  // Do that here by resetting the processed electrode geometry into the assigned points.

  // Sort by y position in the geom layout
  // and define the points and pixel space points
  const sortedElectrodeInds = electrodes
    .map((e, ind) => ({ e, ind }))
    .sort((a, b) => -a.e.y + b.e.y)
    .map((a) => a.ind);
  const points: [number, number][] = [];
  for (let i = 0; i < electrodes.length; i++) {
    points.push([0, 0]);
  }
  for (let i = 0; i < sortedElectrodeInds.length; i++) {
    const ind = sortedElectrodeInds[i];
    points[ind] = [0.5, (0.5 + i) / (1 + electrodes.length)];
  }
  // const points = electrodesSorted
  //     .map((e, ii) => [0.5, (0.5 + ii)/(1 + electrodes.length)])
  const pixelspacePoints = transformPoints(transform, points);

  return electrodes.map((e, ii) => {
    const [pixelX, pixelY] = pixelspacePoints[ii];
    return {
      e: e,
      pixelX: pixelX,
      pixelY: pixelY,
    };
  });
};

const getScalingFactor = (
  width: number,
  height: number,
  radius: number,
  maxElectrodePixelRadius: number,
  electrodeLayoutBoundingBox: RectangularRegion,
) => {
  const widthExMargin = width - xMargin * 2;
  const heightExMargin = height - yMargin * 2;
  const electrodeBoxWidth = getWidth(electrodeLayoutBoundingBox);
  const electrodeBoxHeight = getHeight(electrodeLayoutBoundingBox);

  // We have some underlying electrode geometry and would like to scale it linearly to fill as much
  // of the available canvas space as possible without either clipping or distorting the aspect ratio.
  // Thus the scaling has to be set to the smallest of three factors:
  // - the scaling that will make the layout width equal the canvas width;
  // - the scaling that will make the layout height equal the canvas height;
  // - the scaling that will make the computed radius equal the max permitted radius.
  const scaleFactor: number = min(
    widthExMargin / electrodeBoxWidth,
    heightExMargin / electrodeBoxHeight,
    maxElectrodePixelRadius / radius,
  );
  return scaleFactor;
};

const computeDataToPixelTransform = (
  width: number,
  height: number,
  scaleFactor: number,
  electrodeLayoutBoundingBox: RectangularRegion,
) => {
  // We started assuming equal default margins, but that may not hold if the canvas & layout have different shapes.
  // So, to ensure we draw in the center of the canvas, we need to compute the new margins.
  // Do this by taking the scaled layout box out of the total area & splitting the leftover equally between
  // the margins on each side.
  // Since we computed scale using a default margin, the final margin will never be less than the default.
  const electrodeBoxWidth = getWidth(electrodeLayoutBoundingBox);
  const xMarginFinal = (width - electrodeBoxWidth * scaleFactor) / 2;

  // Note the need to invert the y-axis here.
  // We want to map -s * ymin -> h - ymargin, and -s * ymax -> ymargin. This will put the scaled minimum
  // data value at {pixel drawing margin} away from the figure bottom, and the scaled maximum data
  // value at {pixel drawing margin} away from the figure top.
  // So we need to scale by -scaleFactor and offset by some value Q, where:
  //    -s * ymin + Q = h - ymargin
  //    -s * ymax + Q = ymargin
  // Sum those:
  //    -s*ymin + -s*ymax + 2Q = h - ymargin + ymargin --> -s (ymin + ymax) + 2Q = h -->
  //           2Q = h + s (ymin + ymax)
  // So Q is half of (the height, plus the scaled sum of the extreme range values in the input data).
  // Observations:
  //  - This holds for any choice of y-margin, since that term cancels.
  //  - When the data extremes are symmetric around the x-axis -- i.e. ymin = -ymax -- that term cancels &
  //    it *looks* like we can just offset by half the drawing-space height. But this doesn't work for the general case.
  //  - In TimeScrollView, we used an offset Q = s * ymax -- this formula reduces to that one for the special case
  //    where s = h / (ymax - ymin), but that doesn't hold here since the scale factor s might be set by
  //    the drawing-space width or the maximum pixel radius.
  const xrow = [
    scaleFactor,
    0,
    xMarginFinal - electrodeLayoutBoundingBox.xmin * scaleFactor,
  ];
  const yrow = [
    0,
    -scaleFactor,
    (height +
      scaleFactor *
        (electrodeLayoutBoundingBox.ymin + electrodeLayoutBoundingBox.ymax)) /
      2,
  ];
  return [xrow, yrow, [0, 0, 1]] as TransformationMatrix;
};

const normalizeElectrodeLocations = (
  width: number,
  height: number,
  electrodes: Electrode[],
  opts: { disableAutoRotate?: boolean } = {},
): { electrodes: Electrode[]; rotated: boolean } => {
  const canvasAspectRatio = (width - xMargin * 2) / (height - yMargin * 2);
  const _electrodes = replaceEmptyLocationsWithDefaultLayout(electrodes);
  const { boxAspect: boxAspectRatio } = getElectrodesAspectRatio(_electrodes);
  if (
    opts.disableAutoRotate ||
    boxAspectRatio === 1 ||
    canvasAspectRatio === 1 ||
    boxAspectRatio > 1 === canvasAspectRatio > 1
  ) {
    // Aspect ratios (W/H) < 1 are portrait mode. > 1 are landscape.
    // If either source or target is a square, or if the canvas & native-space aspect ratios match,
    // then we don't need to do anything.
    return { electrodes, rotated: false };
  }
  // If the orientations don't match, we'll rotate the electrode set 90 degrees around the origin, which
  // is accomplished by setting new-x = old-y and new-y = negative old-x.
  return {
    electrodes: electrodes.map((e) => ({ ...e, x: e.y, y: -e.x })),
    rotated: true,
  };

  // We could also rotate around the center of the bounding box. We dono't actually need to, since the
  // conversion to pixelspace is indifferent to translations of the source data set.
  // But just in case it comes up in the future, here's how you would do that:
  //   1) Get a new location relative to the set center (by subtracting the original point from the center point)
  //   2) In those coordinates, rotate by setting new-x = old-y and new-y = negative old-x; and
  //   3) Recenter by adding in again the center point.
  // return electrodes.map((e) => {
  //     const relativeX = e.x - boxCenter.x
  //     const relativeY = e.y - boxCenter.y
  //     return {...e, x: relativeY + boxCenter.x, y: -relativeX + boxCenter.y }
  // })
};

const convertElectrodesToPixelSpace = (
  electrodes: Electrode[],
  transform: TransformationMatrix,
  pixelRadius: number,
): PixelSpaceElectrode[] => {
  const points = electrodes.map((e) => [e.x, e.y]);
  const pixelspacePoints = transformPoints(transform, points);
  // pixelRadius is only used to compute the 'transform' value, which we may not even use...
  return electrodes.map((e, ii) => {
    const [pixelX, pixelY] = pixelspacePoints[ii];
    // Again, per-electrode transform isn't actually needed for anything
    // const electrodeBoundingBox = getBoundingBoxForEllipse([pixelX, pixelY], pixelRadius, pixelRadius)
    return {
      e: e,
      pixelX: pixelX,
      pixelY: pixelY,
    };
  });
};

export const getElectrodeAtPoint = (
  electrodes: PixelSpaceElectrode[],
  pixelRadius: number,
  mouseLoc: Vec2,
) => {
  // Assumption: electrode regions do not overlap, thus being within the radius of one makes it impossible
  // to be in the radius of any other. So we use a for ... of loop, allowing early stopping.
  for (const e of electrodes) {
    // const dist = norm([point.x - otherPoint.x, point.y - otherPoint.y])
    if (
      (norm([e.pixelX - mouseLoc[0], e.pixelY - mouseLoc[1]]) as number) <
      pixelRadius
    )
      return e.e.id;
  }
  return undefined;
};

export const getDraggedElectrodeIds = (
  electrodes: PixelSpaceElectrode[],
  dragRect: RectangularRegion,
  pixelRadius: number,
): (number | string)[] => {
  // Rather than computing boundingboxes for each electrode, let's just expand the selection region by the
  // known pixel radius & check the electrode centers that are within the expanded selection box.
  const xmin = dragRect.xmin - pixelRadius;
  const xmax = dragRect.xmax + pixelRadius;
  const ymin = dragRect.ymin - pixelRadius;
  const ymax = dragRect.ymax + pixelRadius;
  return electrodes
    .filter(
      (e) =>
        e.pixelX > xmin &&
        e.pixelX < xmax &&
        e.pixelY > ymin &&
        e.pixelY < ymax,
    )
    .map((e) => e.e.id);
};

// Consumer cares about overall transform, electrode pixel locations, and pixel radius. That's all. Oh and I guess the x-margin for vertical mode.
export const computeElectrodeLocations = (
  canvasWidth: number,
  canvasHeight: number,
  electrodes: Electrode[],
  mode: "geom" | "vertical" = "geom",
  maxElectrodePixelRadius: number = defaultMaxPixelRadius,
  opts: { disableAutoRotate?: boolean },
) => {
  if (mode === "vertical") {
    const transform = computeDataToPixelTransformVerticalLayout(
      canvasWidth,
      canvasHeight,
    );
    const convertedElectrodes = convertElectrodesToPixelSpaceVerticalLayout(
      electrodes,
      transform,
    );
    const pixelRadius = (canvasHeight - 2 * yMargin) / (1 + electrodes.length);
    return {
      transform: transform,
      convertedElectrodes: convertedElectrodes,
      pixelRadius: pixelRadius,
    };
  }
  const { electrodes: normalizedElectrodes, rotated } =
    normalizeElectrodeLocations(canvasWidth, canvasHeight, electrodes, {
      disableAutoRotate: opts.disableAutoRotate,
    });
  const nativeRadius = computeRadiusDataSpace(normalizedElectrodes);

  const nativeBoundingBox = getElectrodeSetBoundingBox(
    normalizedElectrodes,
    nativeRadius,
  );
  const scaleFactor = getScalingFactor(
    canvasWidth,
    canvasHeight,
    nativeRadius,
    maxElectrodePixelRadius,
    nativeBoundingBox,
  );
  const pixelRadius = nativeRadius * scaleFactor;
  let transform = computeDataToPixelTransform(
    canvasWidth,
    canvasHeight,
    scaleFactor,
    nativeBoundingBox,
  );
  const xMarginFinal =
    (canvasWidth - getWidth(nativeBoundingBox) * scaleFactor) / 2;
  const convertedElectrodes = convertElectrodesToPixelSpace(
    normalizedElectrodes,
    transform,
    pixelRadius,
  );
  if (rotated) {
    transform = [
      [-transform[0][1], transform[0][0], transform[0][2]],
      [-transform[1][1], transform[1][0], transform[1][2]],
      [-transform[2][1], transform[2][0], transform[2][2]],
    ];
  }

  return {
    transform: transform,
    convertedElectrodes: convertedElectrodes,
    pixelRadius: pixelRadius,
    xMargin: xMarginFinal,
  };
};
