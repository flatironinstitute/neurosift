// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DataTooltip } from "./DataTooltip";

afterEach(cleanup);

const ROWS = [
  { name: "ch 0", value: "12.4 µV" },
  { name: "ch 1", value: "−3.1 µV", series: 2 },
];

describe("DataTooltip", () => {
  it("reads out the time first, then each series with its color, name and value", () => {
    const { container } = render(
      <DataTooltip time="412.38 s" rows={ROWS} x={100} y={40} width={480} />,
    );
    expect(container.querySelector(".ns-data-tooltip-time")?.textContent).toBe(
      "412.38 s",
    );
    const rows = [...container.querySelectorAll(".ns-data-tooltip-row")];
    expect(rows.map((row) => row.textContent)).toEqual([
      "ch 012.4 µV",
      "ch 1−3.1 µV",
    ]);
    expect(
      rows.map((row) => row.querySelector(".ns-legend-swatch")?.className),
    ).toEqual([
      "ns-legend-swatch ns-legend-swatch--1",
      "ns-legend-swatch ns-legend-swatch--2",
    ]);
  });

  it("sits 12px right of the cursor, and flips left near the right edge", () => {
    const { container, rerender } = render(
      <DataTooltip time="1 s" rows={ROWS} x={100} y={40} width={480} />,
    );
    const tip = container.firstElementChild as HTMLElement;
    expect(tip.className).toBe("ns-data-tooltip");
    rerender(<DataTooltip time="1 s" rows={ROWS} x={420} y={40} width={480} />);
    expect(tip.className).toBe("ns-data-tooltip ns-data-tooltip--left");
  });

  it("is quiet for the pointer, and announced politely when the keyboard moves the cursor", () => {
    const { rerender } = render(
      <DataTooltip time="1 s" rows={ROWS} x={100} y={40} width={480} />,
    );
    expect(screen.queryByRole("status")).toBeNull();
    rerender(
      <DataTooltip
        time="1 s"
        rows={ROWS}
        x={100}
        y={40}
        width={480}
        announce
      />,
    );
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
