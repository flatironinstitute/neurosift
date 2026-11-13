// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

afterEach(cleanup);

describe("Button", () => {
  it("is a native button that doesn't submit forms by default", () => {
    render(<Button>Share view</Button>);
    const button = screen.getByRole("button", { name: "Share view" });
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("is Secondary and Medium unless told otherwise, so Primary is a choice", () => {
    render(<Button>Share view</Button>);
    expect(screen.getByRole("button").className).toBe(
      "ns-button ns-button--secondary ns-button--md",
    );
  });

  it("takes the four styles and three sizes", () => {
    const { rerender } = render(<Button>Open file</Button>);
    for (const variant of [
      "primary",
      "secondary",
      "ghost",
      "destructive",
    ] as const) {
      for (const size of ["lg", "md", "sm"] as const) {
        rerender(
          <Button variant={variant} size={size}>
            Open file
          </Button>,
        );
        expect(screen.getByRole("button").className).toBe(
          `ns-button ns-button--${variant} ns-button--${size}`,
        );
      }
    }
  });

  it("puts one 16px icon before the label, hidden from screen readers", () => {
    render(<Button icon="download">Download</Button>);
    const button = screen.getByRole("button", { name: "Download" });
    const svg = button.firstElementChild;
    expect(svg?.tagName.toLowerCase()).toBe("svg");
    expect(svg?.getAttribute("class")).toBe("ns-icon ns-icon--sm");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("can't be clicked or focused when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Open file
      </Button>,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("while loading, keeps its label and focus, says it's busy and ignores clicks", () => {
    const onClick = vi.fn();
    render(
      <Button loading icon="download" onClick={onClick}>
        Download
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Download" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(button.querySelector(".ns-spinner")).not.toBeNull();
    expect(button.querySelector(".ns-icon")).toBeNull();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("while loading without an icon, centers the spinner over the label, which still names it", () => {
    render(<Button loading>Open file</Button>);
    const button = screen.getByRole("button", { name: "Open file" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.dataset.spinner).toBe("center");
    expect(button.querySelector(".ns-spinner")).not.toBeNull();
    expect(button.querySelector(".ns-button-label")?.textContent).toBe(
      "Open file",
    );
  });

  it("while loading with an icon, swaps the icon and keeps the label in view", () => {
    render(
      <Button loading icon="download">
        Download
      </Button>,
    );
    expect(screen.getByRole("button").dataset.spinner).toBeUndefined();
  });

  it("as a toggle says whether it's pressed, and only then", () => {
    const { rerender } = render(<Button variant="ghost">Helpful</Button>);
    const button = screen.getByRole("button", { name: "Helpful" });
    expect(button.hasAttribute("aria-pressed")).toBe(false);
    rerender(
      <Button variant="ghost" pressed={false}>
        Helpful
      </Button>,
    );
    expect(button.getAttribute("aria-pressed")).toBe("false");
    rerender(
      <Button variant="ghost" pressed>
        Helpful
      </Button>,
    );
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("as Link is a native button that reads like a link in running text, at the text's size", () => {
    const onClick = vi.fn();
    render(
      <p>
        Add an API key in{" "}
        <Button variant="link" size="sm" onClick={onClick}>
          Settings
        </Button>
        .
      </p>,
    );
    const button = screen.getByRole("button", { name: "Settings" });
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toBe("ns-button ns-button--link");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("as Link can be disabled, and then can't be clicked", () => {
    const onClick = vi.fn();
    render(
      <Button variant="link" disabled onClick={onClick}>
        Add a comment?
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Add a comment?" });
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is a link when it goes somewhere", () => {
    render(
      <Button href="https://dandiarchive.org" icon="launch">
        View on DANDI
      </Button>,
    );
    const link = screen.getByRole("link", { name: "View on DANDI" });
    expect(link.getAttribute("href")).toBe("https://dandiarchive.org");
    expect(link.className).toBe("ns-button ns-button--secondary ns-button--md");
    expect(link.getAttribute("type")).toBeNull();
  });
});
