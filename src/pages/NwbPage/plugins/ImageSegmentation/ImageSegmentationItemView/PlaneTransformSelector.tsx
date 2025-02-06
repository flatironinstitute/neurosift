type Props = {
  planeTransform: PlaneTransform;
  setPlaneTransform: (planeTransform: PlaneTransform) => void;
};

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

const PlaneTransformSelector = (props: Props) => {
  const topOffset = 6;
  return (
    <div style={{ display: "flex" }}>
      <input
        type="checkbox"
        checked={props.planeTransform.xyswap}
        onChange={(evt) =>
          props.setPlaneTransform({
            ...props.planeTransform,
            xyswap: evt.target.checked,
          })
        }
      />
      <div style={{ position: "relative", top: topOffset }}>
        <label>xy swap</label>
      </div>
      &nbsp;
      <input
        type="checkbox"
        checked={props.planeTransform.xflip}
        onChange={(evt) =>
          props.setPlaneTransform({
            ...props.planeTransform,
            xflip: evt.target.checked,
          })
        }
      />
      <div style={{ position: "relative", top: topOffset }}>
        <label>x flip</label>
      </div>
      &nbsp;
      <input
        type="checkbox"
        checked={props.planeTransform.yflip}
        onChange={(evt) =>
          props.setPlaneTransform({
            ...props.planeTransform,
            yflip: evt.target.checked,
          })
        }
      />
      <div style={{ position: "relative", top: topOffset }}>
        <label>y flip</label>
      </div>
      &nbsp;
    </div>
  );
};

export default PlaneTransformSelector;
