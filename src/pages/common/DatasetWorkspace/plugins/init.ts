import { registerPlugin } from "./registry";
import defaultPlugin from "./default";
import jsonPlugin from "./json";
import textPlugin from "./text";
import edfPlugin from "./edf";
import niftiPlugin from "./nifti";
import tsvPlugin from "./tsv";
import wavPlugin from "./wav";
import snirfPlugin from "./snirf";

// Register plugins in order of priority
export const initializePlugins = () => {
  registerPlugin(tsvPlugin); // Register TSV plugin first (priority 200)
  registerPlugin(textPlugin);
  registerPlugin(jsonPlugin);
  registerPlugin(edfPlugin);
  registerPlugin(niftiPlugin);
  registerPlugin(wavPlugin);

  // https://neurosift.app/openneuro-dataset/ds005927?tab=sub-001/sub-001_task-breathhold_nirs.snirf|0eb79a7df397c7d5229dc3cb59cdeb791a4b23e3
  registerPlugin(snirfPlugin);

  registerPlugin(defaultPlugin);
};
