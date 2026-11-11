// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import TimeScrollView2 from "./TimeScrollView2";

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
});
afterEach(cleanup);

const show = (props: {
  hideToolbar?: boolean;
  showTimeseriesToolbar?: boolean;
}) =>
  render(
    <ProvideTimeseriesSelection>
      <TimeScrollView2
        width={600}
        height={300}
        onCanvasElement={() => {}}
        showTimeSelectionBar={false}
        {...props}
      />
    </ProvideTimeseriesSelection>,
  );

const vars = (el: Element | null, ...names: string[]) =>
  names.map((n) => (el as HTMLElement).style.getPropertyValue(n));

describe("TimeScrollView2", () => {
  it("draws zoom and pan buttons in an 18px column beside the canvas", () => {
    const { container } = show({});
    for (const title of [
      "Time zoom in (+)",
      "Time zoom out (-)",
      "Shift time window back [left arrow]",
      "Shift time window forward [right arrow]",
    ])
      expect(screen.getAllByTitle(title).length).toBeGreaterThan(0);
    expect(
      vars(
        container.querySelector(".tsv"),
        "--tsv-width",
        "--tsv-canvas-width",
      ),
    ).toEqual(["600px", "582px"]);
  });

  it("keeps the column but leaves out its buttons when the toolbar is hidden", () => {
    const { container } = show({ showTimeseriesToolbar: false });
    expect(screen.queryByTitle("Time zoom in (+)")).toBeNull();
    expect(container.querySelector(".time-scroll-toolbar")).toBeTruthy();
    expect(vars(container.querySelector(".tsv"), "--tsv-canvas-width")).toEqual(
      ["582px"],
    );
  });

  it("gives the canvas the whole width without a toolbar", () => {
    const { container } = show({ hideToolbar: true });
    expect(container.querySelector(".time-scroll-toolbar")).toBeNull();
    expect(container.querySelector(".tsv--bare")).toBeTruthy();
    expect(vars(container.querySelector(".tsv"), "--tsv-canvas-width")).toEqual(
      ["600px"],
    );
  });
});
