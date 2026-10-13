const pathParts = (path: string): string[] => path.split("/").filter(Boolean);

// True if the object lives under a processing module named "LFP", e.g.
//   /processing/LFP/ElectricalSeries
//   /processing/ecephys/LFP/ElectricalSeries
export const isUnderLfpModule = (path: string): boolean => {
  const parts = pathParts(path);
  if (parts[0] !== "processing") return false;
  return parts.slice(1).some((p) => p === "LFP");
};

// "LFP" in any case, an uppercase "LF" as in SpikeGLX LF streams
// (ElectricalSeriesLF, ElectricalSeriesLFIMEC0), or a ".lf" suffix in any case
// as in SpikeGLX stream names (imec0.lf). A bare "LF" is case-sensitive so
// words like "half" or "self" don't match.
const nameMentionsLfp = (name: string): boolean => {
  const lower = name.toLowerCase();
  return lower.includes("lfp") || lower.endsWith(".lf") || name.includes("LF");
};

// True if the object's own name, or the name of any group containing it,
// mentions LFP. This catches LFP that was not nested under a processing
// module, e.g. acquired iEEG stored as
//   /acquisition/ElectricalSeriesLFP
//   /acquisition/LFP/ElectricalSeries
export const hasLfpInPathName = (path: string): boolean =>
  pathParts(path).some(nameMentionsLfp);
