// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SegmentedControl, type SegmentOption } from "./SegmentedControl";

beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
});
afterEach(cleanup);

const SIZES: SegmentOption[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium", disabled: true },
  { value: "lg", label: "Large" },
];

function Height({ onChange = vi.fn() }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState("sm");
  return (
    <SegmentedControl
      label="PSTH height"
      options={SIZES}
      value={value}
      onChange={(v) => {
        onChange(v);
        setValue(v);
      }}
    />
  );
}

describe("SegmentedControl", () => {
  it("is a labelled radio group with the value checked, and no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Height />);
    const group = screen.getByRole("radiogroup", { name: "PSTH height" });
    const radios = screen.getAllByRole("radio");
    expect(group.contains(radios[0])).toBe(true);
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual([
      "true",
      "false",
      "false",
    ]);
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("changes on click, and not on a disabled option", () => {
    const onChange = vi.fn();
    render(<Height onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Medium" }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "Large" }));
    expect(onChange).toHaveBeenCalledWith("lg");
  });

  it("moves the selection with the arrow keys, skipping disabled options, and Home and End", () => {
    render(<Height />);
    const key = (k: string) =>
      fireEvent.keyDown(document.activeElement!, { key: k });
    screen.getByRole("radio", { name: "Small" }).focus();
    key("ArrowRight");
    expect(document.activeElement?.textContent).toBe("Large");
    expect(document.activeElement?.getAttribute("aria-checked")).toBe("true");
    key("ArrowRight");
    expect(document.activeElement?.textContent).toBe("Small");
    key("End");
    expect(document.activeElement?.textContent).toBe("Large");
    key("Home");
    expect(document.activeElement?.textContent).toBe("Small");
    key("ArrowDown");
    expect(document.activeElement?.textContent).toBe("Large");
  });

  it("names icon-only options for screen readers", () => {
    render(
      <SegmentedControl
        label="Plot mode"
        hideLabels
        options={[
          { value: "pan", label: "Pan", icon: "share" },
          { value: "zoom", label: "Zoom to selection", icon: "search" },
        ]}
        value="pan"
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("radio", { name: "Zoom to selection" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: "Pan" }).querySelector("svg"),
    ).not.toBeNull();
  });
});
