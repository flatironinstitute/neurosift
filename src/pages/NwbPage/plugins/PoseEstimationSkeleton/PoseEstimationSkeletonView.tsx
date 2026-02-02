import { FunctionComponent, useState, useEffect } from "react";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import TimeseriesSelectionBarWithControls from "@shared/TimeseriesSelectionBar/TimeseriesSelectionBarWithControls";
import { usePoseData } from "./hooks/usePoseData";
import { useSkeletonDefinition } from "./hooks/useSkeletonDefinition";
import SkeletonPlot from "./SkeletonPlot/SkeletonPlot";

type Props = {
  nwbUrl: string;
  path: string;
  width?: number;
  height?: number;
  condensed?: boolean;
};

const timeSelectionBarHeight = 24;

const PoseEstimationSkeletonView: FunctionComponent<Props> = ({
  nwbUrl,
  path,
  width = 800,
  height = 600,
}) => {
  const [showConfidence, setShowConfidence] = useState(true);
  const [showTrajectories, setShowTrajectories] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.0);
  
  const { currentTime, visibleStartTimeSec, visibleEndTimeSec, initializeTimeseriesSelection } 
    = useTimeseriesSelection();
  
  // Load skeleton structure (nodes and edges)
  const { skeleton, skeletonError } = useSkeletonDefinition(nwbUrl, path);
  
  // Load pose data for all body parts
  const { 
    poseData,      // Map<bodyPartName, { x, y, confidence, timestamps }>
    timeRange,     // { startTime, endTime }
    isLoading, 
    error 
  } = usePoseData(nwbUrl, path, skeleton);
  
  // Initialize time selection context
  useEffect(() => {
    if (!timeRange) return;
    initializeTimeseriesSelection({
      startTimeSec: timeRange.startTime,
      endTimeSec: timeRange.endTime,
      initialVisibleStartTimeSec: timeRange.startTime,
      initialVisibleEndTimeSec: Math.min(
        timeRange.startTime + 10, // Show first 10 seconds
        timeRange.endTime
      ),
    });
  }, [timeRange, initializeTimeseriesSelection]);
  
  const plotHeight = height - timeSelectionBarHeight;
  
  if (error || skeletonError) {
    return <div style={{ color: "red" }}>Error: {error || skeletonError}</div>;
  }
  
  if (!skeleton || !poseData) {
    return <div>Loading pose estimation data...</div>;
  }
  
  return (
    <div style={{ position: "relative", width, height }}>
      {/* Time Selection Bar */}
      <div style={{ position: "absolute", width, height: timeSelectionBarHeight }}>
        <TimeseriesSelectionBarWithControls
          width={width}
          height={timeSelectionBarHeight}
        />
      </div>
      
      {/* Controls */}
      <div style={{ 
        position: "absolute", 
        top: timeSelectionBarHeight + 5, 
        right: 10,
        zIndex: 100,
        display: "flex",
        gap: "8px",
        flexDirection: "column",
        alignItems: "flex-end",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: "8px",
        borderRadius: "4px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showConfidence}
            onChange={(e) => setShowConfidence(e.target.checked)}
          />
          <span style={{ fontSize: "12px" }}>Show Confidence</span>
        </label>
        
        <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showTrajectories}
            onChange={(e) => setShowTrajectories(e.target.checked)}
          />
          <span style={{ fontSize: "12px" }}>Show Trajectories</span>
        </label>
        
        {showConfidence && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "180px" }}>
            <label style={{ fontSize: "12px" }}>
              Threshold: {confidenceThreshold.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </div>
      
      {/* Main Plot Area */}
      <div style={{
        position: "absolute",
        top: timeSelectionBarHeight,
        width,
        height: plotHeight,
      }}>
        <SkeletonPlot
          width={width}
          height={plotHeight}
          skeleton={skeleton}
          poseData={poseData}
          currentTime={currentTime}
          visibleStartTime={visibleStartTimeSec}
          visibleEndTime={visibleEndTimeSec}
          showConfidence={showConfidence}
          showTrajectories={showTrajectories}
          confidenceThreshold={confidenceThreshold}
        />
      </div>
      
      {isLoading && (
        <div style={{
          position: "absolute",
          top: timeSelectionBarHeight + 20,
          left: 60,
          userSelect: "none",
        }}>
          <div style={{ fontSize: 20, color: "gray" }}>Loading...</div>
        </div>
      )}
    </div>
  );
};

export default PoseEstimationSkeletonView;
