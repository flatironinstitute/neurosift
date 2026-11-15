import { describe, expect, it, vi } from "vitest";

const groups: Record<string, unknown> = {
  "/acquisition": {
    subgroups: [{ path: "/acquisition/lick_times" }],
    datasets: [{ path: "/acquisition/timestamps" }],
  },
};
vi.mock("../hdf5Interface", () => ({
  getHdf5Group: vi.fn(async (_url: string, path: string) => groups[path]),
}));
const { objectExists } = await import("./index");

describe("objectExists", () => {
  it("finds groups and datasets their parent lists", async () => {
    expect(await objectExists("f", "/acquisition/lick_times")).toBe(true);
    expect(await objectExists("f", "/acquisition/timestamps")).toBe(true);
    expect(await objectExists("f", "/")).toBe(true);
  });

  it("says no for an object the file doesn't have, or whose parent is missing", async () => {
    expect(await objectExists("f", "/acquisition/does_not_exist")).toBe(false);
    expect(await objectExists("f", "/processing/behavior/x")).toBe(false);
  });
});
