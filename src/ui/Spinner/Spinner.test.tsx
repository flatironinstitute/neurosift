// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";

afterEach(cleanup);

describe("Spinner", () => {
  it("announces what is loading when it stands alone", () => {
    render(<Spinner label="Loading spikes for 3 units" />);
    expect(screen.getByRole("status").textContent).toBe(
      "Loading spikes for 3 units",
    );
  });

  it("is hidden from screen readers without a label, as inside a button", () => {
    const { container } = render(<Spinner />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("is drawn at the 16px icon size in the text color", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toBe("ns-spinner-arc");
    expect(svg?.querySelector("circle")?.getAttribute("stroke")).toBe(
      "currentColor",
    );
  });
});
