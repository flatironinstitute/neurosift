/* eslint-disable @typescript-eslint/no-explicit-any */
import { SmallIconButton } from "@fi-sci/misc";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import {
  FaRegCircle,
  FaFolder,
  FaFolderOpen,
  FaFile,
  FaTag,
} from "react-icons/fa";
import {
  getHdf5Dataset,
  getHdf5DatasetData,
  getHdf5Group,
  Hdf5Dataset,
  Hdf5Group,
  Hdf5Subdataset,
} from "./hdf5Interface";
import { valueToElement } from "./valueToElement";
import "@css/TopLevelGroupContent.css";

type Props = {
  name: string;
  group: Hdf5Group;
  nwbUrl: string;
  excludeGroups?: boolean;
};

type GroupsDatasetsState = {
  groups: Hdf5Group[];
  datasets: Hdf5Dataset[];
  datasetDatas: { [key: string]: any };
  expandedGroupPaths: string[];
  expandedDatasetPaths: string[];
};

type GroupsDatasetsAction =
  | { type: "addGroup"; group: Hdf5Group }
  | { type: "addDataset"; dataset: Hdf5Dataset }
  | { type: "expandGroup"; path: string }
  | { type: "collapseGroup"; path: string }
  | { type: "expandDataset"; path: string }
  | { type: "collapseDataset"; path: string }
  | { type: "setDatasetData"; path: string; data: any };

const groupsDatasetsReducer = (
  state: GroupsDatasetsState,
  action: GroupsDatasetsAction,
): GroupsDatasetsState => {
  switch (action.type) {
    case "addGroup":
      return {
        ...state,
        groups: [
          ...state.groups.filter((g) => g.path !== action.group.path),
          action.group,
        ],
      };
    case "addDataset":
      return {
        ...state,
        datasets: [
          ...state.datasets.filter((d) => d.path !== action.dataset.path),
          action.dataset,
        ],
      };
    case "expandGroup":
      return {
        ...state,
        expandedGroupPaths: [
          ...state.expandedGroupPaths.filter((p) => p !== action.path),
          action.path,
        ],
      };
    case "collapseGroup":
      return {
        ...state,
        expandedGroupPaths: state.expandedGroupPaths.filter(
          (p) => p !== action.path,
        ),
      };
    case "expandDataset":
      return {
        ...state,
        expandedDatasetPaths: [
          ...state.expandedDatasetPaths.filter((p) => p !== action.path),
          action.path,
        ],
      };
    case "collapseDataset":
      return {
        ...state,
        expandedDatasetPaths: state.expandedDatasetPaths.filter(
          (p) => p !== action.path,
        ),
      };
    case "setDatasetData":
      return {
        ...state,
        datasetDatas: {
          ...state.datasetDatas,
          [action.path]: action.data,
        },
      };
    default:
      throw Error("Unexpected action type: " + (action as any).type);
  }
};

type TableItem =
  | {
      key: string;
      type: "group";
      name: string;
      path: string;
      attrs: { [key: string]: any };
      expanded: boolean;
      indent: number;
    }
  | {
      key: string;
      type: "dataset";
      name: string;
      path: string;
      expanded: boolean;
      indent: number;
      data?: any;
      subdataset: Hdf5Subdataset;
    }
  | {
      key: string;
      type: "attribute";
      name: string;
      value: any;
      indent: number;
    }
  | {
      key: string;
      type: "dataset-info";
      path: string;
      dataset: Hdf5Dataset;
      data?: any;
      indent: number;
    };

