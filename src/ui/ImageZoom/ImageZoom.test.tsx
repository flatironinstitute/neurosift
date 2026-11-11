// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ImageZoom } from "./ImageZoom";
import type { ImageZoomValue } from "./zoomMath";

afterEach(cleanup);

// jsdom has no layout, so the viewport keeps its preferred 500 × 500 size.
function Harness({ initial = "fit" }: { initial?: ImageZoomValue }) {
  const [value, setValue] = useState<ImageZoomValue>(initial);
  return (
    <ImageZoom
      label="Max projection"
      width={2000}
      height={1000}
      viewWidth={500}
      viewHeight={500}
      value={value}
      onChange={setValue}
    >
      <canvas width={2000} height={1000} />
    </ImageZoom>
  );
}

const readout = () => screen.getByRole("status").textContent;
const viewport = () =>
  screen.getByRole("group", { name: /Max projection/ }) as HTMLDivElement;
const content = () => viewport().firstElementChild as HTMLDivElement;

describe("ImageZoom", () => {
  it("starts fitted, says so, and names the viewport with its keys", () => {
    render(<Harness />);
    expect(readout()).toBe("Fit · 25%");
    expect(viewport().getAttribute("aria-label")).toBe(
      "Max projection. Plus and minus zoom, 0 fits, arrow keys pan.",
    );
    expect(viewport().tabIndex).toBe(0);
    expect(screen.getByRole("button", { name: "Fit" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Zoom out" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("zooms with the buttons, goes to actual pixels and back to fit", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(readout()).toBe("38%");
    fireEvent.click(screen.getByRole("button", { name: "100%" }));
    expect(readout()).toBe("100%");
    expect(content().style.getPropertyValue("--zoom-scale")).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "Fit" }));
    expect(readout()).toBe("Fit · 25%");
  });

  it("zooms with + and −, fits with 0 and pans with the arrows", () => {
    render(<Harness />);
    fireEvent.keyDown(viewport(), { key: "=" });
    fireEvent.keyDown(viewport(), { key: "+" });
    expect(readout()).toBe("56%");
    const x = content().style.getPropertyValue("--zoom-x");
    fireEvent.keyDown(viewport(), { key: "ArrowRight" });
    expect(content().style.getPropertyValue("--zoom-x")).not.toBe(x);
    fireEvent.keyDown(viewport(), { key: "-" });
    expect(readout()).toBe("38%");
    fireEvent.keyDown(viewport(), { key: "0" });
    expect(readout()).toBe("Fit · 25%");
  });

  it("draws pixels crisp only past 100%", () => {
    render(<Harness initial={{ scale: 4, x: 0, y: 0 }} />);
    expect(content().className).toContain("ns-image-zoom-content--pixels");
    fireEvent.click(screen.getByRole("button", { name: "Fit" }));
    expect(content().className).not.toContain("--pixels");
  });

  it("zooms in on double-click and with the wheel", () => {
    render(<Harness />);
    fireEvent.dblClick(viewport(), { clientX: 250, clientY: 250 });
    expect(readout()).toBe("38%");
    fireEvent.wheel(viewport(), { deltaY: -200, clientX: 10, clientY: 10 });
    expect(readout()).not.toBe("38%");
  });

  it("drags to pan once zoomed", () => {
    render(<Harness initial={{ scale: 1, x: -500, y: -200 }} />);
    fireEvent.pointerDown(viewport(), {
      pointerId: 1,
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(viewport(), {
      pointerId: 1,
      clientX: 160,
      clientY: 130,
    });
    fireEvent.pointerUp(viewport(), { pointerId: 1 });
    expect(content().style.getPropertyValue("--zoom-x")).toBe("-440px");
    expect(content().style.getPropertyValue("--zoom-y")).toBe("-170px");
  });
});
