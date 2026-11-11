// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ChannelWindow } from "./ChannelWindow";
import { Playback } from "./Playback";
import { TimeOverview } from "./TimeOverview";
import { TimeWindow } from "./TimeWindow";
import type { TimeWindowValue } from "./timeMath";

beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
});
afterEach(cleanup);

const SESSION = { start: 0, end: 1375.69 };

function Window({
  initial = { start: 412, duration: 3.75 },
}: {
  initial?: TimeWindowValue;
}) {
  const [value, setValue] = useState(initial);
  return <TimeWindow value={value} session={SESSION} onChange={setValue} />;
}

const field = (name: string) =>
  screen.getByRole("textbox", { name }) as HTMLInputElement;

describe("TimeWindow", () => {
  it("shows a duration from a start as fields, with named zoom and step buttons", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Window />);
    expect(screen.getByText("Time window")).toBeTruthy();
    expect(field("Window length").value).toBe("3.75");
    expect(field("Window start").value).toBe("412.00");
    for (const name of ["Zoom in", "Zoom out", "Earlier", "Later"])
      expect(screen.getByRole("button", { name })).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Zoom in" })
        .getAttribute("aria-keyshortcuts"),
    ).toBe("=");
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("zooms and steps", () => {
    render(<Window />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(field("Window length").value).toBe("5.25");
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(field("Window start").value).toBe("411.78");
  });

  it("disables Earlier at the session's start and Later at its end", () => {
    render(<Window initial={{ start: 0, duration: 3.75 }} />);
    expect(
      (screen.getByRole("button", { name: "Earlier" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    cleanup();
    render(<Window initial={{ start: 1371.94, duration: 3.75 }} />);
    expect(
      (screen.getByRole("button", { name: "Later" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("applies a typed start on Enter, and says why one won't fit", () => {
    render(<Window />);
    const start = field("Window start");
    fireEvent.change(start, { target: { value: "100" } });
    fireEvent.keyDown(start, { key: "Enter" });
    expect(start.value).toBe("100.00");
    fireEvent.change(start, { target: { value: "5000" } });
    fireEvent.keyDown(start, { key: "Enter" });
    expect(
      screen.getByText("Start must be between 0 and 1,371.94 s."),
    ).toBeTruthy();
  });

  it("restores the last value on Escape", () => {
    render(<Window />);
    const length = field("Window length");
    fireEvent.change(length, { target: { value: "99" } });
    fireEvent.keyDown(length, { key: "Escape" });
    expect(length.value).toBe("3.75");
  });

  it("announces the new window politely once it settles", () => {
    vi.useFakeTimers();
    render(<Window />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole("status").textContent).toBe("5.25 s from 411.25 s");
    vi.useRealTimers();
  });
});

describe("ChannelWindow", () => {
  function Channels() {
    const [value, setValue] = useState({ first: 0, count: 4 });
    return (
      <ChannelWindow
        label="Channels"
        total={70}
        value={value}
        onChange={setValue}
      />
    );
  }

  it("shows the range with an en dash and the total, and pages through", () => {
    render(<Channels />);
    expect(field("Channels shown").value).toBe("0–3");
    expect(screen.getByText("of 70")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Previous channels",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next channels" }));
    expect(field("Channels shown").value).toBe("4–7");
    fireEvent.click(screen.getByRole("button", { name: "More channels" }));
    expect(field("Channels shown").value).toBe("4–11");
    fireEvent.click(screen.getByRole("button", { name: "Fewer channels" }));
    expect(field("Channels shown").value).toBe("4–7");
  });

  it("takes a typed range", () => {
    render(<Channels />);
    const range = field("Channels shown");
    fireEvent.change(range, { target: { value: "10-19" } });
    fireEvent.keyDown(range, { key: "Enter" });
    expect(range.value).toBe("10–19");
  });
});

describe("TimeOverview", () => {
  function Overview() {
    const [value, setValue] = useState({ start: 412, duration: 3.75 });
    return (
      <TimeOverview
        session={SESSION}
        value={value}
        cursor={413}
        onChange={setValue}
      />
    );
  }

  it("is a slider for the window's start, read as the window", () => {
    render(<Overview />);
    const slider = screen.getByRole("slider", { name: "Time overview" });
    expect(slider.getAttribute("aria-valuetext")).toBe("3.75 s from 412.00 s");
    expect(slider.tabIndex).toBe(0);
    expect(screen.getByText("1,375.69 s")).toBeTruthy();
  });

  it("steps with the arrows, a whole window with Shift, and jumps with Home", () => {
    render(<Overview />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider.getAttribute("aria-valuetext")).toBe("3.75 s from 412.38 s");
    fireEvent.keyDown(slider, { key: "ArrowRight", shiftKey: true });
    expect(slider.getAttribute("aria-valuetext")).toBe("3.75 s from 416.13 s");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider.getAttribute("aria-valuetext")).toBe("3.75 s from 0.00 s");
  });
});

describe("Playback", () => {
  it("plays and pauses, with a speed and the cursor time", () => {
    const onPlayingChange = vi.fn();
    const onSpeedChange = vi.fn();
    const { rerender } = render(
      <Playback
        playing={false}
        onPlayingChange={onPlayingChange}
        speed="1"
        onSpeedChange={onSpeedChange}
        time={412.4}
      />,
    );
    const play = screen.getByRole("button", { name: "Play" });
    expect(play.getAttribute("aria-keyshortcuts")).toBe("Space");
    fireEvent.click(play);
    expect(onPlayingChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("412.40 s")).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "Playback speed" }), {
      target: { value: "2" },
    });
    expect(onSpeedChange).toHaveBeenCalledWith("2");
    rerender(
      <Playback
        playing
        onPlayingChange={onPlayingChange}
        speed="1"
        onSpeedChange={onSpeedChange}
        time={412.4}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(onPlayingChange).toHaveBeenLastCalledWith(false);
  });

  it("reads out a frame in place of the time when given one", () => {
    render(
      <Playback
        playing={false}
        onPlayingChange={() => {}}
        speed="1"
        onSpeedChange={() => {}}
        time={13.7}
        readout="Frame 412 of 113,855"
      />,
    );
    expect(screen.getByText("Frame 412 of 113,855")).toBeTruthy();
    expect(screen.queryByText("13.70 s")).toBeNull();
  });

  it("says when it is waiting for data, in a status that stays mounted", () => {
    const props = {
      playing: true,
      onPlayingChange: () => {},
      speed: "1",
      onSpeedChange: () => {},
      time: 5.85,
    };
    const { rerender } = render(<Playback {...props} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");
    rerender(<Playback {...props} waiting />);
    expect(screen.getByRole("status").textContent).toContain(
      "Waiting for data",
    );
  });
});
