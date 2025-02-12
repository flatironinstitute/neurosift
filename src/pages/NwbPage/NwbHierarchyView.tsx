import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import "@css/NwbHierarchyView.css";
import { NeurodataObject, useNeurodataObjects } from "./useNeurodataObjects";
import { findSuitablePlugins } from "./plugins/registry";
import { NwbObjectViewPlugin } from "./plugins/pluginInterface";

type Props = {
  nwbUrl: string;
  onOpenObjectInNewTab?: (
    path: string,
    plugin?: NwbObjectViewPlugin,
    secondaryPaths?: string[],
  ) => void;
  onOpenObjectsInNewTab?: (paths: string[]) => void;
  isExpanded?: boolean;
  defaultUnitsPath?: string;
  onSetDefaultUnitsPath?: (path: string | undefined) => void;
};

const NwbHierarchyView: FunctionComponent<Props> = ({
  nwbUrl,
  onOpenObjectInNewTab,
  onOpenObjectsInNewTab,
  defaultUnitsPath,
  onSetDefaultUnitsPath,
}) => {
  const { neurodataObjects, loading } = useNeurodataObjects(nwbUrl);
  const [visiblyExpanded, setVisiblyExpanded] = useState<{
    [path: string]: boolean | undefined;
  }>({ "/": true });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set(),
  );
  const [
    specialPluginsWithSecondaryPaths,
    setSpecialPluginsWithSecondaryPaths,
  ] = useState<{
    [key: string]: { plugin: NwbObjectViewPlugin; secondaryPaths: string[] }[];
  }>({});

  // if any objects have only a single child, and their parent is visibly expanded, expand the object
  useEffect(() => {
    const toNewlyExpandPaths = new Set<string>();
    let somethingChanged = true;
    while (somethingChanged) {
      somethingChanged = false;
      for (const obj of neurodataObjects) {
        if (obj.parent && obj.children.length === 1) {
          if (
            visiblyExpanded[obj.path] === undefined &&
            visiblyExpanded[obj.parent.path]
          ) {
            if (!toNewlyExpandPaths.has(obj.path)) {
              toNewlyExpandPaths.add(obj.path);
              somethingChanged = true;
            }
          }
        }
      }
    }
    if (toNewlyExpandPaths.size > 0) {
      setVisiblyExpanded((prev) => {
        const next = { ...prev };
        toNewlyExpandPaths.forEach((path) => {
          next[path] = true;
        });
        return next;
      });
    }
  }, [neurodataObjects, visiblyExpanded]);

  useEffect(() => {
    const loadSpecialPlugins = async () => {
      const newSpecialPluginsWithSecondaryPaths: {
        [key: string]: {
          plugin: NwbObjectViewPlugin;
          secondaryPaths: string[];
        }[];
      } = {};
      for (const obj of neurodataObjects) {
        if (defaultUnitsPath) {
          const objectType = obj.group ? "group" : "dataset";
          const plugins = await findSuitablePlugins(
            nwbUrl,
            obj.path,
            objectType,
            {
              special: true,
              secondaryPaths: [defaultUnitsPath],
            },
          );
          if (plugins.length > 0) {
            newSpecialPluginsWithSecondaryPaths[obj.path] = plugins.map(
              (plugin) => ({ plugin, secondaryPaths: [defaultUnitsPath] }),
            );
          }
        }
      }
      setSpecialPluginsWithSecondaryPaths(newSpecialPluginsWithSecondaryPaths);
    };
    loadSpecialPlugins();
  }, [nwbUrl, neurodataObjects, defaultUnitsPath]);

  const truncateDescription = useCallback(
    (text: string, path: string) => {
      if (!text) return "";
      const maxLength = 200;
      if (text.length <= maxLength) return text;

      if (expandedDescriptions.has(path)) {
        return (
          <span>
            {text}
            <span
              onClick={(e) => {
                e.stopPropagation();
                setExpandedDescriptions((prev) => {
                  const next = new Set(prev);
                  next.delete(path);
                  return next;
                });
              }}
              style={{
                marginLeft: "5px",
                color: "#007bff",
                cursor: "pointer",
                fontSize: "0.9em",
              }}
            >
              show less
            </span>
          </span>
        );
      }

      return (
        <span>
          {text.slice(0, maxLength)}...
          <span
            onClick={(e) => {
              e.stopPropagation();
              setExpandedDescriptions((prev) => {
                const next = new Set(prev);
                next.add(path);
                return next;
              });
            }}
            style={{
              marginLeft: "5px",
              color: "#007bff",
              cursor: "pointer",
              fontSize: "0.9em",
            }}
          >
            read more
          </span>
        </span>
      );
    },
    [expandedDescriptions],
  );

  const renderRow = (path: string) => {
    const obj = neurodataObjectsByPath[path];
    if (!obj) return null;

    // Calculate depth by counting ancestors
    // Calculate depth by counting ancestors, but subtract 1 since we're not showing root
    let depth = -1; // start at -1 so root's children start at 0
    let current = obj;
    while (current.parent) {
      depth++;
      current = current.parent;
    }
    const indentation = Math.max(0, depth * 20);
    // For root, show just '/'
    // For other nodes, show the path difference from parent
    const name =
      obj.path === "/"
        ? "/"
        : (() => {
            const parentPath = obj.parent?.path || "";
            // Remove parent path from the start, and also remove leading slash
            const relativePath = obj.path
              .slice(parentPath.length)
              .replace(/^\//, "");
            return relativePath;
          })();

    // If expanded, check for actual children
    // If not expanded, check if it has any subgroups that could potentially be children
    const isVisiblyExpanded = visiblyExpanded[obj.path];
    const showExpansionControl = obj.children.length > 0;

    return (
      <tr key={obj.path}>
        <td>
          <div
            style={{
              marginLeft: indentation,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {showExpansionControl ? (
              <span
                onClick={() => {
                  setVisiblyExpanded((prev) => {
                    const next = { ...prev };
                    if (prev[obj.path]) {
                      next[obj.path] = false; // important to set false rather than undefined so it doesn't get auto-expanded
                    } else {
                      next[obj.path] = true;
                    }
                    return next;
                  });
                }}
                style={{ cursor: "pointer", width: "20px", userSelect: "none" }}
              >
                {
                  //obj.expanding ? "..." : isVisiblyExpanded ? "▼" : "►"
                  isVisiblyExpanded ? "▼" : "►"
                }
              </span>
            ) : (
              <span style={{ width: "20px" }}></span>
            )}
            <input
              type="checkbox"
              checked={selectedItems.has(obj.path)}
              onChange={(e) => {
                e.stopPropagation();
                setSelectedItems((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) {
                    next.add(obj.path);
                  } else {
                    next.delete(obj.path);
                  }
                  return next;
                });
              }}
              style={{ marginRight: "5px" }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                {obj.dataset && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#666",
                      fontFamily: "monospace",
                      position: "relative",
                      top: "-1px",
                    }}
                  >
                    ▪️
                  </span>
                )}
                <span>{name}</span>
              </span>
              {onOpenObjectInNewTab && (
                <span
                  title="Open item in new tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenObjectInNewTab(obj.path);
                  }}
                  style={{
                    cursor: "pointer",
                    opacity: 0.7,
                    fontSize: "16px",
                    marginLeft: "4px",
                    padding: "2px 4px",
                    borderRadius: "4px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.opacity = "0.7";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  ⧉
                </span>
              )}
              {specialPluginsWithSecondaryPaths[obj.path]?.map(
                ({ plugin, secondaryPaths }) => (
                  <button
                    key={plugin.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenObjectInNewTab?.(obj.path, plugin, secondaryPaths);
                    }}
                    style={{
                      padding: "2px 6px",
                      fontSize: "12px",
                      backgroundColor: "#f8f9fa",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: "#6c757d",
                      marginLeft: "4px",
                    }}
                    title={`Open in ${plugin.name}`}
                  >
                    {plugin.label || plugin.name}
                  </button>
                ),
              )}
            </div>
          </div>
        </td>
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span>{obj.attrs.neurodata_type || "-"}</span>
            {obj.attrs.neurodata_type === "Units" && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onSetDefaultUnitsPath?.(
                    obj.path === defaultUnitsPath ? undefined : obj.path,
                  );
                }}
                style={{
                  marginLeft: "4px",
                  fontSize: "12px",
                  cursor: "pointer",
                  color: obj.path === defaultUnitsPath ? "#007bff" : "#6c757d",
                  opacity: obj.path === defaultUnitsPath ? 1 : 0.6,
                }}
                title={
                  obj.path === defaultUnitsPath
                    ? "Default units"
                    : "Set as default units"
                }
              >
                {obj.path === defaultUnitsPath ? "(default)" : "(set default)"}
              </span>
            )}
          </div>
        </td>
        <td style={{ maxWidth: "400px" }}>
          {truncateDescription(obj.attrs.description || "", obj.path)}
        </td>
      </tr>
    );
  };

  const neurodataObjectsByPath = useMemo(() => {
    // create a map of neurodata objects by path
    const neurodataObjectsByPath: { [key: string]: NeurodataObject } = {};
    neurodataObjects.forEach((obj) => {
      neurodataObjectsByPath[obj.path] = obj;
    });
    return neurodataObjectsByPath;
  }, [neurodataObjects]);

  const visiblePaths = useMemo(() => {
    // Recursively get all visible paths
    const getVisiblePaths = (path: string): string[] => {
      const obj = neurodataObjectsByPath[path];
      if (!obj) return [];

      const result: string[] = [];
      // Don't include root in the result, but check its expanded state
      if (path === "/") {
        if (visiblyExpanded[obj.path]) {
          const children = obj.children;
          children.forEach((child) => {
            result.push(...getVisiblePaths(child.path));
          });
        }
        return result;
      }
      result.push(path);
      if (visiblyExpanded[obj.path]) {
        const children = obj.children;
        children.forEach((child) => {
          result.push(...getVisiblePaths(child.path));
        });
      }
      return result;
    };
    return getVisiblePaths("/");
  }, [visiblyExpanded, neurodataObjectsByPath]);

  return (
    <div style={{ margin: "10px" }}>
      {selectedItems.size > 0 && (
        <div style={{ marginBottom: "10px", display: "flex", gap: "10px" }}>
          {onOpenObjectInNewTab && (
            <button
              title="Open selected in new tab"
              onClick={() => {
                const paths: string[] = Array.from(selectedItems);
                if (paths.length === 1) {
                  onOpenObjectInNewTab?.(paths[0]);
                } else if (paths.length > 1) {
                  onOpenObjectsInNewTab?.(paths);
                }
                setSelectedItems(new Set()); // Clear selection after opening
              }}
              style={{
                padding: "4px 8px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "14px",
              }}
            >
              <span style={{ fontSize: "16px" }}>⧉</span>
              {selectedItems.size}
            </button>
          )}
        </div>
      )}
      <table className="nwb-hierarchy-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Neurodata Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>{visiblePaths.map((path) => renderRow(path))}</tbody>
      </table>
      {loading && <div>Loading...</div>}
    </div>
  );
};

export default NwbHierarchyView;
