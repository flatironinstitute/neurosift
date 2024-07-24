import { abs, inv, matrix, Matrix, multiply } from "mathjs";

// TODO: Most of this can probably be deleted as not used.

export type Margins = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type Vec2 = number[];
export const isVec2 = (x: any): x is Vec2 => {
  if (x && Array.isArray(x) && x.length === 2) {
    for (const a of x) {
      if (!isNumber(a)) return false;
    }
    return true;
  } else return false;
};

export type Vec3 = number[];
export const isVec3 = (x: any): x is Vec3 => {
  if (x && Array.isArray(x) && x.length === 3) {
    for (const a of x) {
      if (!isNumber(a)) return false;
    }
    return true;
  } else return false;
};

export type Vec4 = number[];
export const isVec4 = (x: any): x is Vec4 => {
  if (x && Array.isArray(x) && x.length === 4) {
    for (const a of x) {
      if (!isNumber(a)) return false;
    }
    return true;
  } else return false;
};

// Two-dimensional point in 3-dimensional (homogeneous-coordinate) vector space.
// For our purposes right now the perspective dimension (3rd position) should be 1, we're just using
// unit values to facilitate translations of points/figures, not for actual scaling
export type Vec2H = number[];
export const isVec2H = (x: any): x is Vec2H => {
  if (x && Array.isArray(x) && x.length === 3) {
    for (const a of x) {
      if (!isNumber(a)) return false;
    }
    return x[2] === 1;
  }
  return false;
};
export const homogenizeVec2 = (v: Vec2): Vec2H => {
  return [v[0], v[1], 1];
};
export const Vec2HToVector = (v: Vec2H): Matrix => {
  // mathjs uses geometric dimensions. If we pass a 1-dimensional array, the resulting
  // vector is treated as a column vector for matrix multiplication.
  return matrix(v);
};

export const pointIsInEllipse = (
  pt: Vec2 | Vec2H,
  center: Vec2 | Vec2H,
  xRadius: number,
  yRadius?: number,
): boolean => {
  yRadius = yRadius || xRadius;
  const dist =
    ((pt[0] - center[0]) / xRadius) ** 2 + ((pt[1] - center[1]) / yRadius) ** 2;
  return dist <= 1;
};

export type RectangularRegion = {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
};
export const isRectangularRegion = (x: any): x is RectangularRegion => {
  for (const prop of ["xmin", "xmax", "ymin", "ymax"]) {
    // eslint-disable-next-line no-prototype-builtins
    if (!x.hasOwnProperty(prop)) return false;
    if (!isNumber(x[prop])) return false;
  }
  if (x.xmin > x.xmax) return false;
  if (x.ymin > x.ymax) return false; // TODO: Delete this? It doesn't hold for pixelspace regions!
  return true;
};
export const rectsAreEqual = (a: RectangularRegion, b: RectangularRegion) => {
  if (!isRectangularRegion(a) || !isRectangularRegion(b)) return false;
  return (
    a.xmin === b.xmin &&
    a.xmax === b.xmax &&
    a.ymin === b.ymin &&
    a.ymax === b.ymax
  );
};
export const getWidth = (region: RectangularRegion): number => {
  return abs(region.xmax - region.xmin);
};
export const getHeight = (region: RectangularRegion): number => {
  return abs(region.ymax - region.ymin); // y-axis is inverted in conversion to pixelspace
};
export const getCenter = (region: RectangularRegion): Vec2 => {
  // Math.min() is used because we don't know if we're in pixelspace or not.
  // If we have converted to pixelspace, then ymin > ymax. But we can't just choose one,
  // because we want this function to work for both inverted and standard coordinate systems.
  return [
    region.xmin + getWidth(region) / 2,
    Math.min(region.ymin, region.ymax) + getHeight(region) / 2,
  ];
};
// Find the rectangle identified by 2 points, then return 4 numbers
// representing [x, y, width, height]
// where x & y are the upper left point of the rectangle
// & width and height are positive.
export const getRectFromPointPair = (pointA: Vec2, pointB: Vec2): Vec4 => {
  return [
    Math.min(pointA[0], pointB[0]),
    Math.min(pointA[1], pointB[1]),
    Math.abs(pointA[0] - pointB[0]),
    Math.abs(pointA[1] - pointB[1]),
  ];
};
export const pointSpanToRegion = (pointSpan: Vec4): RectangularRegion => {
  // expected: pointSpan will have form [0] = xmin, [1] = ymin, [2] = width, [3] = height
  return {
    xmin: pointSpan[0],
    ymin: pointSpan[1],
    xmax: pointSpan[0] + pointSpan[2],
    ymax: pointSpan[1] + pointSpan[3],
  };
};
export const rectangularRegionsIntersect = (
  r1: RectangularRegion,
  r2: RectangularRegion,
): boolean => {
  // R1 and R2 intersect IFF: (R1.ymin < R2.ymin < R1.ymax || R1.ymin < R2.ymax < R1.ymax) && (same, for the xs)
  // or the same, swapping R1 and R2. *BUT* that's a lot of comparisons. Easier to check if they DON'T intersect:
  // R1 and R2 DON'T intersect IFF: R1.ymin > R2.ymax, or R1.ymax < R2.ymin; or the same for the xs.
  if (r1.xmax < r2.xmin || r1.xmin > r2.xmax) return false;
  if (r1.ymax < r2.ymin || r1.ymin > r2.ymax) return false;
  return true;
};
export const pointInRect = (point: Vec2, rect: RectangularRegion): boolean => {
  return (
    rect.xmin < point[0] &&
    point[0] < rect.xmax &&
    Math.min(rect.ymin, rect.ymax) < point[1] &&
    point[1] < Math.max(rect.ymax, rect.ymin)
  );
};
export const getBoundingBoxForEllipse = (
  point: Vec2,
  xRadius: number,
  yRadius: number,
): RectangularRegion => {
  return {
    xmin: point[0] - xRadius,
    xmax: point[0] + xRadius,
    ymin: point[1] - yRadius,
    ymax: point[1] + yRadius,
  };
};

