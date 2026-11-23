// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DatasetMainTab, { PAGE } from "./DatasetMainTab";
import { locationSearch } from "./folderLocation";
import { DatasetFile } from "./plugins/pluginInterface";

afterEach(cleanup);

const file = (
  filepath: string,
  directory = false,
  fileCount?: number,
): DatasetFile => ({
  id: filepath,
  key: filepath,
  filename: filepath.split("/").pop()!,
  filepath,
  parentId: "",
  size: 2048,
  directory,
  urls: directory ? [] : [`https://example.org/${filepath}`],
  fileCount,
});

const TOP = [
  file("sub-10", true, 1),
  file("sub-2", true, 1),
  file("sub-1", true, 2),
  file("dataset_description.json"),
];
const FOLDERS: Record<string, DatasetFile[]> = {
  "sub-1": [file("sub-1/ses-1", true, 1), file("sub-1/sessions.tsv")],
  "sub-1/ses-1": [file("sub-1/ses-1/a.nwb")],
  "sub-2": [file("sub-2/b.nwb")],
};

const setup = (
  location: string | null,
  {
    top = TOP,
    loadFolder = async (path: string) => FOLDERS[path] ?? null,
  }: {
    top?: DatasetFile[];
    loadFolder?: (path: string) => Promise<DatasetFile[] | null>;
  } = {},
) => {
  const onNavigate = vi.fn();
  const onOpenFile = vi.fn();
  const onCopyLink = vi.fn();
  const hrefFor = (path: string) =>
    locationSearch("?dandisetVersion=draft", path);
  const props = {
    topLevelFiles: top,
    onOpenFile,
    loadFolder,
    hrefFor,
    onNavigate,
    onCopyLink,
  };
  const view = render(<DatasetMainTab {...props} location={location} />);
  // The workspace passes the new location back down after onNavigate.
  const moveTo = (next: string | null) =>
    view.rerender(<DatasetMainTab {...props} location={next} />);
  return { onNavigate, onOpenFile, onCopyLink, moveTo };
};

const folderNav = () => screen.getByRole("navigation", { name: "Folder" });
const names = () =>
  [...document.querySelectorAll(".ns-tree-name")].map((n) => n.textContent);
const row = (name: string) =>
  screen
    .getAllByRole("treeitem")
    .find((t) => t.querySelector(".ns-tree-name")?.textContent === name)!;

describe("DatasetMainTab", () => {
  it("starts with every folder closed, sorted by number, with totals", () => {
    setup(null);
    expect(
      within(folderNav()).getByText("All files").getAttribute("aria-current"),
    ).toBe("page");
    expect(names()).toEqual([
      "dataset_description.json",
      "sub-1",
      "sub-2",
      "sub-10",
    ]);
    expect(row("sub-1").getAttribute("aria-expanded")).toBe("false");
    expect(row("sub-1").textContent).toContain("2 files · 2 KB");
    expect(screen.getByText("3 folders · 1 file")).toBeTruthy();
  });

  it("opens a folder in place, makes it current, and puts it in the address", async () => {
    const { onNavigate, moveTo } = setup(null);
    fireEvent.click(screen.getByText("sub-1"));
    expect(await screen.findByText("ses-1")).toBeTruthy();
    expect(screen.getByText("dataset_description.json")).toBeTruthy();
    expect(onNavigate).toHaveBeenCalledWith(
      "?dandisetVersion=draft&location=sub-1",
      { replace: true },
    );
    moveTo("sub-1");
    expect(row("sub-1").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("sub-1: 2 files · 2 KB")).toBeTruthy();
  });

  it("opens every folder down to the one in the address, keeping the rest of the list", async () => {
    const { onNavigate, onOpenFile } = setup("sub-1/ses-1");
    const nwb = await screen.findByText("a.nwb");
    expect(screen.getByText("dataset_description.json")).toBeTruthy();
    expect(row("ses-1").getAttribute("aria-selected")).toBe("true");
    const nav = folderNav();
    expect(within(nav).getByText("ses-1").getAttribute("aria-current")).toBe(
      "page",
    );
    fireEvent.click(within(nav).getByRole("link", { name: "All files" }));
    expect(onNavigate).toHaveBeenCalledWith("?dandisetVersion=draft");
    fireEvent.click(nwb);
    expect(onOpenFile).toHaveBeenCalledWith(FOLDERS["sub-1/ses-1"][0]);
  });

  it("never closes a folder on its own; Collapse others and Collapse all do", async () => {
    const { onNavigate, moveTo } = setup("sub-1/ses-1");
    await screen.findByText("a.nwb");
    fireEvent.click(screen.getByText("sub-2"));
    expect(await screen.findByText("b.nwb")).toBeTruthy();
    expect(screen.getByText("a.nwb")).toBeTruthy();
    moveTo("sub-2");
    fireEvent.click(screen.getByRole("button", { name: "Collapse others" }));
    expect(screen.queryByText("a.nwb")).toBeNull();
    expect(screen.getByText("b.nwb")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.queryByText("b.nwb")).toBeNull();
    expect(onNavigate).toHaveBeenLastCalledWith("?dandisetVersion=draft", {
      replace: true,
    });
  });

  it(`lists ${PAGE} items per level, then shows more`, () => {
    const top = Array.from({ length: 30 }, (_, i) => file(`f-${i + 1}.json`));
    setup(null, { top });
    expect(names()[PAGE - 1]).toBe(`f-${PAGE}.json`);
    const more = screen
      .getAllByRole("treeitem")
      .find((t) => t.textContent?.startsWith("Show 5 more"))!;
    expect(more.textContent).toContain(`${PAGE} of 30 shown`);
    fireEvent.click(more);
    expect(screen.getByText("f-30.json")).toBeTruthy();
  });

  it("shows a folder that failed to load, and loads it again on Try again", async () => {
    let fail = true;
    setup(null, {
      loadFolder: async (path) => {
        if (fail) throw new Error("offline");
        return FOLDERS[path] ?? null;
      },
    });
    fireEvent.click(screen.getByText("sub-2"));
    const error = await screen.findByText("Couldn’t load this folder.");
    fail = false;
    fireEvent.click(error);
    expect(await screen.findByText("b.nwb")).toBeTruthy();
  });

  it("copies a link to a folder from its row", () => {
    const { onCopyLink } = setup(null);
    const button = row("sub-1").querySelector(".ns-tree-action button")!;
    fireEvent.click(button);
    expect(onCopyLink).toHaveBeenCalledWith("sub-1");
    expect(row("sub-1").getAttribute("aria-expanded")).toBe("false");
  });

  it("falls back to All files with a note when the folder isn't there", async () => {
    setup("sub-9");
    expect((await screen.findByRole("status")).textContent).toContain(
      "There’s no folder sub-9 in this dataset",
    );
    expect(screen.getByText("dataset_description.json")).toBeTruthy();
    expect(
      within(folderNav()).getByText("All files").getAttribute("aria-current"),
    ).toBe("page");
  });

  it("falls back the same way for a path that climbs with ..", () => {
    setup("../etc");
    expect(screen.getByRole("status").textContent).toContain(
      "no folder ../etc",
    );
  });
});
