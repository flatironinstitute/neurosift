export interface Skeleton {
  name: string;
  nodes: string[];          // Body part names
  edges: number[][];        // [nodeIdx1, nodeIdx2] pairs
}

export interface PoseData {
  x: number[];
  y: number[];
  confidence: number[];
  timestamps: number[];
}

export interface TimeRange {
  startTime: number;
  endTime: number;
}

export interface SkeletonPlotProps {
  width: number;
  height: number;
  skeleton: Skeleton;
  poseData: Map<string, PoseData>;
  currentTime: number | undefined;
  visibleStartTime: number | undefined;
  visibleEndTime: number | undefined;
  showConfidence: boolean;
  showTrajectories: boolean;
  confidenceThreshold: number;
}
