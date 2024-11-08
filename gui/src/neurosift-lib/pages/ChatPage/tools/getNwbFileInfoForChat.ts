import { RemoteH5Dataset, RemoteH5FileX } from "../../../remote-h5-file/index";

type GeneralItem = {
  name: string;
  path: string;
  renderer?: (val: any) => string;
  dataset?: RemoteH5Dataset;
  datasetData: any;
};

type NeurodataItem = {
  path: string;
  neurodataType: string;
  description: string;
};

type DatasetItem = {
  path: string;
  shape: number[];
  dtype: string;
  neurodataType?: string;
  otherText: string;
};

// type SpecificationItem = {
//   neurodataType: string;
//   doc: string;
// };

export const leftPanelLabelMap: {
  name: string;
  newName: string;
  renderer?: (val: any) => string;
}[] = [
  { name: "session_id", newName: "Session ID" },
  {
    name: "experimenter",
    newName: "Experimenter",
    renderer: (val: any) => {
      if (!val) return "";
      if (Array.isArray(val)) {
        return val.join("; ");
      } else return val + "";
    },
  },
  { name: "lab", newName: "Lab" },
  { name: "institution", newName: "Institution" },
  { name: "related_publications", newName: "Related publications" },
  { name: "experiment_description", newName: "Experiment description" },
  { name: "session_description", newName: "Session description" },
  { name: "identifier", newName: "Identifier" },
  { name: "session_start_time", newName: "Session start" },
  { name: "timestamps_reference_time", newName: "Timestamps ref." },
  { name: "file_create_date", newName: "File creation" },
];

export type NwbFileInfoForChat = {
  metaFields: {
    name: string;
    value: string;
  }[];
  neurodataGroups: {
    path: string;
    neurodataType: string;
    description: string;
  }[];
  neurodataDatasets: {
    path: string;
    neurodataType: string;
    description: string;
    shape: number[];
    dtype: string;
  }[];
};

export const getNwbFileInfoForChat = async (
  nwbFile: RemoteH5FileX,
): Promise<NwbFileInfoForChat> => {
  const rootGroup = await nwbFile.getGroup("/");
  if (!rootGroup) {
    throw Error("root group not found");
  }
  const generalItems: GeneralItem[] = [];
  for (const ds of rootGroup.datasets) {
    const mm = leftPanelLabelMap.find((x) => x.name === ds.name);
    const newName = mm?.newName || ds.name;
    generalItems.push({
      name: newName || ds.name,
      path: ds.path,
      renderer: mm?.renderer,
      dataset: await nwbFile.getDataset(ds.path),
      datasetData: await nwbFile.getDatasetData(ds.path, {}),
    });
  }
  const generalGroup = await nwbFile.getGroup("/general");
  if (generalGroup) {
    for (const ds of generalGroup.datasets) {
      const mm = leftPanelLabelMap.find((x) => x.name === ds.name);
      const newName = mm?.newName || ds.name;
      generalItems.push({
        name: newName || ds.name,
        path: ds.path,
        renderer: mm?.renderer,
        dataset: await nwbFile.getDataset(ds.path),
        datasetData: await nwbFile.getDatasetData(ds.path, {}),
      });
    }
  }

  const neurodataGroups: NeurodataItem[] = [];
  const neurodataDatasets: DatasetItem[] = [];
  const processGroup = async (groupPath: string) => {
    if (groupPath === "/specifications") return; // skip the specifications group
    if (groupPath === "/general") return; // skip the general group
    const group = await nwbFile.getGroup(groupPath);
    if (!group) {
      return;
    }
    if (group.attrs.neurodata_type) {
      neurodataGroups.push({
        path: groupPath,
        neurodataType: group.attrs.neurodata_type || undefined,
        description: group.attrs.description || "",
      });
    }
    for (const subGroup of group.subgroups) {
      await processGroup(subGroup.path);
    }
    if (groupPath !== "/") {
      // skip the datasets in the root group
      for (const ds of group.datasets) {
        await processDataset(ds.path);
      }
    }
  };
  const processDataset = async (datasetPath: string) => {
    const ds = await nwbFile.getDataset(datasetPath);
    if (!ds) return;
    const otherText: string[] = [];
    if (ds.attrs.neurodata_type) {
      otherText.push(`neurodata_type: ${ds.attrs.neurodata_type}`);
    }
    if (ds.attrs.description) {
      otherText.push(`description: ${ds.attrs.description}`);
    }
    neurodataDatasets.push({
      path: datasetPath,
      shape: ds.shape,
      dtype: ds.dtype,
      neurodataType: ds.attrs.neurodata_type || undefined,
      otherText: otherText.join(" | "),
    });
  };
  await processGroup("/");
  const ret: NwbFileInfoForChat = {
    metaFields: [],
    neurodataGroups: [],
    neurodataDatasets: [],
  };
  for (const x of generalItems) {
    const vv = await nwbFile.getDatasetData(x.path, {});
    ret.metaFields.push({
      name: x.name,
      value: valueToString2(vv),
    });
  }
  for (const x of neurodataGroups) {
    ret.neurodataGroups.push({
      path: x.path,
      neurodataType: x.neurodataType,
      description: x.description,
    });
  }
  for (const x of neurodataDatasets) {
    ret.neurodataDatasets.push({
      path: x.path,
      neurodataType: x.neurodataType || "",
      description: x.otherText,
      shape: x.shape,
      dtype: x.dtype,
    });
  }
  return ret;
};

export const valueToString2 = (val: any): string => {
  // same as valueToString, but don't include the brackets for arrays
  if (typeof val === "string") {
    return val;
  } else if (typeof val === "number") {
    return val + "";
  } else if (typeof val === "boolean") {
    return val ? "true" : "false";
  } else if (typeof val === "object") {
    if (Array.isArray(val)) {
      return `${val.map((x) => valueToString2(x)).join(", ")}`;
    } else {
      return JSON.stringify(serializeBigInt(val));
    }
  } else {
    return "<>";
  }
};

export const serializeBigInt = (val: any): any => {
  if (typeof val === "bigint") {
    // convert to number
    return Number(val);
  } else if (typeof val === "object") {
    if (Array.isArray(val)) {
      return val.map((x) => serializeBigInt(x));
    } else {
      const ret: { [key: string]: any } = {};
      for (const key in val) {
        ret[key] = serializeBigInt(val[key]);
      }
      return ret;
    }
  } else {
    return val;
  }
};

export default getNwbFileInfoForChat;
