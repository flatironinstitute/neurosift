// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  ProvideTimeseriesSelection,
  useTimeAxisRef,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import TimeView from "./TimeView";
import { useWindowPlayback } from "./usePlayback";
import { useTimeWindow } from "./useTimeWindow";

beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
});
afterEach(cleanup);

const Traces = ({ playable }: { playable: boolean }) => {
  const playback = useWindowPlayback();
  return (
    <TimeView
      label="LFPs"
      summary="70 channels"
      playback={playable ? playback : undefined}
    >
      <canvas />
    </TimeView>
  );
};

const renderView = (playable: boolean) =>
  render(
    <ProvideTimeseriesSelection>
      <Traces playable={playable} />
    </ProvideTimeseriesSelection>,
  );

describe("TimeView playback", () => {
  it("puts Playback right after the Time window, and Space on the plot plays", () => {
    renderView(true);
    const groups = screen
      .getAllByRole("group")
      .map((g) => g.getAttribute("aria-label"));
    expect(groups.indexOf("Playback")).toBe(groups.indexOf("Time window") + 1);
    const plot = screen.getByLabelText("LFPs. Space plays and pauses.");
    fireEvent.keyDown(plot, { key: " " });
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    fireEvent.keyDown(plot, { key: " " });
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });

  it("leaves Playback out of views that don't opt in", () => {
    renderView(false);
    expect(screen.queryByRole("group", { name: "Playback" })).toBeNull();
    expect(screen.queryByLabelText(/Space plays/)).toBeNull();
  });
});

// The plot's box is 500 by 300 at the page's corner; 50px margins leave a 400px axis over 0–4 s.
const BOX = {
  left: 0,
  top: 0,
  width: 500,
  height: 300,
  right: 500,
  bottom: 300,
};
const INSETS = { left: 50, right: 50, top: 20, bottom: 40 };

const Chart = () => {
  const ref = useTimeAxisRef(INSETS);
  const { initializeTimeseriesSelection } = useTimeseriesSelection();
  useEffect(
    () =>
      initializeTimeseriesSelection({
        startTimeSec: 0,
        endTimeSec: 100,
        initialVisibleStartTimeSec: 0,
        initialVisibleEndTimeSec: 4,
      }),
    [initializeTimeseriesSelection],
  );
  return <div ref={ref} data-testid="chart" onPointerDown={panned} />;
};

const Readout = () => {
  const { value } = useTimeWindow();
  return (
    <output data-testid="readout">{`${value.start.toFixed(2)}+${value.duration.toFixed(2)}`}</output>
  );
};

const panned = vi.fn();
const Selectable = () => {
  const playback = useWindowPlayback();
  return (
    <TimeView label="LFPs" summary="70 channels" playback={playback}>
      <Chart />
    </TimeView>
  );
};

const renderSelectable = () =>
  render(
    <ProvideTimeseriesSelection>
      <Selectable />
      <Readout />
    </ProvideTimeseriesSelection>,
  );

const readout = () => screen.getByTestId("readout").textContent;
const plot = () => screen.getByRole("group", { name: /Shift\+drag/ });
const drag = (from: number, to: number, init: object = {}) => {
  fireEvent.pointerDown(screen.getByTestId("chart"), {
    button: 0,
    pointerId: 1,
    clientX: from,
    clientY: 100,
    ...init,
  });
  fireEvent.pointerMove(plot(), { pointerId: 1, clientX: to, clientY: 100 });
};
const release = (at: number) =>
  fireEvent.pointerUp(plot(), { pointerId: 1, clientX: at, clientY: 100 });

describe("TimeView drag to zoom", () => {
  beforeAll(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      BOX as DOMRect,
    );
  });

  it("shows a Pan | Select switch after the Time window once a time plot is in it", () => {
    renderSelectable();
    const groups = screen
      .getAllByRole("group")
      .map((g) => g.getAttribute("aria-label"));
    expect(groups.indexOf("Playback")).toBe(groups.indexOf("Time window") + 1);
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toContain("Select");
    expect(
      screen.getByRole("radio", { name: "Pan" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(plot().getAttribute("aria-label")).toBe(
      "LFPs. Drag across the plot in Select mode, or Shift+drag, to zoom to that stretch of time. Space plays and pauses.",
    );
  });

  it("zooms to the dragged stretch in Select mode, and stays in Select", () => {
    renderSelectable();
    fireEvent.click(screen.getByRole("radio", { name: "Select" }));
    expect(plot().className).toContain("time-view-plot--select");
    drag(170, 295);
    expect(screen.getByText("1.20–2.45 s")).toBeTruthy();
    release(295);
    expect(readout()).toBe("1.20+1.25");
    expect(panned).not.toHaveBeenCalled();
    expect(
      screen
        .getByRole("radio", { name: "Select" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("selects with Shift+drag in Pan mode, and leaves a plain drag to the plot", () => {
    renderSelectable();
    drag(170, 295);
    release(295);
    expect(readout()).toBe("0.00+4.00");
    expect(panned).toHaveBeenCalled();
    drag(250, 450, { shiftKey: true });
    release(450);
    expect(readout()).toBe("2.00+2.00");
  });

  it("shows the Select cursor while Shift is held over the plot in Pan", () => {
    renderSelectable();
    expect(plot().className).toContain("time-view-plot--pan");
    fireEvent.pointerEnter(plot());
    fireEvent.keyDown(window, { key: "Shift", shiftKey: true });
    expect(plot().className).toContain("time-view-plot--select");
    fireEvent.keyUp(window, { key: "Shift", shiftKey: false });
    expect(plot().className).toContain("time-view-plot--pan");
    fireEvent.keyDown(window, { key: "Shift", shiftKey: true });
    fireEvent.blur(window);
    expect(plot().className).toContain("time-view-plot--pan");
    fireEvent.keyDown(window, { key: "Shift", shiftKey: true });
    fireEvent.pointerLeave(plot());
    expect(plot().className).toContain("time-view-plot--pan");
    fireEvent.keyDown(window, { key: "Shift", shiftKey: true });
    expect(plot().className).toContain("time-view-plot--pan");
  });

  it("cancels the drag on Escape", () => {
    renderSelectable();
    drag(170, 295, { shiftKey: true });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("1.20–2.45 s")).toBeNull();
    release(295);
    expect(readout()).toBe("0.00+4.00");
  });

  it("pauses playback when a drag starts", () => {
    renderSelectable();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    drag(170, 295, { shiftKey: true });
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });
});