const TopLevelGroupContentPanel: FunctionComponent<Props> = ({
  group,
  nwbUrl,
  excludeGroups,
}) => {
  const [groupsDatasetsState, groupsDatasetsDispatch] = useReducer(
    groupsDatasetsReducer,
    {
      groups: [],
      datasets: [],
      expandedGroupPaths: [],
      expandedDatasetPaths: [],
      datasetDatas: {},
    },
  );
  useEffect(() => {
    groupsDatasetsDispatch({ type: "addGroup", group });
  }, [group]);
  useEffect(() => {
    const process = async () => {
      const checkLoadDataForSubdatasets = async (g: Hdf5Group) => {
        for (const sds of g.datasets) {
          if (product(sds.shape) <= 10) {
            if (!groupsDatasetsState.expandedDatasetPaths.includes(sds.path)) {
              if (!(sds.path in groupsDatasetsState.datasetDatas)) {
                const data = await getHdf5DatasetData(nwbUrl, sds.path, {});
                groupsDatasetsDispatch({
                  type: "setDatasetData",
                  path: sds.path,
                  data,
                });
                return;
              }
            }
          }
        }
      };
      checkLoadDataForSubdatasets(group);
      for (const path of groupsDatasetsState.expandedGroupPaths) {
        const g = groupsDatasetsState.groups.find((g) => g.path === path);
        if (!g) {
          const newGroup = await getHdf5Group(nwbUrl, path);
          if (newGroup) {
            groupsDatasetsDispatch({ type: "addGroup", group: newGroup });
            return;
          }
        }
        if (g) {
          await checkLoadDataForSubdatasets(g);
        }
      }
      for (const path of groupsDatasetsState.expandedDatasetPaths) {
        const d = groupsDatasetsState.datasets.find((d) => d.path === path);
        if (!d) {
          const newDataset = await getHdf5Dataset(nwbUrl, path);
          if (newDataset) {
            groupsDatasetsDispatch({ type: "addDataset", dataset: newDataset });
            return;
          }
        }
      }
      for (const path of groupsDatasetsState.expandedDatasetPaths) {
        const d = groupsDatasetsState.datasets.find((d) => d.path === path);
        if (d) {
          if (!(path in groupsDatasetsState.datasetDatas)) {
            if (product(d.shape) <= 100) {
              const data = await getHdf5DatasetData(nwbUrl, path, {});
              groupsDatasetsDispatch({ type: "setDatasetData", path, data });
              return;
            }
          }
        }
      }
    };
    process();
  }, [
    groupsDatasetsState.expandedGroupPaths,
    groupsDatasetsState.expandedDatasetPaths,
    groupsDatasetsState.groups,
    groupsDatasetsState.datasets,
    nwbUrl,
    groupsDatasetsState.datasetDatas,
    group,
  ]);

  const tableItems = useMemo(() => {
    const ret: TableItem[] = [];
    const processExpandedGroup = (path: string, indent: number) => {
      const g = groupsDatasetsState.groups.find((g) => g.path === path);
      if (!g) return;
      if (!excludeGroups || path !== group.path) {
        for (const sg of g.subgroups) {
          const expanded = groupsDatasetsState.expandedGroupPaths.includes(
            sg.path,
          );
          ret.push({
            type: "group",
            name: sg.name,
            path: sg.path,
            expanded,
            indent,
            key: `group:${sg.path}`,
            attrs: sg.attrs,
          });
          if (expanded) processExpandedGroup(sg.path, indent + 1);
        }
      }
      for (const ds of g.datasets) {
        const expanded = groupsDatasetsState.expandedDatasetPaths.includes(
          ds.path,
        );
        let data: any = undefined;
        if (product(ds.shape) <= 10) {
          data = groupsDatasetsState.datasetDatas[ds.path];
        }
        ret.push({
          type: "dataset",
          name: ds.name,
          path: ds.path,
          expanded,
          indent,
          key: `dataset:${ds.path}`,
          data,
          subdataset: ds,
        });
        if (expanded) processExpandedDataset(ds.path, indent + 1);
      }
      for (const attrName of Object.keys(g.attrs).sort()) {
        const attrValue = g.attrs[attrName];
        ret.push({
          type: "attribute",
          name: attrName,
          value: attrValue,
          indent,
          key: `attribute:${g.path}:${attrName}`,
        });
      }
    };
    const processExpandedDataset = (path: string, indent: number) => {
      const d = groupsDatasetsState.datasets.find((d) => d.path === path);
      if (!d) return;
      ret.push({
        type: "dataset-info",
        path: d.path,
        dataset: d,
        indent,
        key: `dataset-info:${d.path}`,
        data: groupsDatasetsState.datasetDatas[d.path],
      });
      for (const attrName of Object.keys(d.attrs).sort()) {
        const attrValue = d.attrs[attrName];
        ret.push({
          type: "attribute",
          name: attrName,
          value: attrValue,
          indent,
          key: `attribute:${d.path}:${attrName}`,
        });
      }
    };
    processExpandedGroup(group.path, 0);
    return ret;
  }, [groupsDatasetsState, group, excludeGroups]);

  return (
    <div className="group-content-container">
      {tableItems.map((item) => (
        <TreeRow
          key={item.key}
          tableItem={item}
          groupsDatasetsDispatch={groupsDatasetsDispatch}
          nwbUrl={nwbUrl}
        />
      ))}
    </div>
  );
};

type TreeRowProps = {
  tableItem: TableItem;
  groupsDatasetsDispatch: React.Dispatch<GroupsDatasetsAction>;
  nwbUrl: string;
};

