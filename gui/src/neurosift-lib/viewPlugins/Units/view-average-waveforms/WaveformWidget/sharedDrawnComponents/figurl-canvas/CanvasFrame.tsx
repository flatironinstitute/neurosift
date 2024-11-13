/*
    This file provides an element that collects Canvases into the same layout space. (Note, though,
    that dimensions of the Canvas elements are set externally--because they're passed in, not
    managed here--so nothing guarantees that the canvas elements will all actually overlap exactly
    with the div, if you chose to give them different widths/heights.)
    This allows drawing windows that use multiple canvases to avoid writing some boilerplate code.
    It also encapsulates the ability to turn off interactivity, by using a 'disableHandlers'
    parameter to control whether to conditionally render the list of event handlers.
    If you have a specific use case that requires disabling some event handlers but not others,
    that's' beyond the scope of this solution as currently written--you'd need to write
    some additional code for it.
*/

type MaybeCanvas = JSX.Element | boolean;

// eslint-disable-next-line @typescript-eslint/ban-types
interface CanvasFrameProps<T extends {}> {
  width: number;
  height: number;
  canvases: MaybeCanvas[];
  disableHandlers?: boolean;
  handlers?: T;
  // Not sure if we need these parameters--probably would've been better not to implement, but...
  leftOffset?: number;
  topOffset?: number;
}

// eslint-disable-next-line @typescript-eslint/ban-types
const CanvasFrame = <T extends {}>(props: CanvasFrameProps<T>) => {
  const {
    width,
    height,
    canvases,
    disableHandlers,
    handlers,
    leftOffset,
    topOffset,
  } = props;
  return (
    <div
      style={{
        width: width,
        height: height,
        position: "relative",
        left: leftOffset ?? 0,
        top: topOffset ?? 0,
      }}
      {...(!disableHandlers ? handlers && { ...handlers } : {})}
    >
      {canvases}
    </div>
  );
};

export default CanvasFrame;
