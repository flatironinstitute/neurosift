// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const hasAuthError = vi.fn(() => false);
vi.mock("../hdf5Interface", () => ({ hasAuthError }));
const { default: FileError } = await import("./FileError");

afterEach(cleanup);

const URL_ = "https://api.dandiarchive.org/api/assets/abc/download/";
const setup = () =>
  render(
    <MemoryRouter>
      <FileError
        nwbUrl={URL_}
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

  it("shows the embargo warning when DANDI refused the key", () => {
    hasAuthError.mockReturnValue(true);
    setup();
    expect(screen.getByRole("status").textContent).toContain(
      "This Dandiset is embargoed",
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(hasAuthError).toHaveBeenCalledWith(URL_);
  });
});
