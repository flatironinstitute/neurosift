// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Checkbox } from "./Checkbox";

afterEach(cleanup);

const noop = () => {};

describe("Checkbox", () => {
  it("is a native checkbox named by its label, which is part of the target", () => {
    render(
      <Checkbox label="Show NWB files only" checked={false} onChange={noop} />,
    );
    const box = screen.getByRole("checkbox", { name: "Show NWB files only" });
    expect(box.tagName).toBe("INPUT");
    expect(box.closest("label")?.className).toBe("ns-checkbox");
  });

  it("shows on and off", () => {
    const { rerender } = render(
      <Checkbox label="Show trails" checked={false} onChange={noop} />,
    );
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(
      false,
    );
    rerender(<Checkbox label="Show trails" checked onChange={noop} />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("shows mixed as the browser's indeterminate state, so screen readers say mixed", () => {
    render(<Checkbox label="All channels" checked="mixed" onChange={noop} />);
    const box = screen.getByRole("checkbox") as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    expect(box.checked).toBe(false);
  });

  it("reports the new state, and a mixed box turns on", () => {
    const onChange = vi.fn();
    render(
      <Checkbox label="All channels" checked="mixed" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("puts a count at the end of the row", () => {
    render(<Checkbox label="DANDI" checked onChange={noop} count={673} />);
    expect(screen.getByText("673").className).toBe("ns-checkbox-count");
  });

  it("can't be changed when disabled", () => {
    const onChange = vi.fn();
    render(
      <Checkbox
        label="Show trails"
        checked={false}
        onChange={onChange}
        disabled
      />,
    );
    const box = screen.getByRole("checkbox") as HTMLInputElement;
    expect(box.disabled).toBe(true);
  });

  it("can keep its label for screen readers only", () => {
    render(
      <Checkbox label="Unit 3" hideLabel checked={false} onChange={() => {}} />,
    );
    const box = screen.getByRole("checkbox", { name: "Unit 3" });
    expect(screen.getByText("Unit 3").className).toBe("ns-visually-hidden");
    expect(box).toBeTruthy();
  });
});
