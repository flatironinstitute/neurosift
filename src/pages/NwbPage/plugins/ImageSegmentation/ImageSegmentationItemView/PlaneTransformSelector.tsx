import { Checkbox } from "@ui";
import type { PlaneTransform } from "./planeTransform";
import "./PlaneTransformSelector.css";

type Props = {
  planeTransform: PlaneTransform;
  setPlaneTransform: (planeTransform: PlaneTransform) => void;
};

/** How the image is turned: swap x and y, flip either axis. */
const PlaneTransformSelector = ({
  planeTransform,
  setPlaneTransform,
}: Props) => {
  const set = (key: keyof PlaneTransform) => (on: boolean) =>
    setPlaneTransform({ ...planeTransform, [key]: on });
  return (
    <fieldset className="plane-transform">
      <legend className="plane-transform-legend">Orientation</legend>
      <Checkbox
        label="Swap x and y"
        checked={planeTransform.xyswap}
        onChange={set("xyswap")}
      />
      <Checkbox
        label="Flip x"
        checked={planeTransform.xflip}
        onChange={set("xflip")}
      />
      <Checkbox
        label="Flip y"
        checked={planeTransform.yflip}
        onChange={set("yflip")}
      />
    </fieldset>
  );
};

export default PlaneTransformSelector;
