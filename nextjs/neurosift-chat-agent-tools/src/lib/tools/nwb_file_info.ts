/* eslint-disable @typescript-eslint/no-explicit-any */
import { getRemoteH5FileLindi } from "./remote-h5-file";

interface NwbNeurodataObject {
  path: string;
  neurodata_type: string;
  description: string;
  shape?: number[];
}

interface NwbFileInfo {
  neurodataObjects: NwbNeurodataObject[];
  metadata: Record<string, string>;
}

export const tryGetLindiUrl = async (url: string, dandisetId: string) => {
  if (url.endsWith(".lindi.json") || url.endsWith(".lindi.tar")) {
    return url;
  }

  const parts = url.split("/");
  let assetId: string | undefined;
  let staging: boolean;
  let dId = dandisetId;

  if (url.startsWith("https://api-staging.dandiarchive.org/api/assets/")) {
    staging = true;
    assetId = parts[5];
  } else if (url.startsWith("https://api-staging.dandiarchive.org/api/dandisets/")) {
    staging = true;
    dId = parts[5];
    const indexOfAssetsPart = parts.indexOf("assets");
    if (indexOfAssetsPart === -1) return undefined;
    assetId = parts[indexOfAssetsPart + 1];
  } else if (url.startsWith("https://api.dandiarchive.org/api/assets/")) {
    staging = false;
    assetId = parts[5];
  } else if (url.startsWith("https://api.dandiarchive.org/api/dandisets/")) {
    staging = false;
    dId = parts[5];
    const indexOfAssetsPart = parts.indexOf("assets");
    if (indexOfAssetsPart === -1) return undefined;
    assetId = parts[indexOfAssetsPart + 1];
  } else {
    return undefined;
  }

  if (!dId || !assetId) return undefined;

  const aa = staging ? "dandi-staging" : "dandi";
  const tryUrl = `https://lindi.neurosift.org/${aa}/dandisets/${dId}/assets/${assetId}/nwb.lindi.json`;
  const resp = await fetch(tryUrl, { method: "HEAD" });
  return resp.ok ? tryUrl : undefined;
};

export type GeneralLabelMapItem = {
  name: string;
  newName: string;
  renderer?: (val: any) => string;
};

const generalLabelMap: GeneralLabelMapItem[] = [
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

const valueToString2 = (val: any): string => {
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
const serializeBigInt = (val: any): any => {
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

export async function getNwbFileInfo(
  dandisetId: string,
  nwbFileUrl: string
): Promise<NwbFileInfo> {
  const lindiUrl = await tryGetLindiUrl(nwbFileUrl, dandisetId);
  if (!lindiUrl) {
    throw new Error("Failed to get lindiUrl");
  }
  const f = await getRemoteH5FileLindi(lindiUrl);

  const neurodataObjects: NwbNeurodataObject[] = [];
  const loadNeurodataObjectsInGroup = async (path: string) => {
    const grp = await f.getGroup(path);
    if (!grp) return;
    if (grp.attrs?.neurodata_type) {
      neurodataObjects.push({
        path,
        neurodata_type: grp.attrs.neurodata_type,
        description: grp.attrs.description || ""
      });
    }
    for (const ds of grp.datasets) {
      if (ds.attrs?.neurodata_type) {
        neurodataObjects.push({
          path: ds.path,
          neurodata_type: ds.attrs.neurodata_type,
          description: ds.attrs.description || "",
          shape: ds.shape
        });
      }
    }
    for (const subgrp of grp.subgroups) {
      await loadNeurodataObjectsInGroup(subgrp.path);
    }
  };

  await loadNeurodataObjectsInGroup('/');

  const rootGroup = await f.getGroup('/');
  if (!rootGroup) {
    throw new Error("Failed to get root group");
  }
  const generalGroup = await f.getGroup('/general');
  const subjectGroup = await f.getGroup('/general/subject');

  const items: {
    name: string;
    path: string;
    renderer?: (val: any) => string;
  }[] = [];
  for (const group of [rootGroup, generalGroup, subjectGroup]) {
    if (!group) continue;


    group.datasets.forEach((ds) => {
      const mm = generalLabelMap.find(
        (item: GeneralLabelMapItem) => item.name === ds.name,
      );
      let newName = mm?.newName || ds.name;
      if (group === subjectGroup) {
        newName = `subject.${newName}`;
      }
      items.push({
        name: newName || ds.name,
        path: ds.path,
        renderer: mm?.renderer,
      });
    });
  }
  const itemsSorted = [...items].sort((a, b) => {
    const ind1 = generalLabelMap.findIndex(
      (item: GeneralLabelMapItem) => item.newName === a.name,
    );
    const ind2 = generalLabelMap.findIndex(
      (item: GeneralLabelMapItem) => item.newName === b.name,
    );
    if (ind1 >= 0) {
      if (ind2 < 0) return -1;
      return ind1 - ind2;
    }
    if (ind2 >= 0) {
      if (ind1 < 0) return 1;
      return ind1 - ind2;
    }
    return a.name.localeCompare(b.name);
  });

  const metadata: Record<string, string> = {};
  for (const item of itemsSorted) {
    const dsData = await f.getDatasetData(item.path, {});
    if (!dsData) continue;
    metadata[item.name] = item.renderer ? item.renderer(dsData) : valueToString2(dsData);
  }

  return {
    neurodataObjects: neurodataObjects,
    metadata
  };
}
