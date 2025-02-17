import { registerPlugin } from "./registry";
import defaultPlugin from "./default";
import jsonPlugin from "./json";
import textPlugin from "./text";
import edfPlugin from "./edf";
import niftiPlugin from "./nifti";
import tsvPlugin from "./tsv";
import wavPlugin from "./wav";

// Register plugins in order of priority
export const initializePlugins = () => {
  registerPlugin(tsvPlugin); // Register TSV plugin first (priority 200)
  registerPlugin(textPlugin);
  registerPlugin(jsonPlugin);
  registerPlugin(edfPlugin);
  registerPlugin(niftiPlugin);
  registerPlugin(wavPlugin); // Add WAV plugin before default
  registerPlugin(defaultPlugin);
};
