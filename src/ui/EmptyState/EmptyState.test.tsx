// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";

afterEach(cleanup);

describe("EmptyState", () => {
  it("says what is empty and why", () => {
    render(
      <EmptyState title="No units chosen yet">
        Pick units from the list to plot their firing around each trial.
      </EmptyState>,
    );
    expect(screen.getByText("No units chosen yet").className).toBe(
      "ns-empty-title",
    );
    expect(
      screen.getByText(
        "Pick units from the list to plot their firing around each trial.",
      ),
    ).toBeTruthy();
  });

  it("offers one primary action that fills it", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No units chosen yet"
        action={{ label: "Select first 5 units", onClick }}
      >
        Pick units from the list.
      </EmptyState>,
    );
    const button = screen.getByRole("button", { name: "Select first 5 units" });
    expect(button.className).toContain("ns-button--primary");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });

  it("can add a quieter second action", () => {
    render(
      <EmptyState
        title="No Dandisets match “place cells”"
        action={{ label: "Use semantic search", onClick: () => {} }}
        secondary={{ label: "Clear search", onClick: () => {} }}
      >
        Basic search looks for exact words.
      </EmptyState>,
    );
    expect(
      screen.getByRole("button", { name: "Clear search" }).className,
    ).toContain("ns-button--ghost");
  });

  it("shows the view’s icon, hidden from screen readers, and never an illustration", () => {
    const { container } = render(
      <EmptyState title="No data" icon="document">
        This object has no data.
      </EmptyState>,
    );
    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("img")).toBeNull();
  });
});
