/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import {
  SpecificationsDataset,
  SpecificationsGroup,
  SpecificationsNamespace,
  useNwbFileSpecifications,
} from "./SetupNwbFileSpecificationsProvider";
import { Hyperlink } from "@fi-sci/misc";
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";

type SpecificationsViewProps = {
  width: number;
  height: number;
};

type SelectedItem =
  | {
      type: "group";
      group: SpecificationsGroup;
    }
  | {
      type: "dataset";
      dataset: SpecificationsDataset;
    }
  | {
      type: "namespace";
      namespace: SpecificationsNamespace;
    };

const SpecificationsView: FunctionComponent<SpecificationsViewProps> = ({
  width,
  height,
}) => {
  const specifications = useNwbFileSpecifications();
  useEffect(() => {
    console.info("SPECIFICATIONS");
    console.info(specifications);
  }, [specifications]);
  const {
    handleOpen: openItem,
    handleClose: closeItem,
    visible: itemVisible,
  } = useModalWindow();
  const [selectedItem, setSelectedItem] = useState<SelectedItem | undefined>(
    undefined,
  );
  const openGroup = useCallback(
    (group: SpecificationsGroup) => {
      setSelectedItem({ type: "group", group });
      openItem();
    },
    [setSelectedItem, openItem],
  );
  const openDataset = useCallback(
    (dataset: any) => {
      setSelectedItem({ type: "dataset", dataset });
      openItem();
    },
    [setSelectedItem, openItem],
  );
  const openNamespace = useCallback(
    (namespace: SpecificationsNamespace) => {
      setSelectedItem({ type: "namespace", namespace });
      openItem();
    },
    [setSelectedItem, openItem],
  );
  return (
    <div style={{ position: "absolute", width, height, overflowY: "auto" }}>
      <h3>Namespaces</h3>
      <table className="nwb-table">
        <thead>
          <tr>
            <th>Namespace</th>
            <th>Version</th>
            <th>Author</th>
            <th>Contact</th>
            <th>Doc</th>
            <th>Full Name</th>
            <th>Schema</th>
          </tr>
        </thead>
        <tbody>
          {specifications?.allNamespaces?.map((ns, i) => (
            <tr key={i}>
              <td>
                <Hyperlink onClick={() => openNamespace(ns)}>
                  {ns.name}
                </Hyperlink>
              </td>
              <td>{ns.version}</td>
              <td>
                {typeof ns.author === "string"
                  ? ns.author
                  : ns.author.join(", ")}
              </td>
              <td>
                {typeof ns.contact === "string"
                  ? ns.contact
                  : ns.contact.join(", ")}
              </td>
              <td>{abbr(ns.doc)}</td>
              <td>{ns.full_name}</td>
              <td>
                {ns.schema
                  .map((s) =>
                    "namespace" in s
                      ? s.namespace
                      : "source" in s
                        ? s.source
                        : "",
                  )
                  .join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Datasets</h3>
      <table className="nwb-table">
        <thead>
          <tr>
            <th>neurodata_type_def</th>
            <th>neurodata_type_inc</th>
            <th>dtype</th>
            <th>dims</th>
            <th>attributes</th>
          </tr>
        </thead>
        <tbody>
          {specifications?.allDatasets?.map((ds, i) => (
            <tr key={i}>
              <td>
                <Hyperlink onClick={() => openDataset(ds)}>
                  {ds.neurodata_type_def}
                </Hyperlink>
              </td>
              <td>{ds.neurodata_type_inc}</td>
              <td>{abbr(JSON.stringify(ds.dtype))}</td>
              <td>{abbr(JSON.stringify(ds.dims))}</td>
              <td>{abbr(JSON.stringify(ds.attributes))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Groups</h3>
      <table className="nwb-table">
        <thead>
          <tr>
            <th>neurodata_type_def</th>
            <th>neurodata_type_inc</th>
            <th>default_name</th>
            <th>doc</th>
            <th>datasets</th>
            <th>groups</th>
          </tr>
        </thead>
        <tbody>
          {specifications?.allGroups?.map((g, i) => (
            <tr key={i}>
              <td>
                <Hyperlink onClick={() => openGroup(g)}>
                  {g.neurodata_type_def}
                </Hyperlink>
              </td>
              <td>{g.neurodata_type_inc}</td>
              <td>{g.default_name}</td>
              <td>{abbr(g.doc)}</td>
              <td>{abbr(JSON.stringify(g.datasets))}</td>
              <td>{abbr(JSON.stringify(g.groups))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ModalWindow visible={itemVisible} onClose={closeItem}>
        <SelectedItemView selectedItem={selectedItem} closeItem={closeItem} />
      </ModalWindow>
    </div>
  );
};

type SelectedItemViewProps = {
  selectedItem: SelectedItem | undefined;
  closeItem: () => void;
};

const SelectedItemView: FunctionComponent<SelectedItemViewProps> = ({
  selectedItem,
  closeItem,
}) => {
  if (!selectedItem) return null;
  switch (selectedItem.type) {
    case "group":
      return <GroupView group={selectedItem.group} closeItem={closeItem} />;
    case "dataset":
      return (
        <DatasetView dataset={selectedItem.dataset} closeItem={closeItem} />
      );
    case "namespace":
      return (
        <NamespaceView
          namespace={selectedItem.namespace}
          closeItem={closeItem}
        />
      );
  }
};

type GroupViewProps = {
  group: SpecificationsGroup;
  closeItem: () => void;
};

const GroupView: FunctionComponent<GroupViewProps> = ({ group, closeItem }) => {
  return (
    <div>
      <h3>{group.neurodata_type_def}</h3>
      <div>
        <pre>{JSON.stringify(group, null, 2)}</pre>
      </div>
    </div>
  );
};

type DatasetViewProps = {
  dataset: any;
  closeItem: () => void;
};

const DatasetView: FunctionComponent<DatasetViewProps> = ({
  dataset,
  closeItem,
}) => {
  return (
    <div>
      <h3>{dataset.neurodata_type_def}</h3>
      <div>
        <pre>{JSON.stringify(dataset, null, 2)}</pre>
      </div>
    </div>
  );
};

type NamespaceViewProps = {
  namespace: SpecificationsNamespace;
  closeItem: () => void;
};

const NamespaceView: FunctionComponent<NamespaceViewProps> = ({
  namespace,
  closeItem,
}) => {
  return (
    <div>
      <h3>{namespace.name}</h3>
      <div>
        <pre>{JSON.stringify(namespace, null, 2)}</pre>
      </div>
    </div>
  );
};

const abbr = (s: string) => abbreviate(s, 60);

const abbreviate = (s: string, maxLength: number) => {
  if (!s) return "";
  if (s.length <= maxLength) return s;
  return s.slice(0, maxLength - 3) + "...";
};

export default SpecificationsView;
