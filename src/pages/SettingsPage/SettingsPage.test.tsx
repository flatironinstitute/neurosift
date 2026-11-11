// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SettingsPage from "./SettingsPage";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("SettingsPage", () => {
  it("shows the keys saved in this browser", () => {
    localStorage.setItem("dandiApiKey", "saved-dandi");
    localStorage.setItem("emberApiKey", "saved-ember");
    render(<SettingsPage />);
    expect(
      (screen.getByLabelText("DANDI API key") as HTMLInputElement).value,
    ).toBe("saved-dandi");
    expect(
      (screen.getByLabelText("DANDI sandbox API key") as HTMLInputElement)
        .value,
    ).toBe("");
    expect(
      (screen.getByLabelText("EMBER API key") as HTMLInputElement).value,
    ).toBe("saved-ember");
  });

  it("saves each key as it's typed, under the names the API requests read", () => {
    render(<SettingsPage />);
    const type = (label: string, value: string) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    type("DANDI API key", "a");
    type("DANDI sandbox API key", "b");
    type("EMBER API key", "c");
    expect(localStorage.getItem("dandiApiKey")).toBe("a");
    expect(localStorage.getItem("dandiStagingApiKey")).toBe("b");
    expect(localStorage.getItem("emberApiKey")).toBe("c");
    expect(screen.getByText("Reload to use the new key")).toBeTruthy();
  });
});
