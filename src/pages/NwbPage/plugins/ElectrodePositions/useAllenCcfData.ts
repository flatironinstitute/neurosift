import { useEffect, useMemo, useState } from "react";

const ATLAS_BASE_URL = "https://atlas.dandiarchive.org/data";

type StructureNode = {
  id: number;
  acronym: string;
  name: string;
  color_hex_triplet: string;
  children: StructureNode[];
};

type RegionInfo = {
  acronym: string;
  name: string;
  color_hex_triplet: string;
};

export type ResolvedRegion = {
  structureId: number;
  acronym: string;
  name: string;
  color: string; // "#rrggbb"
  hasMesh: boolean;
};

// Module-level cache so we only fetch once across all instances
let cachedStructureLookup: Map<string, StructureNode> | null = null;
let cachedRegionColors: Map<number, RegionInfo> | null = null;
let cachedNoMeshSet: Set<number> | null = null;
let cachedDataStructureSet: Set<number> | null = null;
let fetchPromise: Promise<void> | null = null;

function flattenTree(
  node: StructureNode,
  map: Map<string, StructureNode>,
): void {
  map.set(node.name.toLowerCase(), node);
  map.set(node.acronym.toLowerCase(), node);
  for (const child of node.children) {
    flattenTree(child, map);
  }
}

async function ensureDataLoaded(): Promise<void> {
  if (cachedStructureLookup && cachedRegionColors && cachedDataStructureSet)
    return;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const [structureGraph, dandiRegions, meshManifest] = await Promise.all([
        fetch(`${ATLAS_BASE_URL}/structure_graph.json`).then((r) => r.json()),
        fetch(`${ATLAS_BASE_URL}/dandi_regions.json`).then((r) => r.json()),
        fetch(`${ATLAS_BASE_URL}/mesh_manifest.json`).then((r) => r.json()),
      ]);

      const lookup = new Map<string, StructureNode>();
      for (const root of structureGraph as StructureNode[]) {
        flattenTree(root, lookup);
      }
      cachedStructureLookup = lookup;

      const colors = new Map<number, RegionInfo>();
      for (const [idStr, info] of Object.entries(
        dandiRegions as Record<string, RegionInfo>,
      )) {
        colors.set(Number(idStr), info as RegionInfo);
      }
      cachedRegionColors = colors;

      cachedNoMeshSet = new Set(meshManifest.no_mesh);
      cachedDataStructureSet = new Set(meshManifest.data_structures);
    } catch (err) {
      // Reset so future calls can retry
      fetchPromise = null;
      throw err;
    }
  })();

  return fetchPromise;
}

const useAllenCcfData = (locations: string[] | undefined) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let canceled = false;
    ensureDataLoaded()
      .then(() => {
        if (!canceled) setLoaded(true);
      })
      .catch((err) => {
        if (!canceled)
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load Allen CCF data",
          );
      });
    return () => {
      canceled = true;
    };
  }, []);

  const resolvedRegions = useMemo(() => {
    if (
      !loaded ||
      !locations ||
      !cachedStructureLookup ||
      !cachedDataStructureSet ||
      !cachedNoMeshSet
    )
      return undefined;

    const uniqueLocations = [...new Set(locations.filter(Boolean))];
    const regions: ResolvedRegion[] = [];
    const seenIds = new Set<number>();

    for (const loc of uniqueLocations) {
      const node = cachedStructureLookup.get(loc.toLowerCase());
      if (!node || seenIds.has(node.id) || node.id === 997) continue;
      seenIds.add(node.id);

      const regionInfo = cachedRegionColors?.get(node.id);
      const colorHex =
        regionInfo?.color_hex_triplet || node.color_hex_triplet;

      regions.push({
        structureId: node.id,
        acronym: node.acronym,
        name: node.name,
        color: `#${colorHex}`,
        hasMesh:
          cachedDataStructureSet.has(node.id) && !cachedNoMeshSet.has(node.id),
      });
    }

    return regions;
  }, [loaded, locations]);

  return { resolvedRegions, loaded, error };
};

export default useAllenCcfData;