const TreeRow: FunctionComponent<TreeRowProps> = ({
  tableItem,
  groupsDatasetsDispatch,
  nwbUrl,
}) => {
  const { type, indent } = tableItem;
  const paddingLeft = indent * 20;

  const viewDatasetInDebugConsole = useCallback(
    async (path: string) => {
      console.info("Loading dataset data for " + path);
      const data = await getHdf5DatasetData(nwbUrl, path, {});
      console.info(`Dataset data for ${path}:`);
      console.info(data);
    },
    [nwbUrl],
  );

  switch (type) {
    case "group":
      return (
        <div className="hdf5-tree-node">
          <div
            className="hdf5-tree-row group-row"
            style={{ paddingLeft }}
            onClick={() => {
              groupsDatasetsDispatch({
                type: tableItem.expanded ? "collapseGroup" : "expandGroup",
                path: tableItem.path,
              });
            }}
          >
            <span className="tree-expander">
              {tableItem.expanded ? "▾" : "▸"}
            </span>
            <span
              className={`tree-icon ${tableItem.expanded ? "icon-folder-open" : "icon-folder"}`}
            >
              {tableItem.expanded ? <FaFolderOpen /> : <FaFolder />}
            </span>
            <span className="tree-label">{tableItem.name}</span>
          </div>
        </div>
      );
    case "dataset":
      return (
        <div className="hdf5-tree-node">
          <div
            className="hdf5-tree-row dataset-row"
            style={{ paddingLeft }}
            onClick={() => {
              groupsDatasetsDispatch({
                type: tableItem.expanded ? "collapseDataset" : "expandDataset",
                path: tableItem.path,
              });
            }}
          >
            <span className="tree-expander">
              {tableItem.expanded ? "▾" : "▸"}
            </span>
            <span className="tree-icon icon-file">
              <FaFile />
            </span>
            <span className="tree-label">{tableItem.name}</span>
            <span className="tree-meta">
              {tableItem.subdataset.dtype}{" "}
              {JSON.stringify(tableItem.subdataset.shape)}
              {tableItem.subdataset.chunks ? (
                <> chunks={JSON.stringify(tableItem.subdataset.chunks)}</>
              ) : (
                <> chunks: False</>
              )}
              {tableItem.subdataset.compressor && (
                <> {tableItem.subdataset.compressor}</>
              )}
            </span>
            {tableItem.data && (
              <span className="tree-data-preview">
                {abbreviateString(valueToElement(tableItem.data), 200)}
              </span>
            )}
          </div>
        </div>
      );
    case "attribute":
      return (
        <div className="hdf5-tree-node">
          <div className="hdf5-tree-row attribute-row" style={{ paddingLeft }}>
            <span className="tree-expander" />
            <span className="tree-icon icon-attribute">
              <FaTag />
            </span>
            <span className="tree-label">
              {tableItem.name}
              <span className="attribute-equals">=</span>
              <span className="attribute-value">
                {abbreviateString(valueToElement(tableItem.value), 300)}
              </span>
            </span>
          </div>
        </div>
      );
    case "dataset-info":
      return (
        <div style={{ paddingLeft: paddingLeft + 36 }}>
          <div className="hdf5-dataset-detail">
            <table>
              <tbody>
                <tr>
                  <td className="detail-label">dtype</td>
                  <td className="detail-value">{tableItem.dataset.dtype}</td>
                </tr>
                <tr>
                  <td className="detail-label">shape</td>
                  <td className="detail-value">
                    {valueToElement(tableItem.dataset.shape)}
                  </td>
                </tr>
                {tableItem.dataset.chunks && (
                  <tr>
                    <td className="detail-label">chunks</td>
                    <td className="detail-value">
                      {valueToElement(tableItem.dataset.chunks)}
                    </td>
                  </tr>
                )}
                {tableItem.dataset.compressor && (
                  <tr>
                    <td className="detail-label">compressor</td>
                    <td className="detail-value">
                      {tableItem.dataset.compressor}
                    </td>
                  </tr>
                )}
                {tableItem.dataset.filters &&
                  tableItem.dataset.filters.length > 0 && (
                    <tr>
                      <td className="detail-label">filters</td>
                      <td className="detail-value">
                        {tableItem.dataset.filters.join(", ")}
                      </td>
                    </tr>
                  )}
                {tableItem.data && (
                  <tr>
                    <td className="detail-label">data</td>
                    <td className="detail-value">
                      {valueToElement(tableItem.data)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {!tableItem.data && (
              <SmallIconButton
                onClick={() => {
                  viewDatasetInDebugConsole(tableItem.path);
                }}
                title="View this dataset in debug console"
                icon={<FaRegCircle />}
              />
            )}
          </div>
        </div>
      );
  }
};

const product = (arr: number[]) => {
  let ret = 1;
  for (const val of arr) {
    ret = ret * val;
  }
  return ret;
};

const abbreviateString = (val: any, maxLen: number) => {
  if (typeof val !== "string") return val;
  if (val.length <= maxLen) return val;
  return val.slice(0, maxLen) + "...";
};

export default TopLevelGroupContentPanel;
