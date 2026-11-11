import { RangeSlider, Slider } from "@ui";
import { useState } from "react";

/** The single sliders that replace today's browser ranges. */
export function SliderDemos() {
  const [opacity, setOpacity] = useState(0.5);
  const [trail, setTrail] = useState(2.5);
  const [plane, setPlane] = useState(5);
  return (
    <div className="slider-demos">
      <Slider
        label="Raw trace opacity"
        min={0}
        max={1}
        step={0.05}
        value={opacity}
        onChange={setOpacity}
      />
      <Slider
        label="Trail length (s)"
        unitName="seconds"
        min={0.25}
        max={5}
        step={0.25}
        showScale
        value={trail}
        onChange={setTrail}
      />
      <Slider
        label="Plane"
        min={0}
        max={11}
        step={1}
        showScale
        value={plane}
        onChange={setPlane}
      />
      <Slider
        label="Brightness"
        min={0}
        max={100}
        step={1}
        disabled
        value={50}
        onChange={() => {}}
      />
    </div>
  );
}

/** The display range of a two-photon frame. */
export function RangeDemo() {
  const [range, setRange] = useState<[number, number]>([120, 3400]);
  return (
    <div className="slider-demos">
      <RangeSlider
        label="Display range"
        min={0}
        max={4095}
        step={1}
        showScale
        value={range}
        onChange={setRange}
      />
    </div>
  );
}
