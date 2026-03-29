import { useState, useEffect } from "react";
import { getHdf5Group, getHdf5DatasetData } from "@hdf5Interface";
import { Skeleton } from "../SkeletonPlot/types";

export const useSkeletonDefinition = (nwbUrl: string, path: string) => {
  const [skeleton, setSkeleton] = useState<Skeleton | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let canceled = false;
    
    const loadSkeleton = async () => {
      try {
        const poseEstimationGroup = await getHdf5Group(nwbUrl, path);
        if (!poseEstimationGroup || canceled) return;
        
        // Find skeleton reference in attributes
        const skeletonAttr = poseEstimationGroup.attrs?.skeleton;
        
        if (!skeletonAttr) {
          // If no skeleton reference, try to infer from pose estimation series
          const poseSeriesGroups = poseEstimationGroup.subgroups.filter(
            (g: any) => g.attrs?.neurodata_type === "PoseEstimationSeries"
          );
          
          if (poseSeriesGroups.length > 0) {
            // Create a simple skeleton with just nodes (no edges)
            const nodes = poseSeriesGroups.map((g: any) => g.name);
            setSkeleton({
              name: "inferred_skeleton",
              nodes,
              edges: [],
            });
          } else {
            setError("No skeleton reference or pose series found");
          }
          return;
        }
        
        // Handle skeleton reference (could be a link object or path string)
        let skeletonPath: string;
        if (typeof skeletonAttr === "string") {
          skeletonPath = skeletonAttr;
        } else if (skeletonAttr.path) {
          skeletonPath = skeletonAttr.path;
        } else {
          setError("Invalid skeleton reference");
          return;
        }
        
        const skeletonGroup = await getHdf5Group(nwbUrl, skeletonPath);
        if (!skeletonGroup || canceled) return;
        
        // Read nodes (array of strings - body part names)
        const nodesRaw = await getHdf5DatasetData(nwbUrl, `${skeletonPath}/nodes`, {}) || [];
        const nodes = Array.from(nodesRaw as any).map((n: any) => String(n));
        
        // Read edges (array of [nodeIndex1, nodeIndex2] pairs)
        const edgesRaw = await getHdf5DatasetData(nwbUrl, `${skeletonPath}/edges`, {}) || [];
        
        // Convert edges to array of pairs
        const edges: number[][] = [];
        if (edgesRaw && (edgesRaw as any).length > 0) {
          const edgesArray = Array.from(edgesRaw as any);
          for (let i = 0; i < edgesArray.length; i++) {
            const edge = edgesArray[i];
            if (Array.isArray(edge)) {
              edges.push([Number((edge as any)[0]), Number((edge as any)[1])]);
            } else if (i + 1 < edgesArray.length) {
              // Flat array format: [idx1, idx2, idx3, idx4, ...]
              edges.push([Number(edge), Number(edgesArray[i + 1])]);
              i++;
            }
          }
        }
        
        if (canceled) return;
        
        setSkeleton({
          name: skeletonGroup.attrs?.name || "skeleton",
          nodes,
          edges,
        });
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };
    
    loadSkeleton();
    
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path]);
  
  return { skeleton, skeletonError: error };
};
