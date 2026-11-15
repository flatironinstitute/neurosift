// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccordionItem, Disclosure } from "./Accordion";

afterEach(cleanup);

describe("AccordionItem", () => {
  it("is a native details and summary, with no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <AccordionItem
        title="Align to"
        summary="start_time"
        open={false}
        onToggle={vi.fn()}
      >
        Radio list of trial columns.
      </AccordionItem>,
    );
    const details = container.querySelector("details")!;
    expect(details.open).toBe(false);
    expect(details.querySelector("summary")).not.toBeNull();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("reads the title and the current setting together, with the chevron hidden", () => {
    const { container } = render(
      <AccordionItem
        title="Align to"
        summary="start_time"
        open
        onToggle={vi.fn()}
      >
        content
      </AccordionItem>,
    );
    const summary = container.querySelector("summary")!;
    expect(summary.textContent).toBe("Align tostart_time");
    for (const svg of summary.querySelectorAll("svg"))
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("details")!.open).toBe(true);
  });

  it("reports when people open or close it", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <AccordionItem title="Units" open={false} onToggle={onToggle}>
        content
      </AccordionItem>,
    );
    const details = container.querySelector("details")!;
    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("doesn't report a change it was told about", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <AccordionItem title="Units" open onToggle={onToggle}>
        content
      </AccordionItem>,
    );
    fireEvent(container.querySelector("details")!, new Event("toggle"));
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe("Disclosure", () => {
  it("is a button that says what will appear and controls it", () => {
    const onToggle = vi.fn();
    render(
      <Disclosure
        label="Show full description"
        expandedLabel="Show less"
        open={false}
        onToggle={onToggle}
      >
        <p>The full description.</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button", {
      name: "Show full description",
    });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    const content = document.getElementById(
      button.getAttribute("aria-controls")!,
    )!;
    expect(content.hidden).toBe(true);
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("shows the content and its own label when open", () => {
    render(
      <Disclosure
        label="Show full description"
        expandedLabel="Show less"
        open
        onToggle={vi.fn()}
      >
        <p>The full description.</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button", { name: "Show less" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("The full description.")).toBeTruthy();
  });
});
