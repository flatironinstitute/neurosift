import { DataTable, Tree, type Column, type Sort, type TreeNode } from "@ui";
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
