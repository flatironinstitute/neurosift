// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import TimeView from "./TimeView";
import { useWindowPlayback } from "./usePlayback";

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
