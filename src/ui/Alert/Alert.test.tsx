// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Icon, type IconName } from "../Icon/Icon";
import { Alert, type AlertStatus } from "./Alert";

afterEach(cleanup);

const iconMarkup = (name: IconName) =>
  render(<Icon name={name} size="md" />).container.innerHTML;

const STATUS_ICONS: [AlertStatus, IconName][] = [
  ["info", "information"],
  ["success", "checkmark--outline"],
  ["warning", "warning--alt"],
  ["error", "error"],
];

describe("Alert", () => {
  it("renders a title and message with no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Alert status="warning" title="This Dandiset is embargoed">
        Add a DANDI API key from an account with access to open its files.
      </Alert>,
    );
    expect(screen.getByText("This Dandiset is embargoed")).toBeTruthy();
    expect(screen.getByText(/Add a DANDI API key/)).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it.each(STATUS_ICONS)(
    "shows the %s status with its own 20px icon",
    (status, icon) => {
      const expected = iconMarkup(icon);
      cleanup();
      const { container } = render(<Alert status={status}>Message</Alert>);
      expect(container.querySelector("svg")?.outerHTML).toBe(expected);
    },
  );

  it("announces errors at once and other statuses politely", () => {
    render(<Alert status="error">Failed</Alert>);
    expect(screen.getByRole("alert").textContent).toContain("Failed");
    cleanup();
    for (const status of ["info", "success", "warning"] as const) {
      render(<Alert status={status}>Note</Alert>);
      expect(screen.getByRole("status")).toBeTruthy();
      expect(screen.queryByRole("alert")).toBeNull();
      cleanup();
    }
  });

  it("never takes focus", () => {
    render(
      <Alert
        status="error"
        actions={[{ label: "Try again", onClick: vi.fn() }]}
      >
        Failed
      </Alert>,
    );
    expect(document.activeElement).toBe(document.body);
  });

  it("shows technical detail as code under the message", () => {
    render(
      <Alert
        status="error"
        title="The PSTH couldn’t be drawn"
        detail="Reading /units/spike_times failed: the request timed out after 15 s."
      >
        Try again, or report it if it keeps happening.
      </Alert>,
    );
    expect(document.querySelector("code")?.textContent).toBe(
      "Reading /units/spike_times failed: the request timed out after 15 s.",
    );
  });

  it("shows up to two small actions, Secondary then Ghost, as buttons or links", () => {
    const retry = vi.fn();
    render(
      <Alert
        status="error"
        actions={[
          { label: "Try again", onClick: retry },
          { label: "Report this", href: "https://github.com/" },
        ]}
      >
        Failed
      </Alert>,
    );
    const button = screen.getByRole("button", { name: "Try again" });
    const link = screen.getByRole("link", { name: "Report this" });
    expect(button.className).toContain("ns-button--secondary");
    expect(button.className).toContain("ns-button--sm");
    expect(link.className).toContain("ns-button--ghost");
    expect(link.className).toContain("ns-button--sm");
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("makes an action Primary when asked, and the other Secondary", () => {
    const allow = vi.fn();
    render(
      <Alert
        status="warning"
        title="Run this code?"
        actions={[
          { label: "Allow", onClick: allow, primary: true },
          { label: "Deny", onClick: vi.fn() },
        ]}
      >
        The assistant wants to run a Python script.
      </Alert>,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Allow", "Deny"]);
    expect(buttons[0].className).toBe(
      "ns-button ns-button--primary ns-button--sm",
    );
    expect(buttons[1].className).toBe(
      "ns-button ns-button--secondary ns-button--sm",
    );
    fireEvent.click(buttons[0]);
    expect(allow).toHaveBeenCalledTimes(1);
  });

  it("shows a button action as loading, which ignores clicks", () => {
    const refresh = vi.fn();
    render(
      <Alert
        status="info"
        actions={[{ label: "Refresh status", onClick: refresh, loading: true }]}
      >
        Waiting
      </Alert>,
    );
    const button = screen.getByRole("button", { name: "Refresh status" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(button);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("opens a link action in a new tab when asked", () => {
    render(
      <Alert
        status="error"
        actions={[
          { label: "Try again", onClick: vi.fn() },
          { label: "Report this", href: "https://github.com/", newTab: true },
        ]}
      >
        Failed
      </Alert>,
    );
    const link = screen.getByRole("link", { name: "Report this" });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("has a dismiss button only when it can be dismissed", () => {
    render(<Alert status="info">Note</Alert>);
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    cleanup();
    const onDismiss = vi.fn();
    render(
      <Alert status="info" onDismiss={onDismiss}>
        Note
      </Alert>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
