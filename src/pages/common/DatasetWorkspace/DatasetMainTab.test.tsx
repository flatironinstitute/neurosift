// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DatasetMainTab from "./DatasetMainTab";
import { locationSearch } from "./folderLocation";
import { DatasetFile } from "./plugins/pluginInterface";

afterEach(cleanup);

const file = (filepath: string, directory = false): DatasetFile => ({
  id: filepath,
  key: filepath,
  filename: filepath.split("/").pop()!,
  filepath,
  parentId: "",
  size: 2048,
  directory,
  urls: directory ? [] : [`https://example.org/${filepath}`],
});

const TOP = [file("sub-1", true), file("dataset_description.json")];
const FOLDERS: Record<string, DatasetFile[]> = {
  "sub-1": [file("sub-1/ses-1", true)],
  "sub-1/ses-1": [file("sub-1/ses-1/a.nwb")],
};

const setup = (location: string | null) => {
  const onNavigate = vi.fn();
  const onOpenFile = vi.fn();
  const hrefFor = (path: string) =>
    locationSearch("?dandisetVersion=draft", path);
  render(
    <DatasetMainTab
      topLevelFiles={TOP}
      onOpenFile={onOpenFile}
      location={location}
      loadFolder={async (path) => FOLDERS[path] ?? null}
      hrefFor={hrefFor}
      onNavigate={onNavigate}
      onCopyLink={() => {}}
    />,
  );
  return { onNavigate, onOpenFile };
};

const folderNav = () => screen.getByRole("navigation", { name: "Folder" });

describe("DatasetMainTab", () => {
  it("shows All files at the root, as the current level", () => {
    setup(null);
    const current = within(folderNav()).getByText("All files");
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("tree", { name: "Files in this dataset" }));
    expect(screen.getByText("dataset_description.json")).toBeTruthy();
  });

  it("opens a folder by moving into it, through a link with location", () => {
    const { onNavigate } = setup(null);
    fireEvent.click(screen.getByText("sub-1"));
    expect(onNavigate).toHaveBeenCalledWith(
      "?dandisetVersion=draft&location=sub-1",
    );
    expect(screen.queryByText("ses-1")).toBeNull();
  });

  it("shows only the folder in location, under a breadcrumb back to All files", async () => {
    const { onNavigate, onOpenFile } = setup("sub-1/ses-1");
    const nwb = await screen.findByText("a.nwb");
    expect(screen.queryByText("dataset_description.json")).toBeNull();
    const nav = folderNav();
    expect(within(nav).getByText("ses-1").getAttribute("aria-current")).toBe(
      "page",
    );
    const up = within(nav).getByRole("link", { name: "sub-1" });
    expect(up.getAttribute("href")).toBe(
      "?dandisetVersion=draft&location=sub-1",
    );
    fireEvent.click(within(nav).getByRole("link", { name: "All files" }));
    expect(onNavigate).toHaveBeenCalledWith("?dandisetVersion=draft");
    fireEvent.click(nwb);
    expect(onOpenFile).toHaveBeenCalledWith(FOLDERS["sub-1/ses-1"][0]);
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
