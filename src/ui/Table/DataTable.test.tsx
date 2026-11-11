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
});
