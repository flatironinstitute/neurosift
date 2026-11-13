// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import type { ApiKeyAccess } from "../util/apiKeys";
import DandisetError from "./DandisetError";

afterEach(cleanup);

const setup = (
  status: number | undefined,
  access: ApiKeyAccess,
  message: string,
  ember = false,
) =>
  render(
    <MemoryRouter>
      <DandisetError
        dandisetId="999999"
        failure={{
          status,
          access,
          url: ember
            ? "https://api-dandi.emberarchive.org/api/dandisets/999999"
            : "https://api.dandiarchive.org/api/dandisets/999999",
          message,
        }}
      />
    </MemoryRouter>,
  );

describe("DandisetError", () => {
  it("says a Dandiset couldn't be shown, and why, at once", () => {
    setup(500, "failed", "DANDI answered 500 for Dandiset 999999.");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Dandiset 999999 couldn’t be shown");
    expect(alert.textContent).toContain(
      "DANDI answered 500 for Dandiset 999999.",
    );
  });

  it("names EMBER for an embargoed EMBER Dandiset, without a detail line", () => {
    setup(401, "embargoed", "EMBER answered 401 for Dandiset 999999.", true);
    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain("This Dandiset is embargoed");
    expect(notice.textContent).toContain("Add an EMBER API key");
    expect(notice.querySelector(".ns-alert-detail")).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Get a key on EMBER" })
        .getAttribute("href"),
    ).toBe("https://dandi.emberarchive.org");
  });

  it("says a 404 on DANDI may be embargoed, with the 404 as detail", () => {
    setup(404, "notPublic", "DANDI has no Dandiset 999999 (404).");
    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain("DANDI has no public Dandiset 999999");
    expect(notice.querySelector(".ns-alert-detail")?.textContent).toBe(
      "DANDI has no Dandiset 999999 (404).",
    );
  });

  it("shows a refused key as an error with the 401 as detail", () => {
    setup(401, "keyRefused", "DANDI answered 401 for Dandiset 999999.");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("DANDI didn’t accept your API key");
    expect(alert.querySelector(".ns-alert-detail")?.textContent).toBe(
      "DANDI answered 401 for Dandiset 999999.",
    );
  });
});
