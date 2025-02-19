import pako from "pako";

export type NeurodataTypesIndex = {
  files: {
    dandiset_id: string;
    dandiset_version: string;
    asset_id: string;
    asset_path: string;
    neurodata_types: string[];
  }[];
};

let cachedNeurodataTypesIndex: NeurodataTypesIndex | undefined = undefined;
export const fetchNeurodataTypesIndex = async () => {
  if (cachedNeurodataTypesIndex) return cachedNeurodataTypesIndex;
  try {
    const url =
      "https://lindi.neurosift.org/dandi/neurodata_types_index.json.gz";
    const response = await fetch(url + "?cb=" + Date.now());
    const bufferGz = await response.arrayBuffer();
    const buffer = pako.inflate(bufferGz);
    const text = new TextDecoder().decode(buffer);
    const json = JSON.parse(text);
    cachedNeurodataTypesIndex = json;
    return cachedNeurodataTypesIndex;
  } catch (err) {
    console.error(err);
    return undefined;
  }
};
