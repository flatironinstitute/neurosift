// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Menu } from "./Menu";

afterEach(cleanup);

// jsdom has no popover API; these stand in for the browser's show and hide.
beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {
    this.dispatchEvent(
      Object.assign(new Event("toggle"), { newState: "open" }),
    );
  };
  HTMLElement.prototype.hidePopover = function () {
    this.dispatchEvent(
      Object.assign(new Event("toggle"), { newState: "closed" }),
    );
  };
});

const items = (onSelect = vi.fn()) => [
  { label: "Copy link", onSelect },
  { label: "Download NWB file", meta: "1.2 GB", onSelect },
  { label: "Open in Python", disabled: true, onSelect },
  { label: "View on DANDI", onSelect },
];

const open = () => {
  const trigger = screen.getByRole("button", { name: "Share" });
  const menu = document.getElementById(trigger.getAttribute("popovertarget")!)!;
  act(() => menu.showPopover());
  return trigger;
};

describe("Menu", () => {
  it("renders a button that opens a popover menu, with no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Menu label="Share" items={items()} />);
    const trigger = screen.getByRole("button", { name: "Share" });
    const menu = document.getElementById(
      trigger.getAttribute("popovertarget")!,
    );
    expect(menu?.getAttribute("popover")).toBe("auto");
    expect(menu?.getAttribute("role")).toBe("menu");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("lists items as menu items, with meta text and disabled items", () => {
    render(<Menu label="Share" items={items()} />);
    const all = screen.getAllByRole("menuitem", { hidden: true });
    expect(all.map((i) => i.textContent)).toEqual([
      "Copy link",
      "Download NWB file1.2 GB",
      "Open in Python",
      "View on DANDI",
    ]);
    expect((all[2] as HTMLButtonElement).disabled).toBe(true);
  });

  it("says when it's open and focuses the first item", () => {
    render(<Menu label="Share" items={items()} />);
    const trigger = open();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement?.textContent).toBe("Copy link");
  });

  it("moves with the arrow keys, Home and End, skipping disabled items and wrapping", () => {
    render(<Menu label="Share" items={items()} />);
    open();
    const key = (k: string) =>
      fireEvent.keyDown(document.activeElement!, { key: k });
    key("ArrowDown");
    expect(document.activeElement?.textContent).toContain("Download");
    key("ArrowDown");
    expect(document.activeElement?.textContent).toBe("View on DANDI");
    key("ArrowDown");
    expect(document.activeElement?.textContent).toBe("Copy link");
    key("ArrowUp");
    expect(document.activeElement?.textContent).toBe("View on DANDI");
    key("Home");
    expect(document.activeElement?.textContent).toBe("Copy link");
    key("End");
    expect(document.activeElement?.textContent).toBe("View on DANDI");
  });

  it("runs the item, closes and returns focus to the button", () => {
    const onSelect = vi.fn();
    render(<Menu label="Share" items={items(onSelect)} />);
    const trigger = open();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Copy link", hidden: true }),
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("returns focus to the button when it closes another way, such as Escape", () => {
    render(<Menu label="Share" items={items()} />);
    const trigger = open();
    const menu = document.getElementById(
      trigger.getAttribute("popovertarget")!,
    )!;
    act(() => menu.hidePopover());
    expect(document.activeElement).toBe(trigger);
  });
});
