// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OverviewPanel } from "./OverviewPanel";

afterEach(cleanup);

const GROUPS = [
  { title: "Dandiset", items: [{ term: "ID", value: "000673", code: true }] },
  {
    title: "Session",
    items: [{ term: "Start", value: "2018-01-01", code: true }],
  },
];

const setup = (overrides = {}) => {
  const props = {
    title: "Overview",
    groups: GROUPS,
    width: 320,
    onWidthChange: vi.fn(),
    collapsed: false,
    onCollapsedChange: vi.fn(),
    ...overrides,
  };
  render(<OverviewPanel {...props} />);
  return props;
};

describe("OverviewPanel", () => {
  it("is a named region with one description list per group", () => {
    setup();
    const panel = screen.getByRole("region", { name: "Overview" });
    expect(
      [...panel.querySelectorAll("dl")].map((dl) =>
        dl.getAttribute("aria-label"),
      ),
    ).toEqual(["Dandiset", "Session"]);
  });

  it("collapses with one button, and reopens from the rail", () => {
    const { onCollapsedChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Hide overview" }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    cleanup();
    const collapsed = setup({ collapsed: true });
    expect(screen.queryByRole("region", { name: "Overview" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show overview" }));
    expect(collapsed.onCollapsedChange).toHaveBeenCalledWith(false);
  });

  it("resizes from a separator that the arrow keys move, within 240 to 480px", () => {
    const { onWidthChange } = setup();
    const handle = screen.getByRole("separator", { name: "Resize overview" });
    expect(handle.getAttribute("aria-valuenow")).toBe("320");
    expect(handle.getAttribute("aria-valuemin")).toBe("240");
    expect(handle.getAttribute("aria-valuemax")).toBe("480");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onWidthChange).toHaveBeenLastCalledWith(336);
    fireEvent.keyDown(handle, { key: "Home" });
    expect(onWidthChange).toHaveBeenLastCalledWith(240);
    fireEvent.keyDown(handle, { key: "End" });
    expect(onWidthChange).toHaveBeenLastCalledWith(480);
  });

  it("never reports a width outside its limits", () => {
    const { onWidthChange } = setup({ width: 480 });
    fireEvent.keyDown(
      screen.getByRole("separator", { name: "Resize overview" }),
      { key: "ArrowRight" },
    );
    expect(onWidthChange).toHaveBeenLastCalledWith(480);
  });
});
