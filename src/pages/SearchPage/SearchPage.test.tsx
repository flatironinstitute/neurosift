// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { CatalogState } from "./useCatalog";
import SearchPage from "./SearchPage";

const catalog: { state: CatalogState } = {
  state: {
    items: [],
    totals: {},
    loading: false,
    loadingMore: false,
    exhausted: true,
    failed: [],
  },
};

vi.mock("./useCatalog", () => ({
  useCatalog: () => ({ ...catalog.state, retry: () => {}, more: () => {} }),
  useTypesIndex: () => ({ index: undefined, failed: false }),
}));
vi.mock("./useRegisterSearchAI", () => ({ default: () => {} }));

beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
});
afterEach(() => {
  cleanup();
  catalog.state = { ...catalog.state, semanticError: undefined };
});

const open = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/search${search}`]}>
      <SearchPage width={1440} height={900} />
    </MemoryRouter>,
  );

const LINES = {
  Keywords:
    "Matches your words in titles, descriptions and other details across DANDI, OpenNeuro and EMBER.",
  Meaning:
    "Finds the 20 Dandisets closest in meaning to your words, even when they use different words. Ranked by an AI model.",
  "Neurodata types":
    "Lists Dandisets with an NWB file holding every type you pick, most matching files first.",
};

describe("SearchPage modes", () => {
  it.each([
    ["", "Keywords"],
    ["?q=hippocampus&mode=basic", "Keywords"],
    ["?q=hippocampus&mode=semantic", "Meaning"],
    ["?mode=types", "Neurodata types"],
  ] as const)("opens %s in %s, described under Search by", (search, name) => {
    open(search);
    expect(
      screen.getByRole("radio", { name }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByRole("radiogroup", {
        name: "Search by",
        description: LINES[name],
      }),
    ).toBeTruthy();
  });

  it("says Meaning and Neurodata types search DANDI only, under the description", () => {
    open("?q=hippocampus&mode=semantic");
    expect(
      screen.getByText("Searching DANDI only. OpenNeuro and EMBER are hidden."),
    ).toBeTruthy();
    expect(
      screen.getAllByText("Meaning and Neurodata types search DANDI only"),
    ).not.toHaveLength(0);
  });

  it("names the modes by their control names when Meaning fails", () => {
    catalog.state = { ...catalog.state, semanticError: "quota" };
    open("?q=hippocampus&mode=semantic");
    expect(
      screen.getByText(
        "Searching by meaning is unavailable right now, often because of API quota limits. Try Keywords.",
      ),
    ).toBeTruthy();
  });

  it("suggests the other modes by name when nothing matches", () => {
    open("?q=zzzz");
    expect(
      screen.getByText(
        "Check the spelling, try Meaning, or clear the filters.",
      ),
    ).toBeTruthy();
    cleanup();
    open("?q=zzzz&mode=semantic");
    expect(
      screen.getByText("Try fewer words or types, or Keywords."),
    ).toBeTruthy();
  });

  it("never uses the old mode names", () => {
    open("?q=zzzz&mode=types");
    expect(document.body.textContent).not.toMatch(/Basic|Semantic|Contains/);
  });
});
