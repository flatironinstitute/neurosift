// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tree, type TreeNode } from "./Tree";

afterEach(cleanup);

const NODES: TreeNode[] = [
  {
    id: "sub-1",
    name: "sub-491604967",
    kind: "folder",
    size: "2 files",
    children: [
      {
        id: "f1",
        name: "sub-491604967_ses-01.nwb",
        kind: "nwb",
        size: "1.82 GB",
      },
      {
        id: "f2",
        name: "sub-491604967_ses-02.nwb",
        kind: "nwb",
        size: "1.76 GB",
      },
    ],
  },
  {
    id: "sub-2",
    name: "sub-491604983",
    kind: "folder",
    size: "3 files",
    children: [],
  },
  { id: "yaml", name: "dandiset.yaml", kind: "file", size: "4 KB" },
];

function Files({ onOpen = vi.fn() }: { onOpen?: (node: TreeNode) => void }) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>();
  return (
    <Tree
      label="Files"
      nodes={NODES}
      expanded={expanded}
      onExpandedChange={setExpanded}
      selected={selected}
      onSelect={setSelected}
      onOpen={onOpen}
    />
  );
}

// Item names include their size, so find each by its exact name.
const item = (name: string) =>
  screen
    .getAllByRole("treeitem")
    .find((t) => t.querySelector(".ns-tree-name")?.textContent === name)!;
const key = (k: string) =>
  fireEvent.keyDown(document.activeElement!, { key: k });

describe("Tree", () => {
  it("is a labelled tree whose items know their level and state, with no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Files />);
    expect(screen.getByRole("tree", { name: "Files" })).toBeTruthy();
    const folder = item("sub-491604967");
    expect(folder.getAttribute("aria-level")).toBe("1");
    expect(folder.getAttribute("aria-expanded")).toBe("false");
    expect(item("dandiset.yaml").getAttribute("aria-expanded")).toBeNull();
    expect(screen.getAllByRole("treeitem").map((t) => t.tabIndex)).toEqual([
      0, -1, -1,
    ]);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("opens a folder from a click anywhere on its row", () => {
    render(<Files />);
    fireEvent.click(screen.getByText("2 files"));
    expect(item("sub-491604967").getAttribute("aria-expanded")).toBe("true");
    expect(item("sub-491604967_ses-01.nwb").getAttribute("aria-level")).toBe(
      "2",
    );
    fireEvent.click(screen.getByText("sub-491604967"));
    expect(item("sub-491604967_ses-01.nwb")).toBeUndefined();
  });

  it("selects and opens a file from a click", () => {
    const onOpen = vi.fn();
    render(<Files onOpen={onOpen} />);
    fireEvent.click(screen.getByText("dandiset.yaml"));
    expect(item("dandiset.yaml").getAttribute("aria-selected")).toBe("true");
    expect(onOpen).toHaveBeenCalledWith(NODES[2]);
  });

  it("follows the tree view keys: arrows move, Right opens and enters, Left closes and climbs", () => {
    const onOpen = vi.fn();
    render(<Files onOpen={onOpen} />);
    item("sub-491604967").focus();
    key("ArrowRight");
    expect(item("sub-491604967").getAttribute("aria-expanded")).toBe("true");
    key("ArrowRight");
    expect(document.activeElement).toBe(item("sub-491604967_ses-01.nwb"));
    key("ArrowDown");
    expect(document.activeElement).toBe(item("sub-491604967_ses-02.nwb"));
    key("Enter");
    expect(onOpen).toHaveBeenCalledWith(NODES[0].children![1]);
    key("ArrowLeft");
    expect(document.activeElement).toBe(item("sub-491604967"));
    key("ArrowLeft");
    expect(item("sub-491604967").getAttribute("aria-expanded")).toBe("false");
    key("End");
    expect(document.activeElement).toBe(item("dandiset.yaml"));
    key(" ");
    expect(item("dandiset.yaml").getAttribute("aria-selected")).toBe("true");
    key("Home");
    expect(document.activeElement).toBe(item("sub-491604967"));
    expect((document.activeElement as HTMLElement).tabIndex).toBe(0);
  });

  it("gives a folder known to be empty no chevron and nothing to open", () => {
    const onExpandedChange = vi.fn();
    render(
      <Tree
        label="Groups"
        nodes={[
          {
            id: "scratch",
            name: "scratch",
            kind: "folder",
            size: "Empty",
            children: [],
          },
        ]}
        expanded={[]}
        onExpandedChange={onExpandedChange}
        onSelect={() => {}}
      />,
    );
    const item = screen.getByRole("treeitem", { name: /scratch/ });
    expect(item.getAttribute("aria-expanded")).toBeNull();
    fireEvent.click(item);
    fireEvent.keyDown(item, { key: "ArrowRight" });
    expect(onExpandedChange).not.toHaveBeenCalled();
  });
});
