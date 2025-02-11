# TimeseriesPlot TimeScrollView2 Implementation Plan

## Overview
Replace Plotly-based visualization with TimeScrollView2 in SimpleTimeseriesView while maintaining the same plotting behavior.

## Components to Create/Modify

### 1. TimeseriesPlotTSV2.tsx
- Props interface matching TimeseriesPlot:
  ```typescript
  type Props = {
    timestamps: number[]
    data: number[][]
    visibleStartTime: number
    visibleEndTime: number
    channelNames?: string[]
    channelSeparation: number
    width: number
    height: number
  }
  ```
- Key Features:
  - Uses TimeScrollView2 for visualization
  - Sets up worker communication
  - Handles canvas setup and data updates
  - Manages visible time range
  - Supports channel separation

### 2. timeseriesPlotTSV2Worker.ts
- Responsibilities:
  - Receives offscreen canvas
  - Handles opts updates (dimensions, margins, time range)
  - Processes and renders timeseries data
  - Implements efficient drawing algorithm
  - Supports channel separation visualization

### 3. SimpleTimeseriesView.tsx Changes
- Add usePlotly flag (initially false)
- Conditional rendering:
  ```typescript
  {timeseriesClient.isLabeledEvents() ? (
    <LabeledEventsPlot ... />
  ) : usePlotly ? (
    <TimeseriesPlot ... />
  ) : (
    <TimeseriesPlotTSV2 ... />
  )}
  ```

## Implementation Steps

1. Create TimeseriesPlotTSV2.tsx:
   - Use TimeScrollView2 component
   - Set up canvas and worker initialization
   - Handle prop updates and data changes
   - Implement channel separation logic

2. Create timeseriesPlotTSV2Worker.ts:
   - Handle canvas setup messages
   - Process opts updates
   - Implement drawing logic:
     - Clear canvas
     - Draw time series lines
     - Apply channel separation
     - Handle visible range updates

3. Update SimpleTimeseriesView.tsx:
   - Add usePlotly flag
   - Add conditional rendering
   - Ensure props are passed correctly

## Testing Plan

1. Visual Verification:
   - Compare rendering with Plotly version
   - Verify channel separation works
   - Check time range navigation
   - Validate multi-channel display

2. Performance Testing:
   - Compare rendering speed
   - Check memory usage
   - Verify worker communication

## Notes

- Worker-based rendering should improve performance
- TimeScrollView2 provides built-in time navigation
- Channel separation needs custom implementation in worker
- Maintain same visual style as Plotly version