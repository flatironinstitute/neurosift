import { FunctionComponent, useMemo } from "react";
import Plot from "react-plotly.js";
import { Layout, PlotData } from "plotly.js";
import { SkeletonPlotProps } from "./types";
import { findClosestFrameIndex } from "../utils/confidenceUtils";

const SkeletonPlot: FunctionComponent<SkeletonPlotProps> = ({
  width,
  height,
  skeleton,
  poseData,
  currentTime,
  visibleStartTime,
  visibleEndTime,
  showConfidence,
  showTrajectories,
  confidenceThreshold,
}) => {
  
  // Find frame index for current time
  const currentFrameIndex = useMemo(() => {
    if (currentTime === undefined) return -1;
    
    // Use first body part's timestamps as reference
    const firstBodyPart = skeleton.nodes[0];
    const firstData = poseData.get(firstBodyPart);
    if (!firstData) return -1;
    
    return findClosestFrameIndex(firstData.timestamps, currentTime);
  }, [currentTime, skeleton, poseData]);
  
  // Extract keypoint positions for current frame
  const currentKeypoints = useMemo(() => {
    if (currentFrameIndex < 0) return null;
    
    const keypoints = new Map<string, { x: number; y: number; confidence: number }>();
    
    skeleton.nodes.forEach(bodyPartName => {
      const data = poseData.get(bodyPartName);
      if (!data || currentFrameIndex >= data.x.length) return;
      
      const x = data.x[currentFrameIndex];
      const y = data.y[currentFrameIndex];
      const confidence = data.confidence[currentFrameIndex];
      
      keypoints.set(bodyPartName, { x, y, confidence });
    });
    
    return keypoints;
  }, [currentFrameIndex, skeleton, poseData]);
  
  // Calculate spatial bounds across all data
  const bounds = useMemo(() => {
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    
    poseData.forEach(data => {
      data.x.forEach(x => {
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
      });
      data.y.forEach(y => {
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
      });
    });
    
    // Add 10% padding
    const xPadding = (xMax - xMin) * 0.1 || 10;
    const yPadding = (yMax - yMin) * 0.1 || 10;
    
    return {
      xMin: xMin - xPadding,
      xMax: xMax + xPadding,
      yMin: yMin - yPadding,
      yMax: yMax + yPadding,
    };
  }, [poseData]);
  
  // Generate Plotly traces
  const traces: Partial<PlotData>[] = useMemo(() => {
    const traces: Partial<PlotData>[] = [];
    
    if (!currentKeypoints) return traces;
    
    // 1. Draw skeleton edges (bones)
    skeleton.edges.forEach(([idx1, idx2], edgeIdx) => {
      const bodyPart1 = skeleton.nodes[idx1];
      const bodyPart2 = skeleton.nodes[idx2];
      
      const kp1 = currentKeypoints.get(bodyPart1);
      const kp2 = currentKeypoints.get(bodyPart2);
      
      if (!kp1 || !kp2) return;
      
      // Filter by confidence threshold
      if (showConfidence) {
        if (kp1.confidence < confidenceThreshold || kp2.confidence < confidenceThreshold) {
          return;
        }
      }
      
      // Edge opacity based on average confidence
      const avgConfidence = (kp1.confidence + kp2.confidence) / 2;
      const opacity = showConfidence ? avgConfidence : 1.0;
      
      traces.push({
        type: "scatter",
        mode: "lines",
        x: [kp1.x, kp2.x],
        y: [kp1.y, kp2.y],
        line: {
          color: `rgba(46, 139, 87, ${opacity})`,  // SeaGreen with confidence opacity
          width: 3,
        },
        showlegend: false,
        hoverinfo: "skip",
        name: `edge_${edgeIdx}`,
      });
    });
    
    // 2. Draw keypoints (joints)
    const keypointX: number[] = [];
    const keypointY: number[] = [];
    const keypointColors: number[] = [];
    const keypointText: string[] = [];
    const keypointSizes: number[] = [];
    
    skeleton.nodes.forEach(bodyPartName => {
      const kp = currentKeypoints.get(bodyPartName);
      if (!kp) return;
      
      // Filter by confidence threshold
      if (showConfidence && kp.confidence < confidenceThreshold) {
        return;
      }
      
      keypointX.push(kp.x);
      keypointY.push(kp.y);
      keypointColors.push(kp.confidence);
      keypointText.push(
        `${bodyPartName}<br>` +
        `x: ${kp.x.toFixed(2)}<br>` +
        `y: ${kp.y.toFixed(2)}<br>` +
        `confidence: ${kp.confidence.toFixed(3)}`
      );
      keypointSizes.push(showConfidence ? 8 + kp.confidence * 4 : 10);
    });
    
    if (keypointX.length > 0) {
      traces.push({
        type: "scatter",
        mode: "markers",
        x: keypointX,
        y: keypointY,
        marker: {
          size: keypointSizes,
          color: showConfidence ? keypointColors : "#FF6B35",
          colorscale: showConfidence ? "RdYlGn" : undefined,  // Red (low) to Green (high)
          cmin: 0,
          cmax: 1,
          showscale: showConfidence,
          colorbar: showConfidence ? {
            title: "Confidence",
            x: 1.02,
            len: 0.7,
          } : undefined,
          line: {
            color: "white",
            width: 1,
          },
        },
        text: keypointText,
        hoverinfo: "text",
        showlegend: false,
        name: "keypoints",
      });
    }
    
    // 3. Draw trajectories (if enabled)
    if (showTrajectories && visibleStartTime !== undefined && visibleEndTime !== undefined) {
      skeleton.nodes.forEach(bodyPartName => {
        const data = poseData.get(bodyPartName);
        if (!data) return;
        
        // Filter to visible time range
        const visibleIndices = data.timestamps
          .map((t, idx) => (t >= visibleStartTime && t <= visibleEndTime) ? idx : -1)
          .filter(idx => idx >= 0);
        
        if (visibleIndices.length === 0) return;
        
        const trajX = visibleIndices.map(idx => data.x[idx]);
        const trajY = visibleIndices.map(idx => data.y[idx]);
        
        traces.push({
          type: "scatter",
          mode: "lines",
          x: trajX,
          y: trajY,
          line: {
            color: "rgba(100, 100, 100, 0.3)",
            width: 1,
          },
          showlegend: false,
          hoverinfo: "skip",
          name: `trajectory_${bodyPartName}`,
        });
      });
    }
    
    return traces;
  }, [
    skeleton,
    currentKeypoints,
    showConfidence,
    showTrajectories,
    confidenceThreshold,
    visibleStartTime,
    visibleEndTime,
    poseData,
  ]);
  
  const layout: Partial<Layout> = useMemo(
    () => ({
      width,
      height,
      margin: {
        l: 60,
        r: showConfidence ? 100 : 60,  // Extra space for colorbar
        t: 20,
        b: 60,
        pad: 0,
      },
      showlegend: false,
      xaxis: {
        title: "X (pixels)",
        range: [bounds.xMin, bounds.xMax],
        showgrid: true,
        zeroline: false,
      },
      yaxis: {
        title: "Y (pixels)",
        range: [bounds.yMax, bounds.yMin],  // Flip Y axis (image coordinates)
        scaleanchor: "x",
        scaleratio: 1,
        showgrid: true,
        zeroline: false,
      },
      hovermode: "closest",
      plot_bgcolor: "#f8f9fa",
      paper_bgcolor: "#ffffff",
    }),
    [bounds, width, height, showConfidence],
  );
  
  if (!currentKeypoints) {
    return (
      <div style={{ 
        width, 
        height, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: "#f8f9fa"
      }}>
        <div style={{ color: "#6c757d" }}>
          Select a time point to view skeleton
        </div>
      </div>
    );
  }
  
  return (
    <Plot
      data={traces}
      layout={layout}
      config={{
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["lasso2d", "select2d"],
        responsive: true,
      }}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
};

export default SkeletonPlot;
