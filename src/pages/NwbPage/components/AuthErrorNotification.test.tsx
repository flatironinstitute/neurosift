// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import type { NoticeAccess } from "../../util/apiKeys";
import AuthErrorNotification from "./AuthErrorNotification";

afterEach(cleanup);

const DANDI_URL = "https://api.dandiarchive.org/api/assets/abc/download/";
const EMBER_URL = "https://api-dandi.emberarchive.org/api/assets/abc/download/";

const SettingsSpy = () => {
  const { search } = useLocation();
  return <p>Settings page {search}</p>;
};

const setup = (
  access: NoticeAccess,
  props: {
    dandiUrl?: string;
    dandisetId?: string;
    file?: boolean;
    detail?: string;
  } = {},
) =>
  render(
    <MemoryRouter initialEntries={["/nwb?url=x"]}>
      <Routes>
        <Route
          path="/nwb"
          element={<AuthErrorNotification access={access} {...props} />}
        />
        <Route path="/settings" element={<SettingsSpy />} />
      </Routes>
    </MemoryRouter>,
  );

describe("AuthErrorNotification", () => {
  it("says the Dandiset is embargoed and how to open it, politely", () => {
    setup("embargoed", { dandiUrl: DANDI_URL });
    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain("This Dandiset is embargoed");
    expect(notice.textContent).toContain(
      "Add a DANDI API key from an account with access to open it.",
    );
    expect(document.activeElement).toBe(document.body);
  });

  it("links to a key on DANDI, in a new tab", () => {
    setup("embargoed", { dandiUrl: DANDI_URL });
    const link = screen.getByRole("link", { name: "Get a key on DANDI" });
    expect(link.getAttribute("href")).toBe("https://dandiarchive.org");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("names the sandbox for files on the DANDI sandbox", () => {
    setup("embargoed", {
      dandiUrl: "https://api.sandbox.dandiarchive.org/api/assets/abc/download/",
    });
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

  it("names the file and its Dandiset on the file page", () => {
    setup("embargoed", {
      dandiUrl: EMBER_URL,
      dandisetId: "000200",
      file: true,
    });
    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain("This file needs an EMBER API key");
    expect(notice.textContent).toContain(
      "It is in Dandiset 000200, which is embargoed. Add an EMBER API key",
    );
  });

  it("says a 404 on DANDI may be an embargo, with the 404 as detail", () => {
    setup("notPublic", {
      dandiUrl: DANDI_URL,
      dandisetId: "001675",
      detail: "DANDI has no Dandiset 001675 (404).",
    });
    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain("DANDI has no public Dandiset 001675");
    expect(notice.textContent).toContain(
      "It may be embargoed. If your DANDI account has access, add its API key and Neurosift will look again.",
    );
    expect(notice.querySelector(".ns-alert-detail")?.textContent).toBe(
      "DANDI has no Dandiset 001675 (404).",
    );
    expect(screen.getByRole("button", { name: "Add API key" })).toBeTruthy();
  });

  it("blocks with an error when a refused key can't open embargoed data", () => {
    setup("keyRefused", {
      dandiUrl: EMBER_URL,
      detail: "EMBER answered 401 for Dandiset 000200.",
    });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("EMBER didn’t accept your API key");
    expect(alert.textContent).not.toMatch(/expire/i);
    expect(
      screen.getByRole("button", { name: "Replace API key" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Get your key on EMBER" }),
    ).toBeTruthy();
  });

  it("warns, with Replace API key only, when public data opened without the key", () => {
    setup("keyRefusedOpen", { dandiUrl: DANDI_URL });
    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain("DANDI didn’t accept your API key");
    expect(notice.textContent).toContain(
      "Public data still opens; embargoed data needs a working key.",
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("opens Settings, which knows the page to come back to", () => {
    setup("keyRefusedOpen", { dandiUrl: DANDI_URL });
    fireEvent.click(screen.getByRole("button", { name: "Replace API key" }));
    expect(screen.getByText(/Settings page/).textContent).toContain(
      `?return=${encodeURIComponent("/nwb?url=x")}`,
    );
  });
});