export type TransformationMatrix = Vec3[];
export const isTransformationMatrix = (x: any): x is TransformationMatrix => {
  if (x && Array.isArray(x) && x.length === 3) {
    for (const row of x) {
      if (!isVec3(row)) return false;
    }
    if (JSON.stringify(x[2]) === JSON.stringify([0, 0, 1])) return true;
  }
  return false;
};
export const toTransformationMatrix = (x: Matrix): TransformationMatrix => {
  if (JSON.stringify(x.size()) === JSON.stringify([3, 3])) {
    const asArray = x.toArray() as number[][];
    if (JSON.stringify(asArray[2]) === JSON.stringify([0, 0, 1])) {
      return asArray as TransformationMatrix;
    }
  }
  throw Error(`Matrix ${JSON.stringify(x)} is invalid as a transform matrix.`);
};
// Sets up the transformation matrix that converts from the default coordinate space to pixelspace.
// This matrix ALSO inverts the y-axis so that (0,0) is the bottom left corner of the coordinate
// space, even though it is the top left corner of the canvas/pixelspace.
export const getBasePixelTransformationMatrix = (
  pixelSpaceWidth: number,
  pixelSpaceHeight: number,
  newTargetSystem?: RectangularRegion,
): { matrix: TransformationMatrix; coords: RectangularRegion } => {
  if (!pixelSpaceWidth || !pixelSpaceHeight)
    throw Error(
      "Cannot build default transformation matrix with dimensions unset.",
    );
  const shape =
    pixelSpaceWidth === pixelSpaceHeight
      ? "square"
      : pixelSpaceWidth > pixelSpaceHeight
        ? "landscape"
        : "portrait";
  // compute aspect ratio: this ensures that any base coordinate system presents square pixels to
  // the user. Subsequent transforms could change this, but better not to draw warped out of the box
  const aspectRatio =
    Math.max(pixelSpaceWidth, pixelSpaceHeight) /
    Math.min(pixelSpaceWidth, pixelSpaceHeight);
  let coordRange = { xmin: 0, ymin: 0, xmax: 1, ymax: 1 };
  // in the event of non-square canvas, make the shorter side have unit dimension in default
  // coordinate space. So we get 1:1.6 rather than 0.625:1.
  if (shape !== "square") {
    if (shape === "landscape")
      coordRange = { ...coordRange, xmax: aspectRatio };
    if (shape === "portrait") coordRange = { ...coordRange, ymax: aspectRatio };
  }
  const systemsRatio = pixelSpaceWidth / coordRange.xmax;
  let matrix = [
    [systemsRatio, 0, 0],
    [0, -1 * systemsRatio, pixelSpaceHeight],
    [0, 0, 1],
  ] as any as TransformationMatrix;
  if (newTargetSystem) {
    matrix = getUpdatedTransformationMatrix(
      newTargetSystem,
      coordRange,
      matrix,
    );
    coordRange = newTargetSystem;
  }
  return { matrix: matrix, coords: coordRange };
};
export const getTransformationMatrix = (
  newSystem: RectangularRegion,
  targetRangeInCurrentSystem: RectangularRegion,
): TransformationMatrix => {
  const newWidth = getWidth(newSystem);
  const newHeight = getHeight(newSystem);
  const targetRegionWidth = getWidth(targetRangeInCurrentSystem);
  const targetRegionHeight = getHeight(targetRangeInCurrentSystem);

  // we want to build a matrix that converts points in the new system to points in the current system.
  // This is going to have four partitions: The upper left partition is a 2x2 scaling matrix, basically an identity
  // matrix with the x-scale and y-scale instead of unity. The upper right column is a 2x1 (column) vector which has
  // the (xmin, ymin)^T of the rectangle defining the window (within the current coordinate system) that we'll use.
  // Then on the bottom we have a 1x2 row of zeroes and a 1x1 'matrix' with a value of 1.
  const xscale = targetRegionWidth / newWidth;
  const yscale = targetRegionHeight / newHeight;
  const matrix = [
    [xscale, 0, targetRangeInCurrentSystem.xmin - newSystem.xmin * xscale],
    [0, yscale, targetRangeInCurrentSystem.ymin - newSystem.ymin * yscale],
    [0, 0, 1],
  ] as TransformationMatrix;
  return matrix;
};
export const getInverseTransformationMatrix = (
  t: TransformationMatrix,
): TransformationMatrix => {
  const tmatrix = matrix(t);
  const inverse = inv(tmatrix).toArray() as number[][];
  return inverse as TransformationMatrix;
};
export const getUpdatedTransformationMatrix = (
  newSystem: RectangularRegion,
  targetRangeInCurrentSystem: RectangularRegion,
  oldTransform: TransformationMatrix,
): TransformationMatrix => {
  // transforming from a coordinate system to pixelspace is written as Ax = b, where:
  // b is the (homogeneous) vector in pixel space
  // x is the (homogeneous) vector in the current coordinate system
  // A is the transformation matrix converting x to b.
  // If we have current transformation A mapping vectors x to pixelspace b, and we want a
  // new transformation T mapping new vectors w to pixelspace vectors b, then this is:
  //      T = AB
  // where B maps vectors w (in the 'new' system) to x (the 'current' coordinate system).
  // (Let Bw = x --> A(Bw) = A(x) [= b] --> (AB)w = b; T = AB, then Tw = b. QED.)
  // This function computes T from A and B and returns a copy of the current CanvasPainter with #transformMatrix set to T.
  const newTransform = getTransformationMatrix(
    newSystem,
    targetRangeInCurrentSystem,
  );
  const A = matrix(oldTransform);
  const B = matrix(newTransform);
  const T = multiply(A, B);
  return toTransformationMatrix(T);
};
export const transformXY = (
  tmatrix: TransformationMatrix,
  x: number,
  y: number,
): Vec2H => {
  return transformPoint(tmatrix, homogenizeVec2([x, y]));
};

