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
// An item's accessible name includes its nested items, so match on its own row.
const ownRow = (text: string) =>
  screen
    .getAllByRole("treeitem")
    .filter((t) => t.firstElementChild?.textContent?.includes(text));
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

  it("moves into a folder instead of expanding it when it lists one folder at a time", () => {
    const onOpenFolder = vi.fn();
    const onOpen = vi.fn();
    const onExpandedChange = vi.fn();
    render(
      <Tree
        label="Files"
        nodes={NODES.map((n) => ({ ...n, children: undefined }))}
        expanded={[]}
        onExpandedChange={onExpandedChange}
        onSelect={() => {}}
        onOpen={onOpen}
        onOpenFolder={onOpenFolder}
      />,
    );
    const folder = item("sub-491604967");
    expect(folder.getAttribute("aria-expanded")).toBeNull();
    expect(folder.querySelector(".ns-tree-chevron svg")).toBeNull();
    fireEvent.click(folder);
    expect(onOpenFolder).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sub-1" }),
    );
    folder.focus();
    key("ArrowRight");
    key("Enter");
    expect(onOpenFolder).toHaveBeenCalledTimes(2);
    expect(onExpandedChange).not.toHaveBeenCalled();
    fireEvent.click(item("dandiset.yaml"));
    expect(onOpen).toHaveBeenCalledWith(NODES[2]);
  });

  it("nests an open folder's items in a group, and a click on one doesn't toggle the folder", () => {
    render(<Files />);
    fireEvent.click(item("sub-491604967"));
    const group = item("sub-491604967").querySelector('[role="group"]');
    expect(group?.contains(item("sub-491604967_ses-01.nwb"))).toBe(true);
    fireEvent.click(screen.getByText("sub-491604967_ses-01.nwb"));
    expect(item("sub-491604967").getAttribute("aria-expanded")).toBe("true");
  });

  it("draws guide lines and pins open folders only when asked", () => {
    const { rerender } = render(
      <Tree
        label="Files"
        nodes={NODES}
        expanded={[]}
        onExpandedChange={() => {}}
        onSelect={() => {}}
      />,
    );
    const tree = screen.getByRole("tree");
    expect(tree.classList.contains("ns-tree--guides")).toBe(false);
    expect(tree.classList.contains("ns-tree--pinned")).toBe(false);
    rerender(
      <Tree
        label="Files"
        nodes={NODES}
        expanded={[]}
        onExpandedChange={() => {}}
        onSelect={() => {}}
        guides
        pinOpenFolders
      />,
    );
    expect(tree.classList.contains("ns-tree--guides")).toBe(true);
    expect(tree.classList.contains("ns-tree--pinned")).toBe(true);
  });

  it("shows a loading row, then an error row that retries, under an open folder", () => {
    const onRetry = vi.fn();
    const folder: TreeNode = { id: "f", name: "micr", kind: "folder" };
    const { rerender } = render(
      <Tree
        label="Files"
        nodes={[{ ...folder, status: "loading" }]}
        expanded={["f"]}
        onExpandedChange={() => {}}
        onSelect={() => {}}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("Loading…")).toBeTruthy();
    rerender(
      <Tree
        label="Files"
        nodes={[{ ...folder, status: "error" }]}
        expanded={["f"]}
        onExpandedChange={() => {}}
        onSelect={() => {}}
        onRetry={onRetry}
      />,
    );
    const retry = ownRow("Couldn’t load this folder")[0];
    expect(retry.getAttribute("aria-level")).toBe("2");
    fireEvent.click(retry.firstElementChild!);
    retry.focus();
    key("Enter");
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ id: "f" }));
  });

  it("ends a partial list with a Show more row that the keys reach, in a folder and at the top", () => {
    const onShowMore = vi.fn();
    render(
      <Tree
        label="Files"
        nodes={[{ ...NODES[0], more: { shown: 2, total: 30 } }, NODES[2]]}
        more={{ shown: 2, total: 40 }}
        expanded={["sub-1"]}
        onExpandedChange={() => {}}
        onSelect={() => {}}
        onShowMore={onShowMore}
      />,
    );
    const rows = ownRow("Show 25 more");
    expect(rows.map((r) => r.textContent)).toEqual([
      "Show 25 more2 of 30 shown",
      "Show 25 more2 of 40 shown",
    ]);
    item("sub-491604967_ses-02.nwb").focus();
    key("ArrowDown");
    expect(document.activeElement).toBe(rows[0]);
    key("Enter");
    expect(onShowMore).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "sub-1" }),
    );
    fireEvent.click(rows[1].firstElementChild!);
    expect(onShowMore).toHaveBeenLastCalledWith(undefined);
  });

  it("puts a row action only where asked, out of the tab order, without opening the row", () => {
    const copy = vi.fn();
    const onExpandedChange = vi.fn();
    render(
      <Tree
        label="Files"
        nodes={NODES}
        expanded={[]}
        onExpandedChange={onExpandedChange}
        onSelect={() => {}}
        rowAction={(node) =>
          node.kind === "folder"
            ? {
                icon: "link",
                label: `Copy link to ${node.name}`,
                onClick: () => copy(node.id),
              }
            : undefined
        }
      />,
    );
    const buttons = document.querySelectorAll(".ns-tree-action button");
    expect(buttons.length).toBe(2);
    expect((buttons[0] as HTMLButtonElement).tabIndex).toBe(-1);
    fireEvent.click(buttons[0]);
    expect(copy).toHaveBeenCalledWith("sub-1");
    expect(onExpandedChange).not.toHaveBeenCalled();
  });
});
