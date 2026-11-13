import { useId, type KeyboardEvent } from "react";
import { SliderField } from "./SliderField";
import { PAGE_STEPS, formatLimit, formatValue, snap } from "./sliderMath";
import "../base.css";
import "./Slider.css";

export interface SliderBaseProps {
  label: string;
  min: number;
  max: number;
  /** Steps follow the data: 0.05 for opacity, 0.25 s for a trail, 1 for planes. */
  step: number;
  /** Shown after the value, such as "s". */
  unit?: string;
  /** Read with the value, such as "seconds". */
  unitName?: string;
  showValue?: boolean;
  showField?: boolean;
  showScale?: boolean;
  disabled?: boolean;
}

interface SliderProps extends SliderBaseProps {
  value: number;
  onChange: (value: number) => void;
}

/** One value on a scale, for settings people judge by eye, with a field for exact numbers. */
export function Slider({
  label,
  min,
  max,
  step,
  unit,
  unitName,
  value,
  onChange,
  showValue = true,
  showField = true,
  showScale = false,
  disabled,
}: SliderProps) {
  const id = useId();
  const text = formatValue(value, step);
  const change = (v: number) => onChange(snap(v, min, max, step));
  const onKeyDown = (event: KeyboardEvent) => {
    const page = { PageUp: 1, PageDown: -1 }[event.key];
    if (!page) return;
    event.preventDefault();
    change(value + page * PAGE_STEPS * step);
  };
  return (
    <div className="ns-slider" data-disabled={disabled ? "" : undefined}>
      <div className="ns-slider-header">
        <label className="ns-slider-label" htmlFor={id}>
          {label}
        </label>
        {showValue && (
          <span className="ns-slider-value" aria-hidden="true">
            {text}
            {unit && ` ${unit}`}
          </span>
        )}
      </div>
      <div className="ns-slider-control">
        <div className="ns-slider-track">
          <progress
            className="ns-slider-fill"
            aria-hidden="true"
            max={max - min}
            value={value - min}
          />
          <input
            id={id}
            type="range"
            className="ns-slider-input"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            aria-valuetext={unitName ? `${text} ${unitName}` : text}
            onChange={(event) => change(Number(event.target.value))}
            onKeyDown={onKeyDown}
          />
        </div>
        {showField && (
          <SliderField
            label={`${label} value`}
            value={value}
            step={step}
            disabled={disabled}
            invalid={`Enter a number from ${formatLimit(min)} to ${formatLimit(max)}.`}
            commit={(v) => {
              change(v);
              return undefined;
            }}
          />
        )}
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
