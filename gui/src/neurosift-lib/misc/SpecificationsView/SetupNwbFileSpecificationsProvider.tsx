/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FunctionComponent,
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import { RemoteH5FileX } from "../../remote-h5-file/index";

export const SpecificationsContext = createContext<
  NwbFileSpecifications | undefined
>(undefined);

export const SetupNwbFileSpecificationsProvider: FunctionComponent<
  PropsWithChildren
> = ({ children }) => {
  const [specifications, setSpecifications] = useState<
    NwbFileSpecifications | undefined
  >(undefined);
  const nwbFile = useNwbFile();
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const c = await loadSpecifications(nwbFile);
        if (canceled) return;
        setSpecifications(c);
      } catch (e) {
        console.error(e);
        console.error("Error creating SpecificationsClient");
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFile]);
  return (
    <SpecificationsContext.Provider value={specifications}>
      {children}
    </SpecificationsContext.Provider>
  );
};

export const useNwbFileSpecifications = () => {
  return useContext(SpecificationsContext);
};

export type NwbFileSpecifications = {
  subgroups: SpecificationsSubgroup[];
  allNamespaces: SpecificationsNamespace[];
  allDatasets: SpecificationsDataset[];
  allGroups: SpecificationsGroup[];
};

export type SpecificationsSubgroup = {
  name: string;
  versions: SpecificationsSubgroupVersion[];
};

export type SpecificationsSubgroupVersion = {
  version: string;
  items: SpecificationsItem[];
};

export type SpecificationsItem = {
  name: string;
  value: SpecificationsItemValue;
};

export type SpecificationsItemValue = {
  namespaces?: SpecificationsNamespace[];
  datasets?: SpecificationsDataset[];
  groups?: SpecificationsGroup[];
};

export type SpecificationsNamespace = {
  author: string | string[];
  contact: string | string[];
  doc: string;
  full_name: string;
  name: string;
  schema: SpecificationsNamespaceSchema[];
  version: string;
};

export type SpecificationsDataset = {
  doc: string;
  neurodata_type_def: string;
  neurodata_type_inc?: string;
  dtype?: any;
  dims?: any;
  attributes?: any;
};

export type SpecificationsGroup = {
  doc: string;
  default_name: string;
  neurodata_type_def: string;
  neurodata_type_inc?: string;
  datasets?: any[];
  groups?: any[];
};

export type SpecificationsNamespaceSchema =
  | {
      namespace: string;
    }
  | {
      source: string;
    };

const getHighestVersion = (
  versions: SpecificationsSubgroupVersion[],
  label: string,
) => {
  let highestVersion = versions[0];
  for (const version of versions) {
    if (compareVersions(version.version, highestVersion.version) > 0) {
      highestVersion = version;
    }
  }
  console.info(
    `${label}: Using highest version ${highestVersion.version} for ${versions.map((v) => v.version).join(", ")}`,
  );
  return highestVersion;
};

const compareVersions = (a: string, b: string) => {
  // for example 0.3.9-alpha and 0.3.9 and 1.2.0 and 1.3.5-alpha and 1.3.5-beta2
  const aParts = a.split(".");
  const bParts = b.split(".");
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = i < aParts.length ? aParts[i] : "0";
    const bPart = i < bParts.length ? bParts[i] : "0";
    const aDashInd = aPart.indexOf("-");
    const bDashInd = bPart.indexOf("-");
    const aVersion = aDashInd >= 0 ? aPart.slice(0, aDashInd) : aPart;
    const bVersion = bDashInd >= 0 ? bPart.slice(0, bDashInd) : bPart;
    const aAlpha = aDashInd >= 0 ? aPart.slice(aDashInd + 1) : "";
    const bAlpha = bDashInd >= 0 ? bPart.slice(bDashInd + 1) : "";
    const aVersionNum = parseInt(aVersion);
    const bVersionNum = parseInt(bVersion);
    if (aVersionNum < bVersionNum) return -1;
    if (aVersionNum > bVersionNum) return 1;
    if (aAlpha < bAlpha) return -1;
    if (aAlpha > bAlpha) return 1;
  }
  return 0;
};

export const loadSpecifications = async (
  nwbFile: RemoteH5FileX,
): Promise<NwbFileSpecifications> => {
  const subgroups: SpecificationsSubgroup[] = [];
  const s = await nwbFile.getGroup("/specifications");
  if (!s) throw Error("No specifications group");
  for (const sg of s.subgroups) {
    const A: SpecificationsSubgroup = { name: sg.name, versions: [] };
    const x = await nwbFile.getGroup(`/specifications/${sg.name}`);
    if (!x) throw Error(`No specifications/${sg.name} group`);
    for (const vx of x.subgroups) {
      const B: SpecificationsSubgroupVersion = { version: vx.name, items: [] };
      const y = await nwbFile.getGroup(`/specifications/${sg.name}/${vx.name}`);
      if (!y) throw Error(`No specifications/${sg.name}/${vx.name} group`);
      for (const itemDataset of y.datasets) {
        const data = await nwbFile.getDatasetData(
          `/specifications/${sg.name}/${vx.name}/${itemDataset.name}`,
          {},
        );
        if (!data)
          throw Error(
            `No data for /specifications/${sg.name}/${vx.name}/${itemDataset.name}`,
          );
        if (typeof data === "string") {
          const value = JSON.parse(data);
          B.items.push({ name: itemDataset.name, value });
        } else {
          console.warn(
            `Data for /specifications/${sg.name}/${vx.name}/${itemDataset.name} is not a string`,
          );
        }
      }
      A.versions.push(B);
    }
    subgroups.push(A);
  }
  const subgroupsOnlyHighestVersions: SpecificationsSubgroup[] = [];
  for (const sg of subgroups) {
    const versions = sg.versions;
    if (versions.length > 1) {
      const highestVersion = getHighestVersion(versions, sg.name);
      subgroupsOnlyHighestVersions.push({
        name: sg.name,
        versions: [highestVersion],
      });
    } else {
      subgroupsOnlyHighestVersions.push(sg);
    }
  }
  const allDatasets: SpecificationsDataset[] = [];
  const allGroups: SpecificationsGroup[] = [];
  const allNamespaces: SpecificationsNamespace[] = [];
  for (const sg of subgroupsOnlyHighestVersions) {
    for (const sv of sg.versions) {
      for (const item of sv.items) {
        if (item.value.namespaces) {
          allNamespaces.push(...item.value.namespaces);
        }
        if (item.value.datasets) {
          allDatasets.push(...item.value.datasets);
        }
        if (item.value.groups) {
          allGroups.push(...item.value.groups);
        }
      }
    }
  }
  return {
    subgroups: subgroupsOnlyHighestVersions,
    allNamespaces,
    allDatasets,
    allGroups,
  };
};
