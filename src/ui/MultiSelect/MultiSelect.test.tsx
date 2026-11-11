// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MultiSelect, RemovableTag } from "./MultiSelect";

afterEach(cleanup);

const TYPES = [
  { value: "ElectricalSeries", label: "ElectricalSeries", meta: "1,203 files" },
  { value: "Units", label: "Units", meta: "980 files" },
  { value: "TimeSeries", label: "TimeSeries", meta: "2,410 files" },
  { value: "SpatialSeries", label: "SpatialSeries", meta: "301 files" },
];

function Picker({ initial = [] as string[], onChange = vi.fn() }) {
  const [value, setValue] = useState(initial);
  return (
    <MultiSelect
      label="Neurodata types"
      helper="Files that contain every type you choose."
      options={TYPES}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      code
      noun="types"
    />
  );
}

describe("MultiSelect", () => {
  it("is a labelled combobox with its helper", () => {
    render(<Picker />);
    const input = screen.getByRole("combobox", { name: "Neurodata types" });
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.getByText("Files that contain every type you choose."),
    ).toBeTruthy();
  });

  it("keeps a description the caller links, beside its helper", () => {
    render(
      <>
        <MultiSelect
          label="Neurodata types"
          helper="Files that contain every type you choose."
          options={TYPES}
          value={[]}
          onChange={vi.fn()}
          aria-describedby="hint"
        />
        <p id="hint">Type to filter.</p>
      </>,
    );
    const ids = screen
      .getByRole("combobox", { name: "Neurodata types" })
      .getAttribute("aria-describedby")
      ?.split(" ");
    expect(ids).toHaveLength(2);
    expect(ids?.[0]).toBe("hint");
  });

  it("matches anywhere in the name, so Series finds ElectricalSeries", () => {
    render(<Picker />);
    const input = screen.getByRole("combobox", { name: "Neurodata types" });
    fireEvent.change(input, { target: { value: "series" } });
    expect(input.getAttribute("aria-expanded")).toBe("true");
    const names = screen
      .getAllByRole("option")
      .map((o) => o.getAttribute("data-value"));
    expect(names).toEqual(["ElectricalSeries", "TimeSeries", "SpatialSeries"]);
  });

  it("picks the active option with Enter, as a removable tag, and clears the typing", () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);
    const input = screen.getByRole("combobox", { name: "Neurodata types" });
    fireEvent.change(input, { target: { value: "series" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(
      screen.getAllByRole("option")[1].id,
    );
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(["TimeSeries"]);
    expect((input as HTMLInputElement).value).toBe("");
    expect(
      screen.getByRole("button", { name: "Remove TimeSeries" }),
    ).toBeTruthy();
  });

  it("leaves chosen values out of the list", () => {
    render(<Picker initial={["Units"]} />);
    const input = screen.getByRole("combobox", { name: "Neurodata types" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(
      screen.getAllByRole("option").map((o) => o.getAttribute("data-value")),
    ).not.toContain("Units");
  });

  it("removes a tag with its ×, or the last one with Backspace in the empty field", () => {
    const onChange = vi.fn();
    render(<Picker initial={["Units", "TimeSeries"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Units" }));
    expect(onChange).toHaveBeenLastCalledWith(["TimeSeries"]);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Backspace" });
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("closes with Escape and says when nothing matches", () => {
    render(<Picker />);
    const input = screen.getByRole("combobox", { name: "Neurodata types" });
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText("No types match “zzz”")).toBeTruthy();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("RemovableTag", () => {
  it("names its remove button after its value", () => {
    const onRemove = vi.fn();
    render(<RemovableTag label="Units" onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Units" }));
    expect(onRemove).toHaveBeenCalled();
  });
});
