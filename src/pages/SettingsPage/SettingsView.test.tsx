// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsView, type ApiKeys } from "./SettingsView";

afterEach(cleanup);

const KEYS: ApiKeys = {
  dandiApiKey: "dandi-key",
  dandiStagingApiKey: "",
  emberApiKey: "",
};

const setup = (overrides = {}) => {
  const props = {
    keys: KEYS,
    onChange: vi.fn(),
    shown: {
      dandiApiKey: false,
      dandiStagingApiKey: false,
      emberApiKey: false,
    },
    onShownChange: vi.fn(),
    showReload: false,
    onReload: vi.fn(),
    ...overrides,
  };
  render(<SettingsView {...props} />);
  return props;
};

describe("SettingsView", () => {
  it("has the page title and a DANDI and an EMBER section, with no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setup();
    expect(
      screen.getByRole("heading", { level: 1, name: "Settings" }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "DANDI API keys" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "EMBER API keys" })).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("shows each key in a password field with its help", () => {
    setup();
    const fields: [string, string][] = [
      ["DANDI API key", "From your account on dandiarchive.org"],
      [
        "DANDI sandbox API key",
        "From your account on sandbox.dandiarchive.org",
      ],
      ["EMBER API key", "From your account on the EMBER archive"],
    ];
    for (const [label, help] of fields) {
      const input = screen.getByLabelText(label) as HTMLInputElement;
      expect(input.type).toBe("password");
      const described = document.getElementById(
        input.getAttribute("aria-describedby")!,
      );
      expect(described?.textContent).toContain(help);
    }
    expect(
      (screen.getByLabelText("DANDI API key") as HTMLInputElement).value,
    ).toBe("dandi-key");
  });

  it("reports which key changed", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText("EMBER API key"), {
      target: { value: "ember-key" },
    });
    expect(onChange).toHaveBeenCalledWith("emberApiKey", "ember-key");
  });

  it("asks for a reload only once a key has changed, without taking focus", () => {
    setup();
    expect(screen.queryByText("Reload to use the new key")).toBeNull();
    cleanup();
    const { onReload } = setup({ showReload: true });
    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain("Reload to use the new key");
    expect(notice.textContent).toContain(
      "Neurosift reads API keys when a page opens.",
    );
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(screen.getByRole("button", { name: "Reload page" }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("gives each key a show button that reports which key to show", () => {
    const { onShownChange } = setup();
    expect(
      screen.getAllByRole("button", { name: "Show API key" }),
    ).toHaveLength(3);
    fireEvent.click(screen.getAllByRole("button", { name: "Show API key" })[2]);
    expect(onShownChange).toHaveBeenCalledWith("emberApiKey", true);
  });

  it("shows a key as text when asked", () => {
    setup({
      shown: {
        dandiApiKey: true,
        dandiStagingApiKey: false,
        emberApiKey: false,
      },
    });
    expect(screen.getByLabelText("DANDI API key").getAttribute("type")).toBe(
      "text",
    );
    expect(screen.getByLabelText("EMBER API key").getAttribute("type")).toBe(
      "password",
    );
  });
});
