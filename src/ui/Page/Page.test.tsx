// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Page } from "./Page";
import { Section } from "./Section";

afterEach(cleanup);

describe("Page", () => {
  it("names the page with one h1 above its content, with no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Page title="Settings">
        <p>Content</p>
      </Page>,
    );
    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0].tagName).toBe("H1");
    expect(headings[0].textContent).toBe("Settings");
    expect(screen.getByText("Content")).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("Section", () => {
  it("is a region named by its h2 title", () => {
    render(
      <Section title="DANDI API keys">
        <p>Fields</p>
      </Section>,
    );
    const region = screen.getByRole("region", { name: "DANDI API keys" });
    expect(region.tagName).toBe("SECTION");
    expect(
      screen.getByRole("heading", { level: 2, name: "DANDI API keys" }),
    ).toBeTruthy();
    expect(region.textContent).toContain("Fields");
  });

  it("gives each section its own name", () => {
    render(
      <>
        <Section title="DANDI">a</Section>
        <Section title="EMBER">b</Section>
      </>,
    );
    expect(screen.getByRole("region", { name: "DANDI" }).textContent).toContain(
      "a",
    );
    expect(screen.getByRole("region", { name: "EMBER" }).textContent).toContain(
      "b",
    );
  });
});
