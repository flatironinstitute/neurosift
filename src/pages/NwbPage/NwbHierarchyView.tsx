import { FunctionComponent, useEffect, useMemo, useState } from "react";
import {
  Button,
  InlineMessage,
  LoadingState,
  ObjectRow,
  SelectionBar,
  SelectionList,
} from "@ui";
import "./ObjectTreeView.css";
import { NeurodataObject, useNeurodataObjects } from "./useNeurodataObjects";
import { findSuitablePlugins, nwbObjectViewPlugins } from "./plugins/registry";
import { NwbObjectViewPlugin } from "./plugins/pluginInterface";
import { useNwbFileSpecifications } from "./SpecificationsView/SetupNwbFileSpecificationsProvider";
import { neurodataTypeInheritsFrom } from "./neurodataTypeInheritance";

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
  const { neurodataObjects, loading, partialLoad } =
    useNeurodataObjects(nwbUrl);
  const [visiblyExpanded, setVisiblyExpanded] = useState<{
    [path: string]: boolean | undefined;
  }>({ "/": true });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionListShown, setSelectionListShown] = useState(false);
  const [
    launchablePluginsWithSecondaryPaths,
    setLaunchablePluginsWithSecondaryPaths,
  ] = useState<{
    [key: string]: { plugin: NwbObjectViewPlugin; secondaryPaths: string[] }[];
  }>({});
  const [objectsWithInteractiveViews, setObjectsWithInteractiveViews] =
    useState<Set<string> | null>(null);

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

  const specifications = useNwbFileSpecifications();

  useEffect(() => {
    let canceled = false;
    const loadLaunchablePlugins = async () => {
      const newLaunchablePluginsWithSecondaryPaths: {
        [key: string]: {
          plugin: NwbObjectViewPlugin;
          secondaryPaths: string[];
        }[];
      } = {};
      for (const obj of neurodataObjects) {
        const objectType = obj.group ? "group" : "dataset";
        const entries: {
          plugin: NwbObjectViewPlugin;
          secondaryPaths: string[];
        }[] = [];

        const plugins = await findSuitablePlugins(
          nwbUrl,
          obj.path,
          objectType,
          {
            launchableFromTable: true,
            specifications,
            defaultUnitsPath,
          },
        );
        if (canceled) return;
        for (const plugin of plugins) {
          entries.push({
            plugin,
            secondaryPaths: plugin.requiredDefaultUnits
              ? [defaultUnitsPath!]
              : [],
          });
        }

        // Plugins whose secondary object is derived from the full file (e.g.
        // aligning a TimeSeries against this TimeIntervals table). A button is
        // only shown when a compatible partner exists and canHandle confirms it.
        for (const plugin of nwbObjectViewPlugins) {
          if (!plugin.launchableFromTable) continue;
          if (!plugin.getLaunchSecondaryPaths) continue;
          const candidateList = await plugin.getLaunchSecondaryPaths({
            nwbUrl,
            path: obj.path,
            objectType,
            neurodataObjects,
          });
          if (canceled) return;
          for (const secondaryPaths of candidateList) {
            const ok = await plugin.canHandle({
              nwbUrl,
              path: obj.path,
              objectType,
              secondaryPaths,
              specifications,
            });
            if (ok) {
              entries.push({ plugin, secondaryPaths });
            }
          }
        }

        if (canceled) return;
        if (entries.length > 0) {
          newLaunchablePluginsWithSecondaryPaths[obj.path] = entries;
        }
      }
      if (canceled) return;
      setLaunchablePluginsWithSecondaryPaths(
        newLaunchablePluginsWithSecondaryPaths,
      );
    };
    loadLaunchablePlugins().catch((err) => {
      if (!canceled) console.error(err);
    });
    return () => {
      canceled = true;
    };
  }, [nwbUrl, neurodataObjects, defaultUnitsPath, specifications]);

  useEffect(() => {
    let canceled = false;
    const checkInteractiveViews = async () => {
      const interactivePaths = new Set<string>();
      for (const obj of neurodataObjects) {
        if (!obj.attrs.neurodata_type) continue;
        const objectType = obj.group ? "group" : "dataset";
        const plugins = await findSuitablePlugins(
          nwbUrl,
          obj.path,
          objectType,
          { specifications },
        );
        if (canceled) return;
        const hasInteractive = plugins.some(
          (p) => p.name !== "default" && p.name !== "PythonScript",
        );
        if (hasInteractive) {
          interactivePaths.add(obj.path);
        }
      }
      if (canceled) return;
      setObjectsWithInteractiveViews(interactivePaths);
    };
    checkInteractiveViews().catch((err) => {
      if (!canceled) console.error(err);
    });
    return () => {
      canceled = true;
    };
  }, [nwbUrl, neurodataObjects, specifications]);

  const neurodataObjectsByPath = useMemo(() => {
    const byPath: { [key: string]: NeurodataObject } = {};
    neurodataObjects.forEach((obj) => {
      byPath[obj.path] = obj;
    });
    return byPath;
  }, [neurodataObjects]);

  const nameOf = (path: string) => {
    const obj = neurodataObjectsByPath[path];
    if (!obj || path === "/") return path;
    return path.slice((obj.parent?.path || "").length).replace(/^\//, "");
  };

  const pluginKey = (
    path: string,
    plugin: NwbObjectViewPlugin,
    secondaryPaths: string[],
  ) => `${plugin.name}|${[path, ...secondaryPaths].join("^")}`;

  // The same view can appear twice with different partners, so name the partner.
  const viewName = (plugin: NwbObjectViewPlugin, secondaryPaths: string[]) =>
    secondaryPaths.length > 0 && !plugin.requiredDefaultUnits
      ? `${plugin.label || plugin.name}: ${secondaryPaths.map((p) => p.split("/").pop()).join(", ")}`
      : plugin.label || plugin.name;

  const parseKey = (key: string) => {
    if (!key.includes("|")) return { path: key };
    const [pluginName, rest] = key.split("|");
    const [path, ...secondaryPaths] = rest.split("^");
    const plugin = launchablePluginsWithSecondaryPaths[path]?.find(
      (p) => p.plugin.name === pluginName,
    )?.plugin;
    return { path, plugin, secondaryPaths };
  };

  const labelOf = (key: string) => {
    const { path, plugin, secondaryPaths } = parseKey(key);
    return plugin
      ? `${nameOf(path)}, ${viewName(plugin, secondaryPaths ?? [])}`
      : nameOf(path);
  };

  const toggleSelected = (key: string) => (on: boolean) =>
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const openSelection = () => {
    const selections = Array.from(selectedItems);
    if (selections.length === 1) {
      const { path, plugin, secondaryPaths } = parseKey(selections[0]);
      if (plugin) onOpenObjectInNewTab?.(path, plugin, secondaryPaths);
      else onOpenObjectInNewTab?.(path);
    } else if (selections.length > 1) {
      onOpenObjectsInNewTab?.(selections);
    }
    setSelectedItems(new Set());
    setSelectionListShown(false);
  };

  const renderObject = (obj: NeurodataObject, level: number) => {
    const expanded = Boolean(visiblyExpanded[obj.path]);
    const isUnits = neurodataTypeInheritsFrom(
      obj.attrs.neurodata_type,
      "Units",
      specifications,
    );
    const isDefaultUnits = obj.path === defaultUnitsPath;
    return (
      <ObjectRow
        key={obj.path}
        name={nameOf(obj.path)}
        path={obj.path}
        type={obj.attrs.neurodata_type || ""}
        description={obj.attrs.description || undefined}
        level={level}
        kind={
          obj.children.length === 0
            ? "leaf"
            : expanded
              ? "expanded"
              : "collapsed"
        }
        // false, not undefined, so a closed group isn't auto-expanded again
        onToggle={() =>
          setVisiblyExpanded((prev) => ({
            ...prev,
            [obj.path]: !prev[obj.path],
          }))
        }
        checked={selectedItems.has(obj.path)}
        onCheck={toggleSelected(obj.path)}
        onOpen={() => onOpenObjectInNewTab?.(obj.path)}
        hasView={objectsWithInteractiveViews?.has(obj.path) ?? false}
        views={(launchablePluginsWithSecondaryPaths[obj.path] ?? []).map(
          ({ plugin, secondaryPaths }) => {
            const key = pluginKey(obj.path, plugin, secondaryPaths);
            return {
              name: viewName(plugin, secondaryPaths),
              checked: selectedItems.has(key),
              onCheck: toggleSelected(key),
              onOpen: () =>
                onOpenObjectInNewTab?.(obj.path, plugin, secondaryPaths),
            };
          },
        )}
        badge={
          isUnits ? (
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={isDefaultUnits}
              onClick={() =>
                onSetDefaultUnitsPath?.(isDefaultUnits ? undefined : obj.path)
              }
            >
              {isDefaultUnits ? "Default units" : "Set as default units"}
            </Button>
          ) : undefined
        }
      >
        {expanded &&
          obj.children.map((child) => renderObject(child, level + 1))}
      </ObjectRow>
    );
  };

  const root = neurodataObjectsByPath["/"];
  const selection = Array.from(selectedItems);

  return (
    <div className="object-tree">
      {partialLoad && (
        <InlineMessage status="info">
          Only some objects are shown: this file has too many to list them all.
        </InlineMessage>
      )}
      {selection.length > 0 && (
        <SelectionBar
          names={selection.map(labelOf)}
          onShowList={() => setSelectionListShown((shown) => !shown)}
          onClear={() => {
            setSelectedItems(new Set());
            setSelectionListShown(false);
          }}
          onViewTogether={openSelection}
        />
      )}
      {selectionListShown && selection.length > 2 && (
        <SelectionList
          items={selection.map((key) => ({
            id: key,
            label: labelOf(key),
            context: parseKey(key).path,
          }))}
          onRemove={(key) => toggleSelected(key)(false)}
        />
      )}
      <ul className="object-tree-list" aria-label="Objects in this file">
        {root &&
          visiblyExpanded["/"] &&
          root.children.map((child) => renderObject(child, 1))}
      </ul>
      {loading && (
        <LoadingState label="Reading the file’s objects" phase="loading" />
      )}
    </div>
  );
};

export default NwbHierarchyView;
