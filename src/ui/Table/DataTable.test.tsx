// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable, type Column } from "./DataTable";

afterEach(cleanup);

type Unit = { id: number; spikes: number; rate: number; notes?: string };
const UNITS: Unit[] = [
  { id: 0, spikes: 1652, rate: 1.2 },
  { id: 1, spikes: 382, rate: 0.28 },
  { id: 3, spikes: 1914, rate: 1.39, notes: "Burst" },
];
const COLUMNS: Column<Unit>[] = [
  { key: "id", label: "Unit ID", type: "code", value: (u) => u.id },
  { key: "spikes", label: "Spikes", type: "number", value: (u) => u.spikes },
  {
    key: "rate",
    label: "Firing rate (Hz)",
    type: "number",
    value: (u) => u.rate,
    digits: 2,
  },
  { key: "notes", label: "Notes", value: (u) => u.notes },
];

describe("DataTable", () => {
  it("is a real table with a caption and column headers, with no React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <DataTable
        caption="Units"
        columns={COLUMNS}
        rows={UNITS}
        rowKey={(u) => String(u.id)}
      />,
    );
    const table = screen.getByRole("table", { name: "Units" });
    expect(screen.getByRole("region", { name: "Units" }).tabIndex).toBe(0);
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent)).toEqual([
      "Unit ID",
      "Spikes",
      "Firing rate (Hz)",
      "Notes",
    ]);
    for (const h of headers) expect(h.getAttribute("scope")).toBe("col");
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("writes numbers with thousands commas and fixed digits, aligned right in the code face", () => {
    render(
      <DataTable
        caption="Units"
        columns={COLUMNS}
        rows={UNITS}
        rowKey={(u) => String(u.id)}
      />,
    );
    const cell = screen.getByText("1,652");
    expect(cell.closest("td")!.className).toContain("ns-cell--number");
    expect(screen.getByText("0.28")).toBeTruthy();
    expect(screen.getByText("1.20")).toBeTruthy();
  });

  it("shows a dash for a missing value, read as “No value”", () => {
    render(
      <DataTable
        caption="Units"
        columns={COLUMNS}
        rows={UNITS}
        rowKey={(u) => String(u.id)}
      />,
    );
    const missing = screen.getAllByText("No value");
    expect(missing).toHaveLength(2);
    expect(missing[0].closest("td")!.textContent).toBe("—No value");
  });

  it("sorts from a header button and announces the direction", () => {
    const onSort = vi.fn();
    const { rerender } = render(
      <DataTable
        caption="Units"
        columns={COLUMNS.map((c) => ({ ...c, sortable: c.key !== "notes" }))}
        rows={UNITS}
        rowKey={(u) => String(u.id)}
        sort={{ key: "spikes", direction: "descending" }}
        onSort={onSort}
      />,
    );
    const spikes = screen.getByRole("columnheader", { name: /Spikes/ });
    expect(spikes.getAttribute("aria-sort")).toBe("descending");
    expect(
      screen
        .getByRole("columnheader", { name: /Unit ID/ })
        .getAttribute("aria-sort"),
    ).toBeNull();
    fireEvent.click(within(spikes).getByRole("button"));
    expect(onSort).toHaveBeenCalledWith({
      key: "spikes",
      direction: "ascending",
    });
    fireEvent.click(screen.getByRole("button", { name: "Unit ID" }));
    expect(onSort).toHaveBeenLastCalledWith({
      key: "id",
      direction: "ascending",
    });
    expect(screen.queryByRole("button", { name: "Notes" })).toBeNull();
    rerender(
      <DataTable
        caption="Units"
        columns={COLUMNS}
        rows={UNITS}
        rowKey={(u) => String(u.id)}
      />,
    );
  });

  it("selects rows with a checkbox column, and the whole row is the target", () => {
    const onSelectedChange = vi.fn();
    render(
      <DataTable
        caption="Units"
        columns={COLUMNS}
        rows={UNITS}
        rowKey={(u) => String(u.id)}
        selected={["3"]}
        onSelectedChange={onSelectedChange}
        rowLabel={(u) => `Unit ${u.id}`}
      />,
    );
    const box = screen.getByRole("checkbox", {
      name: "Unit 3",
    }) as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(box.closest("tr")!.className).toContain("ns-row--selected");
    fireEvent.click(screen.getByText("382"));
    expect(onSelectedChange).toHaveBeenCalledWith(["3", "1"]);
    fireEvent.click(box);
    expect(onSelectedChange).toHaveBeenLastCalledWith([]);
  });

  it("has a compact density for long selection lists", () => {
    render(
      <DataTable
        caption="Units"
        density="compact"
        columns={COLUMNS}
        rows={UNITS}
        rowKey={(u) => String(u.id)}
      />,
    );
    expect(screen.getByRole("table").className).toContain("ns-table--compact");
  });

  it("opens one row at a time from its first cell's button or a click on the row", () => {
    const onActivate = vi.fn();
    const { rerender } = render(
      <DataTable
        caption="Units"
        columns={COLUMNS}
        rows={UNITS}
        rowKey={(u) => String(u.id)}
        onActivate={onActivate}
      />,
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    expect(onActivate).toHaveBeenLastCalledWith("1");
    fireEvent.click(screen.getByText("1,914"));
    expect(onActivate).toHaveBeenLastCalledWith("3");
    rerender(
      <DataTable
        caption="Units"
        columns={COLUMNS}
        rows={UNITS}
        rowKey={(u) => String(u.id)}
        active="3"
        onActivate={onActivate}
      />,
    );
    const three = screen.getByRole("button", { name: "3" });
    expect(three.getAttribute("aria-current")).toBe("true");
    expect(three.closest("tr")?.classList.contains("ns-row--selected")).toBe(
      true,
    );
  });
  describe("list cells and the detail row", () => {
    type Spikes = { id: number; times: number[] };
    const SPIKES: Spikes[] = [
      { id: 0, times: [0.18, 0.32, 1.34, 1.55, 2.62, 2.7] },
      { id: 1, times: [] },
      { id: 2, times: [4.1, 5.2] },
    ];
    const LIST_COLUMNS: Column<Spikes>[] = [
      { key: "id", label: "id", type: "code", value: (s) => s.id },
      {
        key: "times",
        label: "spike_times",
        type: "list",
        value: (s) => s.times.length,
        list: (s) => ({
          count: s.times.length ? String(s.times.length) : "0 values",
          values: s.id === 2 ? undefined : s.times.join(", "),
          loading: s.id === 2,
          expandable: s.times.length > 5,
        }),
      },
    ];
    const table = (props: {
      expanded?: { row: string; column: string };
      onExpandedChange?: (cell?: { row: string; column: string }) => void;
      onRowVisible?: (key: string) => void;
    }) => (
      <DataTable
        caption="Units"
        columns={LIST_COLUMNS}
        rows={SPIKES}
        rowKey={(s) => String(s.id)}
        rowLabel={(s) => `row ${s.id}`}
        detail={(s, column) => (
          <p>
            {column}: all {s.times.length}
          </p>
        )}
        {...props}
      />
    );

    it("shows the count and values, Reading… while values load, and opens only long lists", () => {
      render(table({ onExpandedChange: vi.fn() }));
      const open = screen.getByRole("button", {
        name: "6 in spike_times, row 0",
      });
      expect(open.getAttribute("aria-expanded")).toBe("false");
      expect(open.closest("td")!.textContent).toContain(
        "0.18, 0.32, 1.34, 1.55, 2.62, 2.7",
      );
      expect(screen.getByText("0 values").closest("button")).toBeNull();
      expect(screen.getByText("Reading…")).toBeTruthy();
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("opens a full-width detail row under the row, named and controlled by the button", () => {
      const onExpandedChange = vi.fn();
      const { rerender } = render(table({ onExpandedChange }));
      fireEvent.click(
        screen.getByRole("button", { name: /spike_times, row 0/ }),
      );
      expect(onExpandedChange).toHaveBeenLastCalledWith({
        row: "0",
        column: "times",
      });
      rerender(
        table({ onExpandedChange, expanded: { row: "0", column: "times" } }),
      );
      const open = screen.getByRole("button", { name: /spike_times, row 0/ });
      expect(open.getAttribute("aria-expanded")).toBe("true");
      const region = screen.getByRole("region", { name: "spike_times, row 0" });
      expect(open.getAttribute("aria-controls")).toBe(region.id);
      expect(region.textContent).toBe("times: all 6");
      const cell = region.closest("td")!;
      expect(cell.colSpan).toBe(2);
      expect(cell.closest("tr")!.previousElementSibling).toBe(
        open.closest("tr"),
      );
      fireEvent.click(open);
      expect(onExpandedChange).toHaveBeenLastCalledWith(undefined);
    });

    it("tells the view each row once it is on screen", () => {
      const onRowVisible = vi.fn();
      render(table({ onRowVisible }));
      expect(onRowVisible.mock.calls.map(([key]) => key)).toEqual([
        "0",
        "1",
        "2",
      ]);
    });
  });
});
