import { describe, expect, it } from "vitest";
import { buildDandisetsSearchUrl } from "./dandisetsSearchUrl";

describe("buildDandisetsSearchUrl", () => {
  it("encodes characters that would otherwise break the query string", () => {
    const url = buildDandisetsSearchUrl({
      apiBaseUrl: "https://api.dandiarchive.org",
      searchQuery: "cortex & hippocampus #2 C++",
      embargoed: false,
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://api.dandiarchive.org/api/dandisets/",
    );
    expect(parsed.searchParams.get("search")).toBe(
      "cortex & hippocampus #2 C++",
    );
    expect(parsed.searchParams.get("empty")).toBe("true");
    expect(parsed.searchParams.get("embargoed")).toBe("false");
    expect(parsed.searchParams.get("page_size")).toBe("50");
    expect(parsed.searchParams.get("ordering")).toBe("-modified");
    expect(parsed.searchParams.get("draft")).toBe("true");
  });

  it("hides empty dandisets when there is no search text", () => {
    const url = buildDandisetsSearchUrl({
      apiBaseUrl: "https://api.sandbox.dandiarchive.org",
      searchQuery: "",
      embargoed: true,
    });
    const parsed = new URL(url);
    expect(parsed.host).toBe("api.sandbox.dandiarchive.org");
    expect(parsed.searchParams.get("search")).toBe("");
    expect(parsed.searchParams.get("empty")).toBe("false");
    expect(parsed.searchParams.get("embargoed")).toBe("true");
  });
});
