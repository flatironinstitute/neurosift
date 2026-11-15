import { describe, expect, it } from "vitest";
import {
  CatalogFeed,
  type Archive,
  type CatalogItem,
  type Source,
} from "./catalogFeed";

const item = (archive: Archive, id: string, modified: string): CatalogItem => ({
  archive,
  id,
  title: id,
  path: `/x/${id}`,
  modified,
  created: modified,
});

/** A fake archive serving fixed pages, counting its requests. */
const source = (archive: Archive, pages: CatalogItem[][], total: number) => {
  let i = 0;
  const s: Source & { calls: number } = {
    archive,
    calls: 0,
    next: async () => {
      s.calls += 1;
      const items = pages[i] ?? [];
      i += 1;
      return { items, total, done: i >= pages.length };
    },
  };
  return s;
};

describe("CatalogFeed", () => {
  it("merges by date across archives, reading a page only when the merge needs it", async () => {
    const dandi = source(
      "DANDI",
      [
        [item("DANDI", "d1", "2026-05"), item("DANDI", "d2", "2026-01")],
        [item("DANDI", "d3", "2025-01")],
      ],
      3,
    );
    const on = source(
      "OpenNeuro",
      [
        [
          item("OpenNeuro", "o1", "2026-03"),
          item("OpenNeuro", "o2", "2024-01"),
        ],
      ],
      2,
    );
    const feed = new CatalogFeed([dandi, on], "modified");
    expect((await feed.more(3)).map((i) => i.id)).toEqual(["d1", "o1", "d2"]);
    expect(dandi.calls).toBe(1);
    expect(feed.totals()).toEqual({ DANDI: 3, OpenNeuro: 2 });
    expect((await feed.more(5)).map((i) => i.id)).toEqual(["d3", "o2"]);
    expect(dandi.calls).toBe(2);
    expect(feed.exhausted()).toBe(true);
  });

  it("takes turns for best match and skips repeats", async () => {
    const dandi = source(
      "DANDI",
      [
        [
          item("DANDI", "d1", "1"),
          item("DANDI", "d1", "1"),
          item("DANDI", "d2", "1"),
        ],
      ],
      2,
    );
    const on = source(
      "OpenNeuro",
      [[item("OpenNeuro", "o1", "9"), item("OpenNeuro", "o2", "9")]],
      2,
    );
    const feed = new CatalogFeed([dandi, on], "best");
    expect((await feed.more(4)).map((i) => i.id)).toEqual([
      "d1",
      "o1",
      "o2",
      "d2",
    ]);
  });

  it("keeps the other archives when one fails, and names it", async () => {
    const broken: Source = {
      archive: "OpenNeuro",
      next: async () => {
        throw new Error("down");
      },
    };
    const dandi = source("DANDI", [[item("DANDI", "d1", "1")]], 1);
    const feed = new CatalogFeed([dandi, broken], "modified");
    expect((await feed.more(25)).map((i) => i.id)).toEqual(["d1"]);
    expect(feed.failed()).toEqual(["OpenNeuro"]);
  });
});
