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
    // Built from the DANDI index by
    // python/dandi-index/scripts/create_neurodata_types_index.py and served
    // by the DANDI-index job runner.
    const url =
      "https://dandi-index.catalystneuro.com/api/neurodata-types-index";
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
