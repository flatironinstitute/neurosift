// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Toggletip } from "./Toggletip";

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

const setup = () => {
  render(
    <Toggletip title="Shared y-scale">
      All panels use one y-scale per unit, so amplitudes can be compared.
    </Toggletip>,
  );
  const button = screen.getByRole("button", { name: "About shared y-scale" });
  const tip = document.getElementById(button.getAttribute("popovertarget")!)!;
  return { button, tip };
};

describe("Toggletip", () => {
  it("is opened by an info button named after the setting", () => {
    const { button, tip } = setup();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(tip.getAttribute("popover")).toBe("auto");
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("holds a title and the explanation", () => {
    const { tip } = setup();
    expect(tip.querySelector(".ns-toggletip-title")?.textContent).toBe(
      "Shared y-scale",
    );
    expect(tip.textContent).toContain("amplitudes can be compared");
  });

  it("the info button has no tooltip of its own", () => {
    setup();
    expect(document.querySelector(".ns-tooltip")).toBeNull();
  });

  it("says when it's open, and returns focus to the button when it closes", () => {
    const { button, tip } = setup();
    act(() => tip.showPopover());
    expect(button.getAttribute("aria-expanded")).toBe("true");
    tip.focus();
    act(() => tip.hidePopover());
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
  });
});
