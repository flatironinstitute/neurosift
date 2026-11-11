// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Icon } from "./Icon";

afterEach(cleanup);

describe("Icon", () => {
  it("draws the Carbon icon on its 32px grid in the text color", () => {
    const { container } = render(<Icon name="search" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 32 32");
    expect(svg?.getAttribute("fill")).toBe("currentColor");
    expect(svg?.querySelectorAll("path")).toHaveLength(1);
  });

  it("is 16px by default and takes the four token sizes", () => {
    const { container, rerender } = render(<Icon name="search" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toBe(
      "ns-icon ns-icon--sm",
    );
    for (const size of ["md", "lg", "xl"] as const) {
      rerender(<Icon name="search" size={size} />);
      expect(container.querySelector("svg")?.getAttribute("class")).toBe(
        `ns-icon ns-icon--${size}`,
      );
    }
  });

  it("is hidden from screen readers when it sits beside words", () => {
    const { container } = render(<Icon name="download" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
  });

  it("is announced by its label when it stands alone", () => {
    render(<Icon name="settings" label="Settings" />);
    const img = screen.getByRole("img", { name: "Settings" });
    expect(img.getAttribute("aria-hidden")).toBeNull();
  });

  it("keeps even-odd fills", () => {
    const { container } = render(<Icon name="logo--github" />);
    expect(container.querySelector("path")?.getAttribute("fill-rule")).toBe(
      "evenodd",
    );
  });
});
