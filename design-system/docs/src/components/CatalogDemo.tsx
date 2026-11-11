import {
  AppliedFilters,
  FilterGroup,
  ResultRow,
  ResultsHead,
  SearchRow,
  ShowMore,
} from "@ui";
import { useState } from "react";

// Dandisets as the captures of DANDI show them.
const RESULTS = [
  {
    archive: "DANDI",
    id: "000673",
    title:
      "Data for: Control of working memory by phase–amplitude coupling of human hippocampal neurons",
    meta: "Kyzar, Michael · 44 files · 6.5 GB",
    modified: "Version 0.250122.0110",
    types: ["ElectricalSeries", "Units"],
  },
  {
    archive: "DANDI",
    id: "000041",
    title: "Network Homeostasis and State Dynamics of Neocortical Sleep",
    meta: "Watson, Brendon O. · 22 files · 139.23 GB",
    modified: "Version 0.261104.0300",
    types: ["ElectricalSeries", "Units"],
  },
  {
    archive: "DANDI",
    id: "000728",
    title: "Allen Institute - Visual Coding - Optical Physiology",
    meta: "Allen Institute",
    modified: "Published versions on DANDI",
    types: ["TwoPhotonSeries", "PlaneSegmentation"],
  },
];
const ARCHIVES = [
  { value: "dandi", label: "DANDI" },
  { value: "ember", label: "EMBER" },
  { value: "openneuro", label: "OpenNeuro" },
];

/** The catalog’s pieces together: search, filters, results head, rows and Show more. */
export default function CatalogDemo() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("basic");
  const [archives, setArchives] = useState(["dandi"]);
  const [sort, setSort] = useState("modified");
  return (
    <div className="catalog-demo">
      <SearchRow
        query={query}
        onQueryChange={setQuery}
        onSearch={() => {}}
        mode={mode}
        onModeChange={setMode}
      />
      <div className="catalog-demo-body">
        <FilterGroup
          legend="Archive"
          source="Where each dataset lives"
          options={ARCHIVES}
          value={archives}
          onChange={setArchives}
        />
        <div className="catalog-demo-results">
          <AppliedFilters
            filters={archives.map((a) => ({
              id: a,
              label: ARCHIVES.find((o) => o.value === a)!.label,
            }))}
            onRemove={(id) =>
              setArchives((list) => list.filter((a) => a !== id))
            }
            onClearAll={() => setArchives([])}
          />
          <ResultsHead
            total={`${RESULTS.length} datasets`}
            sort={sort}
            sortOptions={[
              { value: "modified", label: "Last modified" },
              { value: "title", label: "Title" },
            ]}
            onSortChange={setSort}
          />
          <ul className="catalog-demo-list">
            {RESULTS.map((result) => (
              <ResultRow
                key={result.id}
                {...result}
                href={`#dandiset-${result.id}`}
              />
            ))}
          </ul>
          <ShowMore
            shown={RESULTS.length}
            total={RESULTS.length}
            onMore={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
