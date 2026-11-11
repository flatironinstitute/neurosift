import { useId, type KeyboardEvent } from "react";
import type { SliderBaseProps } from "./Slider";
import { SliderField } from "./SliderField";
import { PAGE_STEPS, formatLimit, formatValue, snap } from "./sliderMath";
import "../base.css";
import "./Slider.css";

interface RangeSliderProps extends SliderBaseProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

/** A low and a high value, such as an image's display range. The thumbs can't cross. */
export function RangeSlider({
  label,
  min,
  max,
  step,
  unit,
  unitName,
  value: [low, high],
  onChange,
  showValue = false,
  showField = true,
  showScale = false,
  disabled,
}: RangeSliderProps) {
  const labelId = useId();
  const fmt = (v: number) => formatValue(v, step);
  const setLow = (v: number) =>
    onChange([Math.min(snap(v, min, max, step), high), high]);
  const setHigh = (v: number) =>
    onChange([low, Math.max(snap(v, min, max, step), low)]);
  const valueText = (v: number) =>
    unitName ? `${fmt(v)} ${unitName}` : fmt(v);
  const paging =
    (current: number, set: (v: number) => void) => (event: KeyboardEvent) => {
      const page = { PageUp: 1, PageDown: -1 }[event.key];
      if (!page) return;
      event.preventDefault();
      set(current + page * PAGE_STEPS * step);
    };
  const invalid = `Enter a number from ${formatLimit(min)} to ${formatLimit(max)}.`;

  const thumb = (which: "low" | "high") => {
    const current = which === "low" ? low : high;
    const set = which === "low" ? setLow : setHigh;
    return (
      <input
        type="range"
        className={`ns-slider-input ns-slider-input--${which}`}
        aria-label={`${label}, ${which}`}
        min={min}
        max={max}
        step={step}
        value={current}
        disabled={disabled}
        aria-valuetext={valueText(current)}
        onChange={(event) => set(Number(event.target.value))}
        onKeyDown={paging(current, set)}
      />
    );
  };

  const field = (which: "low" | "high") => (
    <SliderField
      label={`${label}, ${which} value`}
      value={which === "low" ? low : high}
      step={step}
      disabled={disabled}
      invalid={invalid}
      commit={(v) => {
        if (which === "low" && v > high)
          return `Low must be below ${fmt(high)}.`;
        if (which === "high" && v < low)
          return `High must be above ${fmt(low)}.`;
        (which === "low" ? setLow : setHigh)(v);
        return undefined;
      }}
    />
  );

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="ns-slider ns-slider--range"
      data-disabled={disabled ? "" : undefined}
    >
      <div className="ns-slider-header">
        <span id={labelId} className="ns-slider-label">
          {label}
        </span>
        {showValue && (
          <span className="ns-slider-value" aria-hidden="true">
            {fmt(low)}–{fmt(high)}
            {unit && ` ${unit}`}
          </span>
        )}
      </div>
      <div className="ns-slider-control">
        {showField && field("low")}
        <div className="ns-slider-track">
          {/* The fill between the thumbs: the high value's bar, with the low value's bar drawn as rail over it. */}
          <progress
            className="ns-slider-fill"
            aria-hidden="true"
            max={max - min}
            value={high - min}
          />
          <progress
            className="ns-slider-fill ns-slider-fill--mask"
            aria-hidden="true"
            max={max - min}
            value={low - min}
          />
          {thumb("low")}
          {thumb("high")}
        </div>
        {showField && field("high")}
      </div>
      {showScale && (
        <div className="ns-slider-scale" aria-hidden="true">
          <span>{formatLimit(min)}</span>
          <span>{formatLimit(max)}</span>
        </div>
      )}
    </div>
  );
}
