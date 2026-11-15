import { SegmentedControl, type SegmentOption } from "@ui";
import { useState } from "react";

interface SegmentedDemoProps {
  label: string;
  options: SegmentOption[];
  initial: string;
  size?: "md" | "sm";
}

/** A live segmented control with its visible group label. */
export default function SegmentedDemo({
  label,
  options,
  initial,
  size,
}: SegmentedDemoProps) {
  const [value, setValue] = useState(initial);
  return (
    <div className="segmented-demo">
      <span className="type-caption segmented-demo-label" aria-hidden="true">
        {label}
      </span>
      <SegmentedControl
        label={label}
        options={options}
        value={value}
        onChange={setValue}
        size={size}
      />
    </div>
  );
}
