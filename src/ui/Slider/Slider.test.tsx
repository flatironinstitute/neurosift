// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RangeSlider } from "./RangeSlider";
import { Slider } from "./Slider";

afterEach(cleanup);

function Opacity({ onChange = vi.fn() }: { onChange?: (v: number) => void }) {
  const [value, setValue] = useState(0.5);
  return (
    <Slider
      label="Raw trace opacity"
      min={0}
      max={1}
      step={0.05}
      value={value}
      onChange={(v) => {
        onChange(v);
        setValue(v);
      }}
    />
  );
}

describe("Slider", () => {
  it("is a slider named by its visible label, with its value shown, and no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Opacity />);
    const slider = screen.getByRole("slider", { name: "Raw trace opacity" });
    expect(slider.getAttribute("aria-valuetext")).toBe("0.50");
    expect(
      screen.getByRole("textbox", { name: "Raw trace opacity value" }),
    ).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("says the unit with the value", () => {
    render(
      <Slider
        label="Trail length"
        unit="s"
        unitName="seconds"
        min={0.25}
        max={5}
        step={0.25}
        value={1.25}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe(
      "1.25 seconds",
    );
  });

  it("moves ten steps with Page Up and Page Down, within its limits", () => {
    const onChange = vi.fn();
    render(<Opacity onChange={onChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "PageUp" });
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(slider, { key: "PageDown" });
    expect(onChange).toHaveBeenLastCalledWith(0.5);
  });

  it("takes an exact value in its field on Enter, snapped to the step and the limits", () => {
    const onChange = vi.fn();
    render(<Opacity onChange={onChange} />);
    const field = screen.getByRole("textbox", {
      name: "Raw trace opacity value",
    });
    fireEvent.change(field, { target: { value: "0.73" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(0.75);
    fireEvent.change(field, { target: { value: "7" } });
    fireEvent.blur(field);
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("says when the field holds something that isn't a number", () => {
    render(<Opacity />);
    const field = screen.getByRole("textbox", {
      name: "Raw trace opacity value",
    });
    fireEvent.change(field, { target: { value: "half" } });
    fireEvent.blur(field);
    expect(screen.getByText("Enter a number from 0 to 1.")).toBeTruthy();
    expect(field.getAttribute("aria-invalid")).toBe("true");
  });
});

function DisplayRange({
  onChange = vi.fn(),
}: {
  onChange?: (v: [number, number]) => void;
}) {
  const [value, setValue] = useState<[number, number]>([120, 3400]);
  return (
    <RangeSlider
      label="Display range"
      min={0}
      max={4095}
      step={1}
      showScale
      value={value}
      onChange={(v) => {
        onChange(v);
        setValue(v);
      }}
    />
  );
}

describe("RangeSlider", () => {
  it("is a group of two named sliders with a field at each end", () => {
    render(<DisplayRange />);
    expect(screen.getByRole("group", { name: "Display range" })).toBeTruthy();
    expect(
      screen.getByRole("slider", { name: "Display range, low" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("slider", { name: "Display range, high" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Display range, low value" }),
    ).toBeTruthy();
    expect(screen.getByText("4,095")).toBeTruthy();
  });

  it("doesn't let the thumbs cross", () => {
    const onChange = vi.fn();
    render(<DisplayRange onChange={onChange} />);
    fireEvent.change(
      screen.getByRole("slider", { name: "Display range, low" }),
      {
        target: { value: "4000" },
      },
    );
    expect(onChange).toHaveBeenLastCalledWith([3400, 3400]);
  });

  it("says so when a typed low is above the high", () => {
    const onChange = vi.fn();
    render(<DisplayRange onChange={onChange} />);
    const low = screen.getByRole("textbox", {
      name: "Display range, low value",
    });
    fireEvent.change(low, { target: { value: "3500" } });
    fireEvent.keyDown(low, { key: "Enter" });
    expect(screen.getByText("Low must be below 3,400.")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });
});
