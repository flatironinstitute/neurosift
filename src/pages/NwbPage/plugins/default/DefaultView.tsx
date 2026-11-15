import ViewError from "@components/ViewError/ViewError";
import { LoadingState, Tree, type TreeNode } from "@ui";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHdf5DatasetResult, useHdf5GroupResult } from "../../hdf5Results";
import {
  getHdf5DatasetData,
  getHdf5Group,
  type Hdf5Group,
} from "../../hdf5Interface";
import {
  findDataset,
  parentPath,
  treeNodes,
  valueCount,
  valueText,
  type GroupMap,
} from "../../Hdf5View/hdf5Tree";
import ObjectDetails, { VALUE_LIMIT } from "./ObjectDetails";
import "./DefaultView.css";

type Props = {
  nwbUrl: string;
  path: string;
  objectType: "group" | "dataset";
  onOpenObjectInNewTab?: (path: string) => void;
  width?: number;
};

type Values = Record<string, unknown>;

const INLINE_LENGTH = 60;
const nameOf = (path: string) => path.split("/").pop() || path;

// Scalar and single-element datasets show their value beside the name.
const withScalars = (nodes: TreeNode[], groups: GroupMap, values: Values) =>
  nodes.map((node): TreeNode => {
    if (node.children)
      return { ...node, children: withScalars(node.children, groups, values) };
    const ds = findDataset(groups, node.id);
    if (!ds || valueCount(ds.shape) !== 1 || !(node.id in values)) return node;
    const text = valueText(values[node.id]);
    return {
      ...node,
      size:
        text.length > INLINE_LENGTH ? `${text.slice(0, INLINE_LENGTH)}…` : text,
    };
  });

/** The fallback view for an object with no view of its own: its attributes, then its contents. */
const DefaultView: React.FC<Props> = ({
  nwbUrl,
  path,
  objectType,
  onOpenObjectInNewTab,
}) =>
  objectType === "dataset" ? (
    <DefaultDatasetView nwbUrl={nwbUrl} path={path} />
  ) : (
    <DefaultGroupView
      nwbUrl={nwbUrl}
      path={path}
      onOpenObjectInNewTab={onOpenObjectInNewTab}
    />
  );

const useDatasetValues = (nwbUrl: string, wanted: string[]) => {
  const [values, setValues] = useState<Values>({});
  const asked = useRef(new Set<string>());
  useEffect(() => {
    asked.current = new Set();
    setValues({});
  }, [nwbUrl]);
  const key = wanted.join("\n");
  useEffect(() => {
    for (const p of wanted) {
      if (asked.current.has(p)) continue;
      asked.current.add(p);
      getHdf5DatasetData(nwbUrl, p, {}).then(
        (data) =>
          data !== undefined && setValues((prev) => ({ ...prev, [p]: data })),
        (error) => console.error("Error loading dataset:", error),
      );
    }
    // wanted is compared through its key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nwbUrl, key]);
  return values;
};

const DefaultGroupView: React.FC<{
  nwbUrl: string;
  path: string;
  onOpenObjectInNewTab?: (path: string) => void;
}> = ({ nwbUrl, path, onOpenObjectInNewTab }) => {
  const { value: group, error } = useHdf5GroupResult(nwbUrl, path);
  const [groups, setGroups] = useState<GroupMap>({});
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>();
  const loaded = useRef<GroupMap>({});

  useEffect(() => {
    loaded.current = {};
    setGroups({});
    setExpanded([]);
    setSelected(undefined);
  }, [nwbUrl, path]);
  useEffect(() => {
    if (!group) return;
    loaded.current = { ...loaded.current, [path]: group };
    setGroups(loaded.current);
  }, [group, path]);

  const onExpandedChange = async (next: string[]) => {
    setExpanded(next);
    const fresh = next.filter((p) => !loaded.current[p]);
    const found = await Promise.all(fresh.map((p) => getHdf5Group(nwbUrl, p)));
    const add: GroupMap = {};
    found.forEach((g, i) => g && (add[fresh[i]] = g));
    if (Object.keys(add).length === 0) return;
    loaded.current = { ...loaded.current, ...add };
    setGroups(loaded.current);
  };

  const shown = [path, ...expanded]
    .map((p) => groups[p])
    .filter((g): g is Hdf5Group => !!g);
  const selectedDataset = selected ? findDataset(groups, selected) : undefined;
  const wanted = [
    ...shown.flatMap((g) =>
      g.datasets.filter((d) => valueCount(d.shape) === 1).map((d) => d.path),
    ),
    ...(selectedDataset &&
    valueCount(selectedDataset.shape) > 0 &&
    valueCount(selectedDataset.shape) <= VALUE_LIMIT
      ? [selectedDataset.path]
      : []),
  ];
  const values = useDatasetValues(nwbUrl, wanted);
  const nodes = useMemo(
    () => withScalars(treeNodes(groups, path), groups, values),
    [groups, path, values],
  );

  if (error) return <ViewError what={path} error={error} />;
  if (!group) return <LoadingState label="Reading the group" phase="loading" />;

  const selectedGroup = selected
    ? groups[parentPath(selected)]?.subgroups.find((sg) => sg.path === selected)
    : undefined;
  const empty = group.subgroups.length + group.datasets.length === 0;

  return (
    <div className="default-view">
      <ObjectDetails
        name={nameOf(path)}
        path={path}
        attrs={group.attrs}
        titled={false}
      />
      {empty ? (
        <p className="default-view-note">
          This group has no groups or datasets.
        </p>
      ) : (
        <div className="default-view-split">
          <Tree
            label={`Contents of ${nameOf(path)}`}
            nodes={nodes}
            expanded={expanded}
            onExpandedChange={onExpandedChange}
            selected={selected}
            onSelect={setSelected}
          />
          <section className="default-view-details" aria-label="Selected item">
            {selectedGroup || selectedDataset ? (
              <ObjectDetails
                key={selected}
                name={nameOf(selected!)}
                path={selected!}
                attrs={(selectedGroup ?? selectedDataset)!.attrs}
                dataset={selectedDataset}
                value={selected ? values[selected] : undefined}
                nwbUrl={nwbUrl}
                onOpenInNewTab={
                  selectedGroup?.attrs.neurodata_type && onOpenObjectInNewTab
                    ? () => onOpenObjectInNewTab(selectedGroup.path)
                    : undefined
                }
              />
            ) : (
              <p className="default-view-note">
                Select a group or dataset to see its attributes and values.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

const DefaultDatasetView: React.FC<{ nwbUrl: string; path: string }> = ({
  nwbUrl,
  path,
}) => {
  const { value: dataset, error } = useHdf5DatasetResult(nwbUrl, path);
  const n = dataset ? valueCount(dataset.shape) : 0;
  const values = useDatasetValues(
    nwbUrl,
    dataset && n > 0 && n <= VALUE_LIMIT ? [path] : [],
  );
  if (error) return <ViewError what={path} error={error} />;
  if (!dataset)
    return <LoadingState label="Reading the dataset" phase="loading" />;
  return (
    <div className="default-view">
      <ObjectDetails
        name={nameOf(path)}
        path={path}
        attrs={dataset.attrs}
        dataset={dataset}
        value={values[path]}
        nwbUrl={nwbUrl}
        titled={false}
      />
    </div>
  );
};

export default DefaultView;
