export type PlaneTransform = {
  xyswap: boolean;
  xflip: boolean;
  yflip: boolean;
};

export const defaultPlaneTransform: PlaneTransform = {
  xyswap: false,
  xflip: false,
  yflip: false,
};
