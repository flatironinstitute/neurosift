import { useEffect, useState, useCallback } from "react";
import {
  fetchNeurodataTypesIndex,
  NeurodataTypesIndex,
} from "../fetchNeurodataTypesIndex";

export const useNeurodataTypesIndex = (enabled: boolean) => {
  const [index, setIndex] = useState<NeurodataTypesIndex | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [uniqueTypes, setUniqueTypes] = useState<string[]>([]);

  const loadIndex = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(undefined);
    try {
      const data = await fetchNeurodataTypesIndex();
      if (!data) {
        throw new Error("Failed to fetch neurodata types index");
      }
      setIndex(data);

      // Extract unique neurodata types
      const types = new Set<string>();
      data.files.forEach((file) => {
        file.neurodata_types.forEach((type) => types.add(type));
      });
      setUniqueTypes(Array.from(types).sort());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIndex(undefined);
      setUniqueTypes([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      loadIndex();
    } else {
      // Clear data when disabled to save memory
      setIndex(undefined);
      setUniqueTypes([]);
    }
  }, [enabled, loadIndex]);

  return {
    index,
    uniqueTypes,
    loading,
    error,
    reload: loadIndex,
  };
};
