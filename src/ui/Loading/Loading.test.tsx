// @vitest-environment jsdom
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingState, ProgressBar, SkeletonRows } from "./Loading";
import { useLoadingPhase } from "./useLoadingPhase";

afterEach(cleanup);

describe("ProgressBar", () => {
  it("is a real progress bar whose words say how far along it is", () => {
    render(
      <ProgressBar label="Loading LFPs" value={12} max={40} unit="chunks" />,
    );
    const bar = screen.getByRole("progressbar", { name: "Loading LFPs" });
    expect(bar.getAttribute("value")).toBe("12");
    expect(bar.getAttribute("max")).toBe("40");
    expect(bar.getAttribute("aria-valuetext")).toBe("12 of 40 chunks");
    expect(screen.getByText("Loading LFPs, 12 of 40 chunks")).toBeTruthy();
  });
});

describe("LoadingState", () => {
  it("says what is loading, once, while it waits", () => {
    render(<LoadingState label="Loading LFPs" phase="loading" />);
    expect(screen.getByRole("status").textContent).toBe("Loading LFPs…");
  });

  it("shows real progress when the total is known", () => {
    render(
      <LoadingState
        label="Loading LFPs"
        phase="loading"
        progress={{ value: 12, max: 40, unit: "chunks" }}
      />,
    );
    expect(
      screen.getByRole("progressbar", { name: "Loading LFPs" }),
    ).toBeTruthy();
  });

  it("shows nothing for a fast answer", () => {
    const { container } = render(
      <LoadingState label="Loading LFPs" phase="hidden" />,
    );
    expect(container.textContent).toBe("");
  });

  it("stops spinning when slow, says what is slow, and offers a way out", () => {
    const onClick = vi.fn();
    const { container } = render(
      <LoadingState
        label="Loading LFPs"
        phase="slow"
        slow={{
          message:
            "DANDI is answering slowly. This is taking longer than usual.",
          actions: [{ label: "Try again", onClick }],
        }}
      />,
    );
    expect(container.querySelector(".ns-spinner")).toBeNull();
    expect(
      screen.getByText(
        "DANDI is answering slowly. This is taking longer than usual.",
      ),
    ).toBeTruthy();
    screen.getByRole("button", { name: "Try again" }).click();
    expect(onClick).toHaveBeenCalled();
  });
});

describe("SkeletonRows", () => {
  it("draws still rows, hidden from screen readers", () => {
    const { container } = render(<SkeletonRows rows={3} />);
    expect(container.querySelectorAll(".ns-skeleton-row")).toHaveLength(3);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});

describe("useLoadingPhase", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("waits 300ms, then loads, then turns slow after 15 s", () => {
    const { result } = renderHook(({ active }) => useLoadingPhase(active), {
      initialProps: { active: true },
    });
    expect(result.current).toBe("hidden");
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe("loading");
    act(() => vi.advanceTimersByTime(14_700));
    expect(result.current).toBe("slow");
  });

  it("never flashes a spinner: once shown, it stays at least 500ms", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useLoadingPhase(active),
      { initialProps: { active: true } },
    );
    act(() => vi.advanceTimersByTime(300));
    rerender({ active: false });
    expect(result.current).toBe("loading");
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe("hidden");
  });

  it("shows nothing when the answer comes within 300ms", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useLoadingPhase(active),
      { initialProps: { active: true } },
    );
    act(() => vi.advanceTimersByTime(200));
    rerender({ active: false });
    expect(result.current).toBe("hidden");
  });
});
