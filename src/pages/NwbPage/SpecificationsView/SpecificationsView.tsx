import {
  DataTable,
  EmptyState,
  LoadingState,
  SearchField,
  SegmentedControl,
} from "@ui";
import { FunctionComponent, useMemo, useState } from "react";
import {
  useNeurodataObjects,
  type NeurodataObject,
} from "../useNeurodataObjects";
import "../Hdf5View/ReferenceView.css";
import { useElementSize } from "../useElementSize";
import { NamespaceDetails, TypeDetails } from "./SchemaDetails";
import {
  useNwbFileSpecifications,
  type NwbFileSpecifications,
} from "./SetupNwbFileSpecificationsProvider";
import {
  firstSentence,
  inheritance,
  matchesType,
  schemaTypes,
  type SchemaType,
} from "./schemaTypes";

type Props = {
  nwbUrl: string;
  /** Opens a path in the HDF5 tab. */
  onOpenPath: (path: string) => void;
};

const typeKey = (t: SchemaType) => `type:${t.namespace}:${t.name}`;

/** Where each neurodata type is used in the file. */
function pathsByType(objects: NeurodataObject[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const walk = (list: NeurodataObject[]) =>
    list.forEach((o) => {
      const type = o.attrs?.neurodata_type;
      const paths = map.get(type) ?? [];
      if (type && !paths.includes(o.path)) map.set(type, [...paths, o.path]);
      walk(o.children);
    });
  walk(objects);
  return map;
}

/** The NWB specifications stored in the file, once they are read. */
const SpecificationsView: FunctionComponent<Props> = (props) => {
  const specifications = useNwbFileSpecifications();
  if (!specifications)
    return <LoadingState label="Reading the specifications" phase="loading" />;
  return <SchemaBrowser {...props} specifications={specifications} />;
};

/** Namespaces and types, with the selected one's details. */
const SchemaBrowser: FunctionComponent<
  Props & { specifications: NwbFileSpecifications }
> = ({ nwbUrl, onOpenPath, specifications }) => {
  const { neurodataObjects, loading } = useNeurodataObjects(nwbUrl);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [active, setActive] = useState<string>();
  const [mainRef, mainSize] = useElementSize<HTMLDivElement>();

  const types = useMemo(() => schemaTypes(specifications), [specifications]);
  const used = useMemo(() => pathsByType(neurodataObjects), [neurodataObjects]);

  const namespaces = specifications.allNamespaces;
  const shown = types.filter(
    (t) => matchesType(t, query) && (scope === "all" || used.has(t.name)),
  );
  const groups = types.filter((t) => t.kind === "Group").length;
  const summary = `The specifications stored in this file: ${namespaces.length} namespaces, ${types.length} types (${groups} groups, ${types.length - groups} datasets)`;

  const activeType = types.find((t) => typeKey(t) === active);
  const activeNamespace = namespaces.find((ns) => `ns:${ns.name}` === active);

  return (
    <div className="reference-view">
      <p className="reference-summary">{summary}</p>
      <div className="reference-find">
        <SearchField
          label="Find a type"
          placeholder="Find a type"
          size="md"
          value={query}
          onChange={setQuery}
          onSearch={setQuery}
        />
        <SegmentedControl
          label="Which types"
          size="sm"
          value={scope}
          onChange={setScope}
          options={[
            { value: "all", label: "All types" },
            { value: "used", label: "Used in this file" },
          ]}
        />
      </div>
      <div className="reference-split">
        <div className="reference-main" ref={mainRef}>
          <div className="reference-group">
            <h2 className="reference-section-title">Namespaces</h2>
            <DataTable
              caption="Namespaces"
              rows={namespaces}
              rowKey={(ns) => `ns:${ns.name}`}
              active={active}
              onActivate={setActive}
              columns={[
                {
                  key: "name",
                  label: "Namespace",
                  type: "code",
                  value: (ns) => ns.name,
                },
                { key: "version", label: "Version", value: (ns) => ns.version },
                {
                  key: "full",
                  label: "Full name",
                  value: (ns) => ns.full_name,
                },
                { key: "doc", label: "Description", value: (ns) => ns.doc },
              ]}
            />
          </div>
          <div className="reference-group">
            <h2 className="reference-section-title">Types</h2>
            {shown.length === 0 ? (
              <EmptyState
                title={
                  query.trim()
                    ? `No type matches “${query.trim()}”.`
                    : "No types are used in this file yet."
                }
                action={{
                  label: "Show all types",
                  onClick: () => {
                    setQuery("");
                    setScope("all");
                  },
                }}
              >
                {scope === "used" && loading
                  ? "The file is still being read."
                  : "Find looks at type names."}
              </EmptyState>
            ) : (
              <DataTable
                caption="Types"
                rows={shown}
                rowKey={typeKey}
                active={active}
                onActivate={setActive}
                columns={[
                  {
                    key: "name",
                    label: "Type",
                    type: "code",
                    value: (t) => t.name,
                  },
                  // A narrow pane drops Extends; the details still say it.
                  ...(mainSize.width === 0 || mainSize.width >= 760
                    ? [
                        {
                          key: "extends",
                          label: "Extends",
                          type: "code" as const,
                          value: (t: SchemaType) => t.extends,
                        },
                      ]
                    : []),
                  { key: "kind", label: "Kind", value: (t) => t.kind },
                  {
                    key: "namespace",
                    label: "Namespace",
                    type: "code",
                    value: (t) => t.namespace,
                  },
                  {
                    key: "doc",
                    label: "Description",
                    value: (t) => firstSentence(t.doc),
                  },
                ]}
              />
            )}
            {shown.length > 0 && shown.length < types.length && (
              <p className="reference-note">{`${shown.length} of ${types.length} types shown.`}</p>
            )}
          </div>
        </div>
        <aside className="reference-details" aria-label="Details">
          {activeType ? (
            <TypeDetails
              key={active}
              type={activeType}
              chain={inheritance(types, activeType.name)}
              paths={used.get(activeType.name) ?? (loading ? undefined : [])}
              onOpenPath={onOpenPath}
            />
          ) : activeNamespace ? (
            <NamespaceDetails key={active} namespace={activeNamespace} />
          ) : (
            <p className="reference-note">
              Pick a namespace or type to see its details.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default SpecificationsView;
