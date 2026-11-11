// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Icon } from "../Icon/Icon";
import { Toast } from "./Toast";

afterEach(cleanup);

describe("Toast", () => {
  it("shows the message with a dismiss button, and no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const onDismiss = vi.fn();
    render(<Toast message="Link copied" onDismiss={onDismiss} />);
    expect(screen.getByText("Link copied")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("has no icon when neutral, and a status icon for success and error", () => {
    const { container } = render(
      <Toast message="Tab closed" onDismiss={vi.fn()} />,
    );
    expect(container.querySelector(".ns-toast-icon")).toBeNull();
    cleanup();
    for (const [status, icon] of [
      ["success", "checkmark--outline"],
      ["error", "error"],
    ] as const) {
      const expected = render(<Icon name={icon} />).container.innerHTML;
      cleanup();
      const { container } = render(
        <Toast status={status} message="Done" onDismiss={vi.fn()} />,
      );
      expect(container.querySelector(".ns-toast-icon svg")?.outerHTML).toBe(
        expected,
      );
      cleanup();
    }
  });

  it("shows a spinner while work runs", () => {
    const { container } = render(
      <Toast message="Preparing units.csv" busy onDismiss={vi.fn()} />,
    );
    expect(container.querySelector(".ns-spinner")).not.toBeNull();
  });

  it("runs its one action", () => {
    const undo = vi.fn();
    render(
      <Toast
        message="Tab closed"
        action={{ label: "Undo", onClick: undo }}
        onDismiss={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(undo).toHaveBeenCalledTimes(1);
  });
});
