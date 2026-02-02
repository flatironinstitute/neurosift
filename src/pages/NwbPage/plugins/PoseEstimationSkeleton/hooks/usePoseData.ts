import { useState, useEffect } from "react";
import { getHdf5Group, getHdf5DatasetData } from "@hdf5Interface";
import { Skeleton, PoseData, TimeRange } from "../SkeletonPlot/types";

export const usePoseData = (
  nwbUrl: string,
  path: string,
  skeleton: Skeleton | undefined
) => {
  const [poseData, setPoseData] = useState<Map<string, PoseData> | undefined>();
  const [timeRange, setTimeRange] = useState<TimeRange | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!skeleton) return;
    
    let canceled = false;
    setIsLoading(true);
    
    const loadPoseData = async () => {
      try {
        const group = await getHdf5Group(nwbUrl, path);
        if (!group || canceled) return;
        
        const poseSeriesGroups = group.subgroups.filter(
          (g: any) => g.attrs?.neurodata_type === "PoseEstimationSeries"
        );
        
        const dataMap = new Map<string, PoseData>();
        let globalStartTime = Infinity;
        let globalEndTime = -Infinity;
        
        for (const bodyPartName of skeleton.nodes) {
          // Find matching PoseEstimationSeries
          const seriesGroup = poseSeriesGroups.find(
            (g: any) => g.name === bodyPartName
          );
          
          if (!seriesGroup) {
            console.warn(`No PoseEstimationSeries found for body part: ${bodyPartName}`);
            continue;
          }
          
          const seriesPath = `${path}/${bodyPartName}`;
          
          // Load data, timestamps, and confidence
          const data = await getHdf5DatasetData(nwbUrl, `${seriesPath}/data`, {});
          const timestamps = await getHdf5DatasetData(nwbUrl, `${seriesPath}/timestamps`, {});
          
          if (!data || !timestamps || canceled) continue;
          
          // Try to load confidence, if it doesn't exist, default to 1.0
          let confidence;
          try {
            confidence = await getHdf5DatasetData(nwbUrl, `${seriesPath}/confidence`, {});
          } catch {
            confidence = new Array(timestamps.length).fill(1.0);
          }
          
          if (!confidence) {
            confidence = new Array(timestamps.length).fill(1.0);
          }
          
          // Extract x and y coordinates
          const x: number[] = [];
          const y: number[] = [];
          
          // Convert data to array if needed
          const dataArray = Array.isArray(data) ? data : Array.from(data as any);
          
          for (let i = 0; i < dataArray.length; i++) {
            if (Array.isArray(dataArray[i])) {
              x.push(Number(dataArray[i][0]));
              y.push(Number(dataArray[i][1]));
            } else {
              // Handle flat array format
              x.push(Number(dataArray[i * 2]) || 0);
              y.push(Number(dataArray[i * 2 + 1]) || 0);
            }
          }
          
          dataMap.set(bodyPartName, {
            x,
            y,
            confidence: Array.from(confidence),
            timestamps: Array.from(timestamps),
          });
          
          // Update global time range
          if (timestamps.length > 0) {
            globalStartTime = Math.min(globalStartTime, timestamps[0]);
            globalEndTime = Math.max(globalEndTime, timestamps[timestamps.length - 1]);
          }
        }
        
        if (canceled) return;
        
        setPoseData(dataMap);
        setTimeRange({
          startTime: globalStartTime,
          endTime: globalEndTime,
        });
        setIsLoading(false);
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    };
    
    loadPoseData();
    
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path, skeleton]);
  
  return { poseData, timeRange, isLoading, error };
};
