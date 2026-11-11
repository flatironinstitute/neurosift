// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LazyFrame from "./LazyFrame";

let observed: [IntersectionObserverCallback, Element][] = [];

const scroll = (isIntersecting: boolean) =>
  act(() =>
    observed.forEach(([callback, target]) =>
      callback(
        [
          {
            target,
            isIntersecting,
            intersectionRatio: isIntersecting ? 1 : 0,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      ),
    ),
  );

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      thresholds = [0];
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element) {
        observed.push([this.callback, target]);
      }
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  observed = [];
  vi.unstubAllGlobals();
});

describe("LazyFrame", () => {
  it("renders an empty frame with its class before it scrolls into view", () => {
    const { container } = render(
      <LazyFrame className="chart-frame">
        <p>chart</p>
      </LazyFrame>,
    );
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.className).toBe("chart-frame");
    expect(frame.textContent).toBe("");
    expect(frame.getAttribute("style")).toBeNull();
  });

  it("renders its children once in view and keeps them after it leaves", () => {
    render(
      <LazyFrame className="chart-frame">
        <p>chart</p>
      </LazyFrame>,
    );
    scroll(true);
    expect(screen.getByText("chart")).toBeTruthy();
    scroll(false);
    expect(screen.getByText("chart")).toBeTruthy();
  });
});
