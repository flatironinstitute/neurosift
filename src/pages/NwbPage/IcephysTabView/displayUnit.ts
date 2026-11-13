// Map NWB SI units to a display unit + scale factor. NWB stores values in SI
// after applying `conversion`, but in icephys the conventional units used in
// figures are mV and pA. If the file's unit string is already an offset unit
// (e.g. "millivolts"), we leave the data untouched.
export function pickDisplayUnit(siUnit: string): {
  label: string;
  scale: number;
} {
  const u = siUnit.toLowerCase().trim();
  if (u === "volts" || u === "v") return { label: "mV", scale: 1e3 };
  if (u === "amperes" || u === "ampere" || u === "a")
    return { label: "pA", scale: 1e12 };
  // already-scaled units pass through
  if (u === "millivolts" || u === "mv") return { label: "mV", scale: 1 };
  if (u === "picoamperes" || u === "pa") return { label: "pA", scale: 1 };
  if (u === "nanoamperes" || u === "na") return { label: "nA", scale: 1 };
  // unknown unit: pass through, no scale
  return { label: siUnit || "(arb)", scale: 1 };
}
