// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TextPreview from "./TextPreview";

afterEach(cleanup);

const numbered = (count: number) =>
  Array.from({ length: count }, (_, i) => `line ${i + 1}`).join("\n");

describe("TextPreview", () => {
  it("shows a short file whole, with no Show all", () => {
    render(<TextPreview text={numbered(3)} />);
    expect(screen.getByText(/line 3/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("cuts a long file at 200 lines and shows the rest on Show all", () => {
    const { container } = render(<TextPreview text={numbered(250)} />);
    const button = screen.getByRole("button", { name: "Show all 250 lines" });
    const rest = container.querySelector(".ns-disclosure-content")!;
    expect(rest.hasAttribute("hidden")).toBe(true);
    expect(container.querySelector("pre")!.textContent).toMatch(/line 200$/);
    fireEvent.click(button);
    expect(rest.hasAttribute("hidden")).toBe(false);
    expect(rest.textContent).toMatch(/^line 201\n[\s\S]*line 250$/);
    expect(button.textContent).toBe("Hide the last 50 lines");
  });
});
