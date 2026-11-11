// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { IconButton } from "../IconButton/IconButton";

// jsdom has no popover API; these record what the browser would show.
beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {
    this.dataset.shown = "";
  };
  HTMLElement.prototype.hidePopover = function () {
    delete this.dataset.shown;
  };
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

const tooltip = () => document.querySelector<HTMLElement>(".ns-tooltip")!;
const shown = () => tooltip().dataset.shown !== undefined;
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const hover = (el: Element) =>
  fireEvent.pointerEnter(el, { pointerType: "mouse" });

describe("Tooltip on an icon button", () => {
  it("shows the button's label, hidden from screen readers so the name isn't read twice", () => {
    render(<IconButton icon="settings" label="Settings" />);
    const button = screen.getByRole("button", { name: "Settings" });
    expect(tooltip().textContent).toBe("Settings");
    expect(tooltip().getAttribute("aria-hidden")).toBe("true");
    expect(tooltip().getAttribute("popover")).toBe("manual");
    expect(button.getAttribute("aria-describedby")).toBeNull();
  });

  it("shows a keyboard key in words, and announces it on the button by its standard name", () => {
    render(
      <IconButton icon="skip--back" label="Earlier" shortcut="ArrowLeft" />,
    );
    expect(screen.getByRole("button").getAttribute("aria-keyshortcuts")).toBe(
      "ArrowLeft",
    );
    expect(tooltip().querySelector("kbd")?.textContent).toBe("Left arrow");
  });

  it("appears 500ms after the pointer arrives, not before", () => {
    render(<IconButton icon="settings" label="Settings" />);
    hover(screen.getByRole("button"));
    wait(499);
    expect(shown()).toBe(false);
    wait(1);
    expect(shown()).toBe(true);
  });

  it("appears at once on keyboard focus", () => {
    render(<IconButton icon="settings" label="Settings" />);
    const button = screen.getByRole("button");
    vi.spyOn(button, "matches").mockImplementation(
      (s) => s === ":focus-visible",
    );
    fireEvent.focus(button);
    expect(shown()).toBe(true);
  });

  it("hides on Escape, on blur and when the pointer leaves", () => {
    render(<IconButton icon="settings" label="Settings" />);
    const button = screen.getByRole("button");
    hover(button);
    wait(500);
    fireEvent.keyDown(button, { key: "Escape" });
    expect(shown()).toBe(false);
    hover(button);
    wait(500);
    fireEvent.blur(button);
    expect(shown()).toBe(false);
    hover(button);
    wait(500);
    fireEvent.pointerLeave(button, { pointerType: "mouse" });
    wait(200);
    expect(shown()).toBe(false);
  });

  it("stays while the pointer moves onto the tooltip itself", () => {
    render(<IconButton icon="settings" label="Settings" />);
    const button = screen.getByRole("button");
    hover(button);
    wait(500);
    fireEvent.pointerLeave(button, { pointerType: "mouse" });
    fireEvent.pointerEnter(tooltip(), { pointerType: "mouse" });
    wait(500);
    expect(shown()).toBe(true);
  });

  it("doesn't appear on touch", () => {
    render(<IconButton icon="settings" label="Settings" />);
    fireEvent.pointerEnter(screen.getByRole("button"), {
      pointerType: "touch",
    });
    wait(1000);
    expect(shown()).toBe(false);
  });

  it("can be left off, for buttons that open their own explanation", () => {
    render(
      <IconButton
        icon="information"
        label="About shared y-scale"
        tooltip={false}
      />,
    );
    expect(document.querySelector(".ns-tooltip")).toBeNull();
  });
});
