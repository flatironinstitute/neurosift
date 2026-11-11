// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AppliedFilters,
  FilterGroup,
  RecentlyOpened,
  ResultRow,
  ResultsHead,
  SearchRow,
  ShowMore,
} from "./Catalog";

afterEach(cleanup);

describe("SearchRow", () => {
  it("is a large search field with its modes and the total", () => {
    const onModeChange = vi.fn();
    render(
      <SearchRow
        query="hippocampus"
        onQueryChange={() => {}}
        onSearch={() => {}}
        mode="basic"
        onModeChange={onModeChange}
        total="118 datasets"
      />,
    );
    expect(
      screen.getByRole("searchbox", { name: "Search datasets" }),
    ).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Search by" })).toBeTruthy();
    expect(screen.getByText("118 datasets")).toBeTruthy();
  });
});

describe("FilterGroup", () => {
  it("is a fieldset with a legend, its source, and a checkbox per value with its count", () => {
    const onChange = vi.fn();
    render(
      <FilterGroup
        legend="Archive"
        options={[
          { value: "dandi", label: "DANDI", count: "92" },
          { value: "ember", label: "EMBER", count: "14" },
        ]}
        value={["dandi"]}
        onChange={onChange}
      />,
    );
    const group = screen.getByRole("group", { name: "Archive" });
    expect(
      within(group).getByRole("checkbox", { name: /DANDI/ }),
    ).toHaveProperty("checked", true);
    fireEvent.click(within(group).getByRole("checkbox", { name: /EMBER/ }));
    expect(onChange).toHaveBeenCalledWith(["dandi", "ember"]);
  });

  it("names where its values come from", () => {
    render(
      <FilterGroup
        legend="Species"
        source="From DANDI metadata"
        options={[]}
        value={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("From DANDI metadata")).toBeTruthy();
  });
});

describe("AppliedFilters", () => {
  it("lists applied filters as removable tags, with Clear all", () => {
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    render(
      <AppliedFilters
        filters={[
          { id: "a", label: "DANDI" },
          { id: "s", label: "Mus musculus" },
        ]}
        onRemove={onRemove}
        onClearAll={onClearAll}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Mus musculus" }),
    );
    expect(onRemove).toHaveBeenCalledWith("s");
    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(onClearAll).toHaveBeenCalled();
  });
});

describe("ResultsHead", () => {
  it("shows the total as a heading and a sort select", () => {
    render(
      <ResultsHead
        total="118 datasets"
        sort="modified"
        sortOptions={[{ value: "modified", label: "Last modified" }]}
        onSortChange={() => {}}
      />,
    );
    expect(screen.getByText("118 datasets").className).toBe("ns-catalog-total");
    expect(screen.getByRole("combobox", { name: "Sort by" })).toBeTruthy();
  });
});

describe("ResultRow", () => {
  it("links the title, and shows the archive, ID, meta, date and data types", () => {
    render(
      <ul>
        <ResultRow
          archive="DANDI"
          id="000673"
          title="Control of working memory"
          href="/dandiset/000673"
          meta="Kyzar, Michael · 44 files · 6.5 GB"
          modified="Modified Jan 22, 2025"
          types={["ElectricalSeries", "Units"]}
        />
      </ul>,
    );
    expect(
      screen
        .getByRole("link", { name: "Control of working memory" })
        .getAttribute("href"),
    ).toBe("/dandiset/000673");
    expect(screen.getByText("000673").className).toBe("ns-catalog-id");
    expect(screen.getByText("ElectricalSeries").className).toBe(
      "ns-tag ns-tag--static",
    );
  });
});

describe("ShowMore", () => {
  it("says how many are shown and loads more", () => {
    const onMore = vi.fn();
    render(<ShowMore shown={6} total={118} onMore={onMore} />);
    expect(screen.getByText("Showing 6 of 118")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(onMore).toHaveBeenCalled();
  });

  it("disappears at the end of the results", () => {
    const { container } = render(
      <ShowMore shown={118} total={118} onMore={() => {}} />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.textContent).toBe("All 118 shown");
  });
});

describe("RecentlyOpened", () => {
  it("lists recent datasets as links, each with its archive", () => {
    render(
      <RecentlyOpened
        items={[
          {
            archive: "DANDI",
            id: "000673",
            title: "Control of working memory",
            href: "/dandiset/000673",
          },
        ]}
      />,
    );
    const list = screen.getByRole("list", { name: "Recently opened" });
    expect(within(list).getByRole("link", { name: /000673/ })).toBeTruthy();
  });

  it("uses the same rows as the Prompt list", () => {
    render(
      <RecentlyOpened
        items={[
          {
            archive: "DANDI",
            id: "000673",
            title: "Control of working memory",
            href: "/dandiset/000673",
          },
        ]}
      />,
    );
    const list = screen.getByRole("list", { name: "Recently opened" });
    expect(list.className).toBe("ns-row-list");
    expect(within(list).getByRole("listitem").className).toBe(
      "ns-row-list-row",
    );
    expect(within(list).getByRole("link").className).toBe("ns-row-list-action");
  });
});
