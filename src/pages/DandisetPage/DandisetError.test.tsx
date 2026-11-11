// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import DandisetError from "./DandisetError";

afterEach(cleanup);

const setup = (status: number | undefined, ember = false) =>
  render(
    <MemoryRouter>
      <DandisetError
        dandisetId="999999"
        failure={{
          status,
          url: ember
            ? "https://api-dandi.emberarchive.org/api/dandisets/999999"
            : "https://api.dandiarchive.org/api/dandisets/999999",
          message: "DANDI has no Dandiset 999999 (404).",
        }}
      />
    </MemoryRouter>,
  );

describe("DandisetError", () => {
  it("says a missing Dandiset couldn't be shown, and why, at once", () => {
    setup(404);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Dandiset 999999 couldn’t be shown");
    expect(alert.textContent).toContain("DANDI has no Dandiset 999999 (404).");
  });

  it("shows the embargo warning when the archive refuses the key", () => {
    for (const status of [401, 403]) {
      setup(status);
      expect(screen.getByRole("status").textContent).toContain(
        "This Dandiset is embargoed",
      );
      expect(screen.getByRole("button", { name: "Add API key" })).toBeTruthy();
      cleanup();
    }
  });

  it("names EMBER for an embargoed EMBER Dandiset", () => {
    setup(403, true);
    expect(screen.getByRole("status").textContent).toContain(
      "Add an EMBER API key",
    );
    expect(
      screen
        .getByRole("link", { name: "Get a key on EMBER" })
        .getAttribute("href"),
    ).toBe("https://dandi.emberarchive.org");
  });
});
