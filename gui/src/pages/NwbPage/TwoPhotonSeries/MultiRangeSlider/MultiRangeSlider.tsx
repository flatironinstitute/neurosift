// adapted from https://codesandbox.io/s/multi-range-slider-react-js-6rzv0f

import PropTypes from "prop-types";
import { useCallback } from "react";
import "./MultiRangeSlider.css";

type Props = {
  min: number;
  max: number;
  currentMin: number;
  currentMax: number;
  setCurrentMin: (value: number) => void;
  setCurrentMax: (value: number) => void;
}

const MultiRangeSlider = ({ min, max, currentMin, currentMax, setCurrentMin, setCurrentMax }: Props) => {
  // Convert to percentage
  const getPercent = useCallback(
    (value: number) => Math.round(((value - min) / (max - min)) * 100),
    [min, max]
  );

  return (
    <div>
      <input
        type="range"
        min={min}
        max={max}
        value={currentMin}
        onChange={(event) => {
          const value = Math.min(Number(event.target.value), currentMax - 1);
          setCurrentMin(value);
        }}
        className="thumb thumb--left"
        style={{ zIndex: currentMin > (min + max) / 2 ? 5: undefined}} // deal with the case where the left and right thumbs overlap
      />
      <input
        type="range"
        min={min}
        max={max}
        value={currentMax}
        onChange={(event) => {
          const value = Math.max(Number(event.target.value), currentMin + 1);
          setCurrentMax(value);
        }}
        className="thumb thumb--right"
        style={{ zIndex: currentMax < (min + max) / 2 ? 5: undefined}} // deal with the case where the left and right thumbs overlap
      />

      <div className="slider">
        <div className="slider__track" />
        <div style={{left: `${getPercent(currentMin)}%`, width: `${getPercent(currentMax) - getPercent(currentMin)}%`}} className="slider__range" />
        {/* <div className="slider__left-value">{minVal}</div>
        <div className="slider__right-value">{maxVal}</div> */}
      </div>
    </div>
  );
};

export default MultiRangeSlider;
