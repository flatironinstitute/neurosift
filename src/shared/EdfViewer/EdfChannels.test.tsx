// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EdfChannels from "./EdfChannels";

afterEach(cleanup);

const labels = Array.from({ length: 12 }, (_, i) => `ch${i}`);
const rates = labels.map(() => 2000);

const show = (selected: number[]) => {
  const onChange = vi.fn();
  render(
    <EdfChannels
      labels={labels}
      rates={rates}
      selected={selected}
      onChange={onChange}
    />,
  );
  return onChange;
};

const box = (name: string) =>
  screen.getByText(name).closest("label")!.querySelector("input")!;

describe("EdfChannels", () => {
  it("lists each channel with its rate", () => {
    show([0]);
    expect(box("ch0").checked).toBe(true);
    expect(box("ch1").checked).toBe(false);
    expect(screen.getAllByText("2,000 Hz")).toHaveLength(12);
  });

  it("shows All channels as mixed when some are on, and turns them all on", () => {
    const onChange = show([0, 3]);
    expect(box("All channels").indeterminate).toBe(true);
    fireEvent.click(box("All channels"));
    expect(onChange).toHaveBeenCalledWith(labels.map((_, i) => i));
  });

  it("clears every channel when all are on", () => {
    const onChange = show(labels.map((_, i) => i));
    fireEvent.click(box("All channels"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("keeps channels in numeric order as they are turned on", () => {
    const onChange = show([10]);
    fireEvent.click(box("ch2"));
    expect(onChange).toHaveBeenCalledWith([2, 10]);
  });

  it("turns a channel off", () => {
    const onChange = show([2, 10]);
    fireEvent.click(box("ch10"));
    expect(onChange).toHaveBeenCalledWith([2]);
  });
});
