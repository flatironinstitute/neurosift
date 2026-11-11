// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ViewError from "./ViewError";

afterEach(cleanup);

describe("ViewError", () => {
  it("names what couldn't be shown and gives the cause, at once and without taking focus", () => {
    render(<ViewError what="the spectrogram" error="request timed out" />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("The spectrogram couldn’t be shown");
    expect(alert.querySelector("code")?.textContent).toBe("request timed out");
    expect(document.activeElement).toBe(document.body);
  });

  it("reads the message of an Error", () => {
    render(<ViewError what="this file" error={new Error("404 Not Found")} />);
    expect(screen.getByRole("alert").querySelector("code")?.textContent).toBe(
      "404 Not Found",
    );
  });

  it("offers Report this in a new tab, and Try again only when the view can retry", () => {
    render(<ViewError what="this file" error="failed" />);
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    const report = screen.getByRole("link", { name: "Report this" });
    expect(report.getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("alert").textContent).toContain(
      "Report it if it keeps happening.",
    );
    cleanup();
    const onRetry = vi.fn();
    render(<ViewError what="this file" error="failed" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toContain(
      "Try again, or report it if it keeps happening.",
    );
  });
});
