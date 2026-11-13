// @vitest-environment jsdom
import { act, render, renderHook } from "@testing-library/react";
import { ReactNode, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProvideTimeseriesSelection,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import {
  PLAYING_ELSEWHERE,
  usePlaybackClock,
  useWindowPlayback,
  type WindowPlayback,
} from "./usePlayback";

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"],
  });
});
afterEach(() => vi.useRealTimers());

const elapsed = (advance: { mock: { calls: [number][] } }) =>
  advance.mock.calls.reduce((sum, [seconds]) => sum + seconds, 0);
const run = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("usePlaybackClock", () => {
  it("never starts by itself, then advances by elapsed time × speed", () => {
    const advance = vi.fn((_seconds: number) => true);
    const { result } = renderHook(() => usePlaybackClock(advance));
    run(500);
    expect(advance).not.toHaveBeenCalled();
    act(() => result.current.setPlaying(true));
    run(1000);
    const total = elapsed(advance);
    expect(total).toBeGreaterThan(0.95);
    expect(total).toBeLessThanOrEqual(1.0001);
    act(() => result.current.setSpeed("4"));
    advance.mockClear();
    run(1000);
    const fast = elapsed(advance);
    expect(fast).toBeCloseTo(4, 1);
  });

  it("holds while data loads, and says so after a moment", () => {
    const advance = vi.fn((_seconds: number) => true);
    const { result } = renderHook(() => usePlaybackClock(advance));
    act(() => {
      result.current.setPlaying(true);
      result.current.hold(true);
    });
    run(100);
    expect(advance).not.toHaveBeenCalled();
    expect(result.current.waiting).toBe(false);
    run(400);
    expect(result.current.waiting).toBe(true);
    expect(result.current.playing).toBe(true);
    act(() => result.current.hold(false));
    run(100);
    expect(advance).toHaveBeenCalled();
    expect(result.current.waiting).toBe(false);
    const total = elapsed(advance);
    expect(total).toBeLessThan(0.2);
  });

  it("pauses when the advance reaches the end", () => {
    const { result } = renderHook(() => usePlaybackClock(() => false));
    act(() => result.current.setPlaying(true));
    run(50);
    expect(result.current.playing).toBe(false);
  });
});

const Session = ({ children }: { children: ReactNode }) => (
  <ProvideTimeseriesSelection>
    <Init />
    {children}
  </ProvideTimeseriesSelection>
);
const Init = () => {
  const { initializeTimeseriesSelection } = useTimeseriesSelection();
  useEffect(() => {
    initializeTimeseriesSelection({
      startTimeSec: 0,
      endTimeSec: 100,
      initialVisibleStartTimeSec: 10,
      initialVisibleEndTimeSec: 14,
    });
  }, [initializeTimeseriesSelection]);
  return null;
};

const renderWindow = () =>
  renderHook(
    () => ({
      playback: useWindowPlayback(),
      selection: useTimeseriesSelection(),
    }),
    { wrapper: Session },
  );

describe("useWindowPlayback", () => {
  it("moves the shared window and cursor in real time, reading out the right edge", () => {
    const { result } = renderWindow();
    expect(result.current.playback.time).toBe(14);
    act(() => result.current.playback.setPlaying(true));
    run(1000);
    const { visibleStartTimeSec, visibleEndTimeSec, currentTime } =
      result.current.selection;
    expect(visibleStartTimeSec).toBeCloseTo(11, 1);
    expect(visibleEndTimeSec! - visibleStartTimeSec!).toBeCloseTo(4);
    expect(currentTime).toBeCloseTo(visibleEndTimeSec!);
    expect(result.current.playback.time).toBeCloseTo(visibleEndTimeSec!);
    expect(result.current.playback.playing).toBe(true);
  });

  it("pauses when someone else moves or zooms the window", () => {
    const { result } = renderWindow();
    act(() => result.current.playback.setPlaying(true));
    run(200);
    act(() => result.current.selection.setVisibleTimeRange(50, 52));
    run(50);
    expect(result.current.playback.playing).toBe(false);
    expect(result.current.selection.visibleStartTimeSec).toBe(50);
  });

  it("pauses at the end, and plays again from the start", () => {
    const { result } = renderWindow();
    act(() => result.current.selection.setVisibleTimeRange(95, 99));
    act(() => {
      result.current.playback.setSpeed("8");
      result.current.playback.setPlaying(true);
    });
    run(1000);
    expect(result.current.playback.playing).toBe(false);
    expect(result.current.selection.visibleEndTimeSec).toBeCloseTo(100);
    act(() => result.current.playback.setPlaying(true));
    run(20);
    expect(result.current.playback.playing).toBe(true);
    expect(result.current.selection.visibleStartTimeSec).toBeLessThan(1);
  });

  it("toggles on Space", () => {
    const { result } = renderWindow();
    const target = document.createElement("div");
    const event = {
      key: " ",
      target,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;
    act(() => result.current.playback.onKeyDown(event));
    expect(result.current.playback.playing).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
  });
});

describe("one player at a time", () => {
  type Players = Record<string, WindowPlayback>;
  const Player = ({ name, players }: { name: string; players: Players }) => {
    players[name] = useWindowPlayback();
    return null;
  };
  const renderPlayers = (names: string[], players: Players) =>
    render(
      <Session>
        {names.map((name) => (
          <Player key={name} name={name} players={players} />
        ))}
      </Session>,
    );

  it("turns off the other players while one plays, until it pauses", () => {
    const players: Players = {};
    renderPlayers(["xy", "traces"], players);
    expect(players.traces.disabledReason).toBeUndefined();
    act(() => players.xy.setPlaying(true));
    expect(players.xy.disabledReason).toBeUndefined();
    expect(players.traces.disabledReason).toBe(PLAYING_ELSEWHERE);
    act(() => players.traces.setPlaying(true));
    expect(players.traces.playing).toBe(false);
    act(() => players.xy.setPlaying(false));
    expect(players.traces.disabledReason).toBeUndefined();
  });

  it("ignores Space on a turned-off player", () => {
    const players: Players = {};
    renderPlayers(["xy", "traces"], players);
    act(() => players.xy.setPlaying(true));
    const event = {
      key: " ",
      target: document.createElement("div"),
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;
    act(() => players.traces.onKeyDown(event));
    expect(players.traces.playing).toBe(false);
    expect(players.xy.playing).toBe(true);
  });

  it("turns the others back on when the playing view closes", () => {
    const players: Players = {};
    const { rerender } = renderPlayers(["xy", "traces"], players);
    act(() => players.xy.setPlaying(true));
    expect(players.traces.disabledReason).toBe(PLAYING_ELSEWHERE);
    rerender(
      <Session>
        <Player key="traces" name="traces" players={players} />
      </Session>,
    );
    expect(players.traces.disabledReason).toBeUndefined();
  });

  it("doesn't block a player in another tab's time window", () => {
    const first: Players = {};
    const second: Players = {};
    renderPlayers(["xy"], first);
    renderPlayers(["xy"], second);
    act(() => first.xy.setPlaying(true));
    expect(second.xy.disabledReason).toBeUndefined();
  });

  it("frees the window when playback reaches the end", () => {
    const players: Players = {};
    renderPlayers(["xy", "traces"], players);
    act(() => {
      players.xy.setSpeed("8");
      players.xy.setPlaying(true);
    });
    run(15000);
    expect(players.xy.playing).toBe(false);
    expect(players.traces.disabledReason).toBeUndefined();
  });
});
