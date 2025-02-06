// adapted from https://codesandbox.io/s/multi-range-slider-react-js-6rzv0f

import { useCallback } from "react";
import "./MultiRangeSlider.css";

type Props = {
  min: number;
  max: number;
  value1: number;
  value2: number;
  setValue1: (value: number) => void;
  setValue2: (value: number) => void;
};

const MultiRangeSlider = ({
  min,
  max,
  value1,
  value2,
  setValue1,
  setValue2,
}: Props) => {
  // Convert to percentage
  const getPercent = useCallback(
    (value: number) => Math.round(((value - min) / (max - min)) * 1000) / 10,
    [min, max],
  );

  return (
    <div>
      <input
        type="range"
        min={min}
        max={max}
        value={value1}
        onChange={(event) => {
          const value = Math.min(Number(event.target.value), value2 - 1);
          setValue1(value);
        }}
        className="thumb thumb--left"
        style={{ zIndex: value1 > (min + max) / 2 ? 5 : undefined }} // deal with the case where the left and right thumbs overlap
      />
      <input
        type="range"
        min={min}
        max={max}
        value={value2}
        onChange={(event) => {
          const value = Math.max(Number(event.target.value), value1 + 1);
          setValue2(value);
        }}
        className="thumb thumb--right"
        style={{ zIndex: value2 < (min + max) / 2 ? 5 : undefined }} // deal with the case where the left and right thumbs overlap
      />

      <div className="slider">
        <div className="slider__track" />
        <div
          style={{
            left: `${getPercent(value1)}%`,
            width: `${getPercent(value2) - getPercent(value1)}%`,
          }}
          className="slider__range"
        />
        {/* <div className="slider__left-value">{minVal}</div>
        <div className="slider__right-value">{maxVal}</div> */}
      </div>
    </div>
  );
};

export default MultiRangeSlider;
