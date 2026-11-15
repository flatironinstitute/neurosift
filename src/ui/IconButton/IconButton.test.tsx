// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IconButton } from "./IconButton";

afterEach(cleanup);

describe("IconButton", () => {
  it("is a native button named by its label", () => {
    render(<IconButton icon="share" label="Share view" />);
    const button = screen.getByRole("button", { name: "Share view" });
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("is a 32px Secondary button with a 20px icon by default", () => {
    render(<IconButton icon="share" label="Share view" />);
    const button = screen.getByRole("button");
    expect(button.className).toBe(
      "ns-icon-button ns-icon-button--secondary ns-icon-button--md",
    );
    expect(button.querySelector("svg")?.getAttribute("class")).toBe(
      "ns-icon ns-icon--md",
    );
  });

  it("is a 24px Ghost button with a 16px icon in dense places", () => {
    render(
      <IconButton icon="copy" label="Copy path" variant="ghost" size="sm" />,
    );
    const button = screen.getByRole("button");
    expect(button.className).toBe(
      "ns-icon-button ns-icon-button--ghost ns-icon-button--sm",
    );
    expect(button.querySelector("svg")?.getAttribute("class")).toBe(
      "ns-icon ns-icon--sm",
    );
  });

  it("hides the icon itself, since the label names the button", () => {
    render(<IconButton icon="close" label="Close tab" />);
    expect(
      screen
        .getByRole("button")
        .querySelector("svg")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("can't be clicked when disabled", () => {
    const onClick = vi.fn();
    render(
      <IconButton
        icon="download"
        label="Download"
        disabled
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
