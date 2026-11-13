// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingPair, TooMuchData, ViewPanel } from "./ViewPanel";

afterEach(cleanup);

describe("ViewPanel", () => {
  it("leads with the summary, then the controls, then the chart under its title", () => {
    const { container } = render(
      <ViewPanel
        label="LFPs"
        summary="LFPs: 70 channels at 400 Hz, 1,375.28 s."
        controls={<button type="button">Zoom in</button>}
        chartTitle="Traces"
      >
        <div>plot</div>
      </ViewPanel>,
    );
    const order = [
      ...container.querySelectorAll(
        ".ns-view-summary, .ns-view-controls, .ns-view-chart-title, .ns-view-plot",
      ),
    ].map((el) => el.className.split(" ")[0]);
    expect(order).toEqual([
      "ns-view-summary",
      "ns-view-controls",
      "ns-view-chart-title",
      "ns-view-plot",
    ]);
    expect(screen.getByRole("region", { name: "LFPs" })).toBeTruthy();
  });

  it("marks the plot busy while its data loads", () => {
    const { container } = render(
      <ViewPanel label="LFPs" summary="LFPs" controls={null} busy>
        <div>plot</div>
      </ViewPanel>,
    );
    expect(
      container.querySelector(".ns-view-plot")?.getAttribute("aria-busy"),
    ).toBe("true");
  });

  it("puts settings in a named side panel", () => {
    render(
      <ViewPanel
        label="PSTH"
        summary="PSTH"
        controls={null}
        settings={<p>Align to</p>}
      >
        <div>plot</div>
      </ViewPanel>,
    );
    expect(
      screen.getByRole("complementary", { name: "PSTH settings" }).textContent,
    ).toBe("Align to");
  });
});

describe("TooMuchData", () => {
  it("says how much and why, and offers Zoom in and Draw anyway as buttons", () => {
    const onZoom = vi.fn();
    const onDrawAnyway = vi.fn();
    render(
      <TooMuchData
        zoomLabel="Zoom in to 1 s"
        onZoom={onZoom}
        onDrawAnyway={onDrawAnyway}
      >
        This window holds 384 channels at 30 kHz for 60 s, about 691 million
        samples.
      </TooMuchData>,
    );
    expect(screen.getByText("Too much data to draw at this zoom")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in to 1 s" }));
    fireEvent.click(screen.getByRole("button", { name: "Draw anyway" }));
    expect(onZoom).toHaveBeenCalled();
    expect(onDrawAnyway).toHaveBeenCalled();
  });
});

describe("SettingPair", () => {
  it("sets two settings side by side", () => {
    const { container } = render(
      <SettingPair>
        <span>High-pass</span>
        <span>Low-pass</span>
      </SettingPair>,
    );
    expect(container.firstElementChild?.className).toBe("ns-setting-pair");
  });
});
