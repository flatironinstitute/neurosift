// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthError } from "../hdf5Interface";

const getAuthError = vi.fn((url: string): AuthError | undefined => {
  void url;
  return undefined;
});
vi.mock("../hdf5Interface", () => ({ getAuthError }));
const { default: FileError } = await import("./FileError");

afterEach(cleanup);

const EMBER_URL =
  "https://api-dandi.emberarchive.org/api/assets/8a349d06-f0ea-453f-987c-48f62cc35ae7/download/";
const setup = () =>
  render(
    <MemoryRouter>
      <FileError
        nwbUrl={EMBER_URL}
        dandisetId="000200"
        error="Neurosift couldn’t read an NWB file at this address."
      />
    </MemoryRouter>,
  );

describe("FileError", () => {
  it("says the file couldn't be shown and why, at once", () => {
    setup();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("This file couldn’t be shown");
    expect(alert.textContent).toContain(
      "Neurosift couldn’t read an NWB file at this address.",
    );
  });

  it("asks for a key when the archive answered 401 without one", () => {
    getAuthError.mockReturnValue({ access: "embargoed", status: 401 });
    setup();
    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain("This file needs an EMBER API key");
    expect(notice.textContent).toContain("It is in Dandiset 000200");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(getAuthError).toHaveBeenCalledWith(EMBER_URL);
  });

  it("blocks with the 401 as detail when the archive refused the key", () => {
    getAuthError.mockReturnValue({ access: "keyRefused", status: 401 });
    setup();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("EMBER didn’t accept your API key");
    expect(alert.querySelector(".ns-alert-detail")?.textContent).toBe(
      "EMBER answered 401 for this file.",
    );
  });
});
