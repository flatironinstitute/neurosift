/* eslint-disable @typescript-eslint/no-explicit-any */
import { GeneralLabelMapItem } from "./types";

export const generalLabelMap: GeneralLabelMapItem[] = [
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