export const transformPoint = (
  tmatrix: TransformationMatrix,
  point: Vec2H,
): Vec2H => {
  // append a 1 if needed
  if (point.length === 2) point = [point[0], point[1], 1];
  const A = matrix(tmatrix);
  const x = matrix(point);
  const b = multiply(A, x);
  return b.toArray() as Vec2H;
};

// TODO: MOVE THIS SOMEWHERE MORE GENERAL
const zip = (a: any[], b: any[]) => {
  return a.map((k, i) => [k, b[i]]);
};

// use vectorized operation to transform a collection of points from a data space into a common target space.
// Used for e.g. mass-converting data points into pixelspace.
export const transformPoints = (
  tmatrix: TransformationMatrix,
  points: Vec2[],
): Vec2[] => {
  const A = matrix(tmatrix);
  const x = matrix([
    points.map((p) => p[0]),
    points.map((p) => p[1]),
    points.map((p) => 1),
  ]);
  const [xvalues, yvalues] = multiply(A, x).toArray() as number[][];
  // assert xvalues.length = yvalues.length
  return zip(xvalues, yvalues);
};

export const transformRect = (
  tmatrix: TransformationMatrix,
  rect: RectangularRegion,
): RectangularRegion => {
  const A = matrix(tmatrix);
  const corners = matrix([
    [rect.xmin, rect.xmax],
    [rect.ymin, rect.ymax],
    [1, 1],
  ]); // note these are manually transposed column vectors.
  const newCorners = multiply(A, corners).toArray() as number[][];
  // And the result is also column vectors, so we want [0][0] = new xmin, [1][0] = new ymin, [0][1] = new xmax, [1][1] = new ymax
  const x1 = newCorners[0][0];
  const x2 = newCorners[0][1];
  const y1 = newCorners[1][0];
  const y2 = newCorners[1][1];
  return {
    xmin: Math.min(x1, x2),
    xmax: Math.max(x1, x2),
    ymin: Math.min(y1, y2),
    ymax: Math.max(y1, y2),
  };
};

export const transformDistance = (
  tmatrix: TransformationMatrix,
  xyDist: Vec2,
): Vec2 => {
  // if transforming a distance, we actually want to set the perspective dimension (the w of the
  // [x, y, w] vector) to 0, so the transform matrix applies scaling without transposition.
  const A = matrix(tmatrix);
  const x = matrix([xyDist[0], xyDist[1], 0]);
  const b = multiply(A, x);
  const scaled = abs(b).toArray() as number[]; // take absolute value to ensure we don't get negative distances
  return [scaled[0], scaled[1]];
};

export const isNumber = (x: any): x is number => {
  return x !== null && x !== undefined && typeof x === "number";
};

export const isString = (x: any): x is string => {
  return x !== null && x !== undefined && typeof x === "string";
};
