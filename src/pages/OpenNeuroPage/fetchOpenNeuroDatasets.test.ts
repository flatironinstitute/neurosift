import { afterEach, describe, expect, it, vi } from "vitest";
import fetchOpenNeuroDatasets from "./fetchOpenNeuroDatasets";

// OpenNeuro's search schema as of October 2026 (API version 5.8.0), from an
// introspection query: the arguments of Query.advancedSearch, a few of the
// fields of DatasetSearchInput, and the values of SearchSortOption.
const ADVANCED_SEARCH_ARGS = [
  "query",
  "allDatasets",
  "datasetType",
  "datasetStatus",
  "first",
  "after",
];
const SEARCH_INPUT_FIELDS = ["keywords", "sortBy", "modality", "publicOnly"];
const SORT_OPTIONS = [
  "activity",
  "last_updated",
  "name_asc",
  "name_desc",
  "newest",
  "oldest",
  "relevance",
];

const node = (id: string) => ({ id, created: "2026-10-05T00:00:00.000Z" });

// Stands in for the OpenNeuro GraphQL endpoint. Like the real one, it answers
// 400 to a query that does not fit the schema.
const mockOpenNeuro = () => {
  const searches: Record<string, unknown>[] = [];
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    const { variables, query } = JSON.parse(String(init.body));
    const args = /advancedSearch\(([^)]*)\)/.exec(query)?.[1] ?? "";
    const argNames = [...args.matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
    const valid =
      /\$query:\s*DatasetSearchInput!/.test(query) &&
      argNames.every((a) => ADVANCED_SEARCH_ARGS.includes(a)) &&
      Object.keys(variables.query).every((k) =>
        SEARCH_INPUT_FIELDS.includes(k),
      ) &&
      (variables.query.sortBy === undefined ||
        SORT_OPTIONS.includes(variables.query.sortBy));
    if (!valid) return new Response("{}", { status: 400 });

    searches.push(variables.query);
    return new Response(
      JSON.stringify({
        data: {
          datasets: { edges: [{ node: node("ds008898") }] },
        },
      }),
    );
  });
  return searches;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchOpenNeuroDatasets", () => {
  it("lists the newest datasets when there is no search text", async () => {
    const searches = mockOpenNeuro();
    const datasets = await fetchOpenNeuroDatasets("");
    expect(datasets.map((d) => d.id)).toEqual(["ds008898"]);
    expect(searches).toEqual([{ sortBy: "newest" }]);
  });

  it("sends each word of the search text as a keyword", async () => {
    const searches = mockOpenNeuro();
    await fetchOpenNeuroDatasets("  balloon   risk ");
    expect(searches).toEqual([
      { sortBy: "newest", keywords: ["balloon", "risk"] },
    ]);
  });

  it("throws when OpenNeuro rejects the query", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 400 }));
    await expect(fetchOpenNeuroDatasets("balloon")).rejects.toThrow(
      "Failed to fetch OpenNeuro datasets",
    );
  });
});
