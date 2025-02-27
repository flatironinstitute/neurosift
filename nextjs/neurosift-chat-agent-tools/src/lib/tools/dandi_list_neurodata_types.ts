import { fetchNeurodataTypesIndex } from "./fetchNeurodataTypes";

export async function listNeurodataTypes(): Promise<string[]> {
  const data = await fetchNeurodataTypesIndex();
  if (!data) {
    throw new Error("Failed to fetch neurodata types index");
  }

  // Extract unique neurodata types
  const types = new Set<string>();
  data.files.forEach((file) => {
    file.neurodata_types.forEach((type) => types.add(type));
  });

  return Array.from(types).sort();
}
