// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import AuthErrorNotification from "./AuthErrorNotification";

afterEach(cleanup);

const setup = (dandiUrl?: string) =>
  render(
    <MemoryRouter initialEntries={["/nwb"]}>
      <Routes>
        <Route
          path="/nwb"
          element={<AuthErrorNotification dandiUrl={dandiUrl} />}
        />
        <Route path="/settings" element={<p>Settings page</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe("AuthErrorNotification", () => {
  it("says the Dandiset is embargoed and how to open it, politely", () => {
    setup("https://api.dandiarchive.org/api/assets/abc/download/");
    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain("This Dandiset is embargoed");
    expect(notice.textContent).toContain(
      "Add a DANDI API key from an account with access to open its files.",
    );
    expect(document.activeElement).toBe(document.body);
  });

  it("links to a key on DANDI, in a new tab", () => {
    setup("https://api.dandiarchive.org/api/assets/abc/download/");
    const link = screen.getByRole("link", { name: "Get a key on DANDI" });
    expect(link.getAttribute("href")).toBe("https://dandiarchive.org");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("names the sandbox for files on the DANDI sandbox", () => {
    setup("https://api.sandbox.dandiarchive.org/api/assets/abc/download/");
    expect(screen.getByRole("status").textContent).toContain(
      "Add a DANDI sandbox API key",
    );
    const link = screen.getByRole("link", {
      name: "Get a key on the DANDI sandbox",
    });
    expect(link.getAttribute("href")).toBe(
      "https://gui-staging.dandiarchive.org",
    );
  });

  it("opens Settings with Add API key", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Add API key" }));
    expect(screen.getByText("Settings page")).toBeTruthy();
  });
});
