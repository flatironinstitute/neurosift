export { default as BaseCanvas } from "./BaseCanvas";
export type { DrawFn } from "./BaseCanvas";
export {
  use2DTransformationMatrix,
  useAspectTrimming,
} from "./CanvasTransforms";
export type { TwoDTransformProps } from "./CanvasTransforms";
export {
  default as DragCanvas,
  dragReducer,
  handleMouseDownIfDragging,
  handleMouseMoveIfDragging,
  handleMouseUpIfDragging,
} from "./DragCanvas";
export type { DragAction, DragState } from "./DragCanvas";
export { default as funcToTransform } from "./funcToTransform";
export {
  getHeight,
  getWidth,
  pointInRect,
  pointSpanToRegion,
  rectangularRegionsIntersect,
  transformPoint,
  transformPoints,
} from "./Geometry";
export type {
  Margins,
  RectangularRegion,
  TransformationMatrix,
  Vec2,
  Vec4,
} from "./Geometry";
