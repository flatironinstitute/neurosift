/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { getNwbGroup } from "./nwbInterface";
import { generalLabelMap } from "./nwbConfig";
import { NwbFileOverview, GeneralLabelMapItem } from "./types";

type NwbFileOverviewResult = NwbFileOverview | { error: string } | null;

export const useNwbFileOverview = (url: string | null) => {
  const [nwbFileOverview, setNwbFileOverview] =
    useState<NwbFileOverviewResult>(null);
  useEffect(() => {
    if (!url) return;
    setNwbFileOverview(null);
    const load = async () => {
      try {
        const rootGroup = await getNwbGroup(url, "/");
        if (!rootGroup) {
          const isDandiUrl = url.includes("dandi");
          const errorMessage = isDandiUrl
            ? "Unable to load the root group. If this is an embargoed Dandiset, you must enter your DANDI API Key in the settings page."
            : "Unable to load the root group.";
          setNwbFileOverview({ error: errorMessage });
          return;
        }
        const generalGroup = await getNwbGroup(url, "/general");
        const items: {
          name: string;
          path: string;
          renderer?: (val: any) => string;
        }[] = [];
        rootGroup?.datasets.forEach((ds) => {
          const mm = generalLabelMap.find(
            (item: GeneralLabelMapItem) => item.name === ds.name,
          );
          const newName = mm?.newName || ds.name;
          items.push({
            name: newName || ds.name,
            path: ds.path,
            renderer: mm?.renderer,
          });
        });
        generalGroup?.datasets.forEach((ds) => {
          const mm = generalLabelMap.find(
            (item: GeneralLabelMapItem) => item.name === ds.name,
          );
          const newName = mm?.newName || ds.name;
          items.push({
            name: newName || ds.name,
            path: ds.path,
            renderer: mm?.renderer,
          });
        });
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
        const nwbVersion = rootGroup?.attrs["nwb_version"] || "";
        setNwbFileOverview({ items: itemsSorted, nwbVersion });
      } catch {
        setNwbFileOverview({ error: "Failed to load NWB file overview" });
      }
    };
    load();
  }, [url]);
  return nwbFileOverview;
};
