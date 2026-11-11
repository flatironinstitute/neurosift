// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ColorBar, Legend } from "./Legend";

afterEach(cleanup);

describe("Legend", () => {
  it("names each series beside its color swatch, in order", () => {
    render(
      <Legend label="Load" items={[{ name: "Load 1" }, { name: "Load 3" }]} />,
    );
    const list = screen.getByRole("list", { name: "Load" });
    const rows = [...list.querySelectorAll("li")];
    expect(rows.map((row) => row.textContent)).toEqual(["Load 1", "Load 3"]);
    expect(
      rows.map((row) => row.querySelector(".ns-legend-swatch")?.className),
    ).toEqual([
      "ns-legend-swatch ns-legend-swatch--1",
      "ns-legend-swatch ns-legend-swatch--2",
    ]);
  });

  it("draws series past the sixth in the neutral other color", () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ name: `Unit ${i}` }));
    const { container } = render(<Legend label="Units" items={items} />);
    expect(container.querySelectorAll(".ns-legend-swatch--other")).toHaveLength(
      1,
    );
  });

  it("can pin a series to its color, so it matches across views", () => {
    const { container } = render(
      <Legend label="Load" items={[{ name: "Load 3", series: 4 }]} />,
    );
    expect(container.querySelector(".ns-legend-swatch--4")).toBeTruthy();
  });
});

describe("ColorBar", () => {
  it("prints its end values with units, and says its range in words", () => {
    render(
      <ColorBar
        label="Power"
        scale="sequential"
        low="−40.3 dB"
        high="1.4 dB"
      />,
    );
    expect(
      screen.getByRole("img", { name: "Power, from −40.3 dB to 1.4 dB" }),
    ).toBeTruthy();
    expect(screen.getByText("1.4 dB")).toBeTruthy();
    expect(screen.getByText("−40.3 dB")).toBeTruthy();
  });

  it("uses viridis for amounts and blue to red around zero", () => {
    const { container, rerender } = render(
      <ColorBar label="Power" scale="sequential" low="0" high="1" />,
    );
    expect(
      container.querySelector(".ns-colorbar-ramp--sequential"),
    ).toBeTruthy();
    rerender(
      <ColorBar label="Signal" scale="diverging" low="−50 µV" high="50 µV" />,
    );
    expect(
      container.querySelector(".ns-colorbar-ramp--diverging"),
    ).toBeTruthy();
  });
});
