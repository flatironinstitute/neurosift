import {
  DataTable,
  Tree,
  type Cell,
  type Column,
  type Sort,
  type TreeNode,
} from "@ui";
import { useMemo, useState } from "react";

type Unit = { id: number; spikes: number; notes?: string };

// Spike counts from the units table of Dandiset 000673; rate is spikes over the 1,375.28 s session.
const UNITS: Unit[] = [
  { id: 0, spikes: 1652 },
  { id: 1, spikes: 382 },
  { id: 2, spikes: 1149 },
  { id: 3, spikes: 1914 },
  { id: 4, spikes: 611 },
  { id: 5, spikes: 1446 },
];
const SESSION = 1375.28;

const COLUMNS: Column<Unit>[] = [
  {
    key: "id",
    label: "Unit ID",
    type: "code",
    value: (u) => u.id,
    sortable: true,
  },
  {
    key: "spikes",
    label: "Spikes",
    type: "number",
    value: (u) => u.spikes,
    sortable: true,
  },
  {
    key: "rate",
    label: "Firing rate (Hz)",
    type: "number",
    digits: 2,
    value: (u) => u.spikes / SESSION,
    sortable: true,
  },
  { key: "notes", label: "Notes", value: (u) => u.notes },
];

/** The units table with sorting and a checkbox column, as a PSTH unit list would use it. */
export function UnitsTableDemo({
  density,
}: {
  density?: "default" | "compact";
}) {
  const [sort, setSort] = useState<Sort>({ key: "id", direction: "ascending" });
  const [selected, setSelected] = useState(["3"]);
  const rows = useMemo(() => {
    const column = COLUMNS.find((c) => c.key === sort.key)!;
    const sign = sort.direction === "ascending" ? 1 : -1;
    return [...UNITS].sort(
      (a, b) => sign * (Number(column.value(a)) - Number(column.value(b))),
    );
  }, [sort]);
  return (
    <div className="table-demo">
      <p className="type-caption table-demo-summary" role="status">
        {UNITS.length} units · {selected.length} selected
      </p>
      <DataTable
        caption={density === "compact" ? "Units, compact rows" : "Units"}
        columns={COLUMNS}
        rows={rows}
        rowKey={(u) => String(u.id)}
        rowLabel={(u) => `Unit ${u.id}`}
        sort={sort}
        onSort={setSort}
        selected={selected}
        onSelectedChange={setSelected}
        density={density}
      />
    </div>
  );
}

const FILES: TreeNode[] = [
  {
    id: "sub-491604967",
    name: "sub-491604967",
    kind: "folder",
    size: "2 files",
    children: [
      {
        id: "s1",
        name: "sub-491604967_ses-01.nwb",
        kind: "nwb",
        size: "1.82 GB",
      },
      {
        id: "s2",
        name: "sub-491604967_ses-02.nwb",
        kind: "nwb",
        size: "1.76 GB",
      },
    ],
  },
  {
    id: "sub-491604983",
    name: "sub-491604983",
    kind: "folder",
    size: "1 file",
    children: [
      {
        id: "s3",
        name: "sub-491604983_ses-01.nwb",
        kind: "nwb",
        size: "2.31 GB",
      },
    ],
  },
  { id: "yaml", name: "dandiset.yaml", kind: "file", size: "4 KB" },
];

/** A Dandiset's files: click a row, or use the arrow keys, to open folders. */
export function FileTreeDemo() {
  const [expanded, setExpanded] = useState(["sub-491604967"]);
  const [selected, setSelected] = useState<string>();
  const [opened, setOpened] = useState("");
  return (
    <div className="table-demo">
      <Tree
        label="Files in this Dandiset"
        nodes={FILES}
        expanded={expanded}
        onExpandedChange={setExpanded}
        selected={selected}
        onSelect={setSelected}
        onOpen={(node) => setOpened(node.name)}
      />
      <p className="type-caption table-demo-summary" role="status">
        {opened && `Would open ${opened}`}
      </p>
    </div>
  );
}

type SpikeRow = {
  id: number;
  count: number;
  first: number[];
  last: number;
  electrodes: number;
};

// The first 30 spike times, the last, and the electrode of three units of Dandiset 000673, in seconds.
const SPIKE_ROWS: SpikeRow[] = [
  {
    id: 0,
    electrodes: 3,
    count: 1652,
    first: [
      0.179, 0.316, 1.338, 1.554, 2.625, 2.698, 3.368, 3.386, 3.406, 4.447,
      4.643, 5.757, 7.888, 8.546, 11.615, 12.382, 12.572, 15.404, 16.933,
      17.884, 17.924, 20.921, 21.223, 22.241, 22.941, 23.469, 23.791, 23.816,
      23.849, 24.275,
    ],
    last: 1375.274,
  },
  {
    id: 1,
    electrodes: 0,
    count: 382,
    first: [
      197.172, 263.529, 275.767, 275.789, 275.808, 275.846, 275.926, 275.981,
      276, 276.053, 276.093, 276.181, 276.233, 276.672, 276.724, 276.752,
      276.779, 276.804, 277.166, 277.238, 277.268, 277.566, 277.69, 277.739,
      277.777, 277.808, 277.835, 322.202, 397.877, 417.9,
    ],
    last: 1323.188,
  },
  {
    id: 2,
    electrodes: 0,
    count: 1149,
    first: [
      0.114, 1.772, 2.698, 3.4, 4.817, 7.835, 8.983, 11.022, 11.788, 11.794,
      12.232, 12.575, 15.132, 16.205, 18.018, 20.051, 20.768, 25.703, 25.718,
      28.067, 28.107, 30.33, 30.693, 31.328, 32.426, 32.863, 38.603, 42.762,
      43.715, 44.055,
    ],
    last: 1369.348,
  },
];

const count = (n: number) => n.toLocaleString("en-US");

const SPIKE_COLUMNS: Column<SpikeRow>[] = [
  { key: "id", label: "id", type: "code", value: (r) => r.id },
  {
    key: "spike_times",
    label: "spike_times",
    type: "list",
    value: (r) => r.count,
    list: (r) => ({
      count: count(r.count),
      values: r.first.map((v) => v.toFixed(2).replace(/\.?0+$/, "")).join(", "),
      expandable: r.count > 5,
    }),
  },
  {
    key: "electrodes",
    label: "electrodes",
    type: "number",
    value: (r) => r.electrodes,
  },
];

/** A ragged column: the count and the values that fit; a cell's button opens the detail row. */
export function ListTableDemo() {
  const [expanded, setExpanded] = useState<Cell | undefined>({
    row: "0",
    column: "spike_times",
  });
  return (
    <div className="table-demo">
      <DataTable
        caption="Units with spike times"
        columns={SPIKE_COLUMNS}
        rows={SPIKE_ROWS}
        rowKey={(r) => String(r.id)}
        rowLabel={(r) => `row ${r.id}`}
        density="compact"
        expanded={expanded}
        onExpandedChange={setExpanded}
        detail={(r) => (
          <p className="table-demo-detail">
            {`spike_times · row ${r.id} · ${count(r.count)} values: ${r.first.join(", ")}, … ${count(r.count - 31)} more … ${r.last}`}
          </p>
        )}
      />
    </div>
  );
}
