import { EmptyState, LoadingState, SearchField, Tree } from "@ui";
import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { getHdf5Group } from "../hdf5Interface";
import Hdf5Details from "./Hdf5Details";
import { filterTree, findDataset, treeNodes, type GroupMap } from "./hdf5Tree";
import "./ReferenceView.css";

type Props = {
  nwbUrl: string;
  width: number;
  isExpanded?: boolean;
  /** A path to show, such as one picked in the schema; a new time shows it again. */
  focus?: { path: string; at: number };
};

// Find reads every group once; a cap keeps a huge file responsive.
const SEARCH_CAP = 5000;

/** The file as stored: a tree of groups and datasets, Find, and the selected item's details. */
const Hdf5View: FunctionComponent<Props> = ({ nwbUrl, focus }) => {
  const [groups, setGroups] = useState<GroupMap>({});
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState("/");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [capped, setCapped] = useState(false);
  const loaded = useRef<GroupMap>({});
  const walked = useRef(false);

  // Reads groups not read yet, so each opened group's children show their counts.
  const read = async (paths: string[]) => {
    const fresh = paths.filter((p) => !loaded.current[p]);
    const found = await Promise.all(fresh.map((p) => getHdf5Group(nwbUrl, p)));
    const next: GroupMap = {};
    found.forEach((g, i) => g && (next[fresh[i]] = g));
    if (Object.keys(next).length === 0) return [];
    loaded.current = { ...loaded.current, ...next };
    setGroups(loaded.current);
    return Object.values(next);
  };

  useEffect(() => {
    loaded.current = {};
    walked.current = false;
    setGroups({});
    setExpanded([]);
    setSelected("/");
    (async () => {
      const [root] = await read(["/"]);
      if (root) await read(root.subgroups.map((sg) => sg.path));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nwbUrl]);

  const onExpandedChange = async (next: string[]) => {
    setExpanded(next);
    const opened = await read(next);
    const all = next.map((p) => loaded.current[p]).filter(Boolean);
    await read(
      [...opened, ...all].flatMap((g) => g.subgroups.map((sg) => sg.path)),
    );
  };

  // Opens the groups above the focused path, then selects it.
  useEffect(() => {
    if (!focus) return;
    const parts = focus.path.split("/").filter(Boolean);
    const above = parts
      .slice(0, -1)
      .map((_, i) => "/" + parts.slice(0, i + 1).join("/"));
    setQuery("");
    setSelected(focus.path);
    (async () => {
      await read(["/", ...above, focus.path]);
      const opened = [...new Set([...expanded, ...above])];
      await onExpandedChange(
        loaded.current[focus.path] ? [...opened, focus.path] : opened,
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const onQuery = async (value: string) => {
    setQuery(value);
    if (!value.trim() || walked.current) return;
    walked.current = true;
    setSearching(true);
    let frontier = Object.values(loaded.current).flatMap((g) =>
      g.subgroups.map((sg) => sg.path),
    );
    while (
      frontier.length > 0 &&
      Object.keys(loaded.current).length < SEARCH_CAP
    ) {
      const read_ = await read(frontier);
      frontier = read_.flatMap((g) => g.subgroups.map((sg) => sg.path));
      if (read_.length === 0)
        frontier = frontier.filter((p) => !loaded.current[p]);
    }
    setCapped(Object.keys(loaded.current).length >= SEARCH_CAP);
    setSearching(false);
  };

  const all = useMemo(() => treeNodes(groups, "/"), [groups]);
  const filtered = useMemo(() => filterTree(all, query), [all, query]);
  const root = groups["/"];

  if (!root) return <LoadingState label="Reading the file" phase="loading" />;

  const nwbVersion = root.attrs.nwb_version;
  const summary = [
    nwbVersion && `NWB ${nwbVersion}`,
    `${root.subgroups.length} groups and ${root.datasets.length} datasets at the top`,
    nwbUrl.includes(".lindi")
      ? "the file as stored, read through LINDI"
      : "the file as stored",
  ]
    .filter(Boolean)
    .join(" · ");

  const searchingNow = query.trim() !== "";
  const dataset = findDataset(groups, selected);

  return (
    <div className="reference-view">
      <p className="reference-summary">{summary}</p>
      <div className="reference-find">
        <SearchField
          label="Find by name or path"
          placeholder="Find by name or path"
          size="md"
          value={query}
          onChange={onQuery}
          onSearch={onQuery}
          loading={searching}
        />
      </div>
      <div className="reference-split">
        <div className="reference-main">
          {searchingNow && filtered.nodes.length === 0 && !searching ? (
            <EmptyState
              title={`No group or dataset matches “${query.trim()}”.`}
              action={{ label: "Clear search", onClick: () => setQuery("") }}
            >
              Find looks at names and paths.
            </EmptyState>
          ) : (
            <Tree
              label="Groups and datasets"
              nodes={filtered.nodes}
              expanded={
                searchingNow
                  ? [...new Set([...expanded, ...filtered.open])]
                  : expanded
              }
              onExpandedChange={onExpandedChange}
              selected={selected}
              onSelect={setSelected}
            />
          )}
          {searchingNow && capped && (
            <p className="reference-note">
              {`Find looked through the first ${SEARCH_CAP.toLocaleString("en-US")} groups.`}
            </p>
          )}
        </div>
        <aside className="reference-details" aria-label="Details">
          <Hdf5Details
            key={selected}
            nwbUrl={nwbUrl}
            path={selected}
            group={dataset ? undefined : groups[selected]}
            dataset={dataset}
          />
        </aside>
      </div>
    </div>
  );
};

export default Hdf5View;
