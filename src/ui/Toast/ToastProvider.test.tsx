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
import { useToast, type ToastOptions } from "./toastContext";
import { ToastProvider } from "./ToastProvider";

// jsdom has no popover API, and treats the region as hidden; this records what the browser would show.
beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {
    this.dataset.shown = "";
  };
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

let toast: ReturnType<typeof useToast>;
function Grab() {
  toast = useToast();
  return <button type="button">Share</button>;
}

const setup = () =>
  render(
    <ToastProvider>
      <Grab />
    </ToastProvider>,
  );
const show = (options: ToastOptions) => act(() => toast.show(options));
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const polite = () => screen.getByRole("status", { hidden: true });
const assertive = () => screen.getByRole("alert", { hidden: true });
const region = () => polite().parentElement!;

describe("Toast region", () => {
  it("is always in the page, shown in the top layer, with empty live regions", () => {
    setup();
    expect(region().getAttribute("popover")).toBe("manual");
    expect(region().dataset.shown).toBe("");
    expect(polite().textContent).toBe("");
    expect(assertive().textContent).toBe("");
  });

  it("announces confirmations politely and leaves after 4 seconds", () => {
    setup();
    show({ status: "success", message: "Link copied" });
    expect(polite().textContent).toContain("Link copied");
    expect(assertive().textContent).toBe("");
    wait(3999);
    expect(polite().textContent).toContain("Link copied");
    wait(1);
    expect(polite().textContent).toBe("");
  });

  it("announces errors at once and keeps them until dismissed", () => {
    setup();
    show({ status: "error", message: "Couldn’t copy the link." });
    expect(assertive().textContent).toContain("Couldn’t copy the link.");
    wait(60000);
    expect(assertive().textContent).toContain("Couldn’t copy the link.");
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss", hidden: true }),
    );
    expect(assertive().textContent).toBe("");
  });

  it("keeps a busy toast until it's replaced by the result", () => {
    setup();
    show({ message: "Preparing units.csv", busy: true });
    wait(60000);
    expect(polite().textContent).toContain("Preparing units.csv");
    show({ status: "success", message: "units.csv downloaded" });
    expect(polite().textContent).not.toContain("Preparing");
    expect(screen.getAllByText(/units\.csv/)).toHaveLength(1);
  });

  it("shows one toast at a time: a new one replaces the old", () => {
    setup();
    show({ message: "Tab closed" });
    show({ status: "error", message: "Couldn’t close the tab." });
    expect(polite().textContent).toBe("");
    expect(assertive().textContent).toContain("Couldn’t close the tab.");
  });

  it("waits while hovered, then gives 4 more seconds", () => {
    setup();
    show({ message: "Tab closed" });
    fireEvent.pointerEnter(region());
    wait(10000);
    expect(polite().textContent).toContain("Tab closed");
    fireEvent.pointerLeave(region());
    wait(3999);
    expect(polite().textContent).toContain("Tab closed");
    wait(1);
    expect(polite().textContent).toBe("");
  });

  it("waits while focus is inside, and returns focus when it closes", () => {
    setup();
    const share = screen.getByRole("button", { name: "Share" });
    share.focus();
    const undo = vi.fn();
    show({ message: "Tab closed", action: { label: "Undo", onClick: undo } });
    expect(document.activeElement).toBe(share);
    const action = screen.getByRole("button", { name: "Undo", hidden: true });
    act(() => action.focus());
    fireEvent.focusIn(action, { relatedTarget: share });
    wait(10000);
    expect(polite().textContent).toContain("Tab closed");
    fireEvent.click(action);
    expect(undo).toHaveBeenCalledTimes(1);
    expect(polite().textContent).toBe("");
    expect(document.activeElement).toBe(share);
  });

  it("needs a provider", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Grab />)).toThrow(/ToastProvider/);
    error.mockRestore();
  });
});
