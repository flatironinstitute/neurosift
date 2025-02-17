import React, { FunctionComponent, useEffect, useState } from "react";
import { DatasetPluginProps } from "../pluginInterface";
import {
  useTimeRange,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import TimeScrollView2, {
  useTimeScrollView2,
} from "@shared/component-time-scroll-view-2/TimeScrollView2";
import AudioPlayer from "./AudioPlayer";
import WaveformCanvas from "./WaveformCanvas";

type WaveformData = {
  data: Float32Array;
  sampleRate: number;
  duration: number;
  channels: number;
  minValue: number;
  maxValue: number;
};

const WavFileView: FunctionComponent<DatasetPluginProps> = ({
  file,
  width = 800,
  height = 600,
}) => {
  const [waveformData, setWaveformData] = useState<WaveformData | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const { setVisibleTimeRange } = useTimeRange();
  const { setCurrentTime } = useTimeseriesSelection();
  const [audioContext] = useState(() => new AudioContext());

  useEffect(() => {
    const loadWaveform = async () => {
      try {
        setIsLoading(true);
        setError(undefined);

        const response = await fetch(file.urls[0]);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get the first channel's data
        const channelData = audioBuffer.getChannelData(0);

        // Calculate min and max values
        let minVal = channelData[0];
        let maxVal = channelData[0];
        for (let i = 1; i < channelData.length; i++) {
          if (channelData[i] < minVal) minVal = channelData[i];
          if (channelData[i] > maxVal) maxVal = channelData[i];
        }

        setWaveformData({
          data: channelData,
          sampleRate: audioBuffer.sampleRate,
          duration: audioBuffer.duration,
          channels: audioBuffer.numberOfChannels,
          minValue: minVal,
          maxValue: maxVal,
        });

        // Set initial visible range to full duration
        setVisibleTimeRange(0, audioBuffer.duration);
        setCurrentTime(0);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error loading audio file",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadWaveform();

    return () => {
      // Cleanup when component unmounts
      if (audioContext.state !== "closed") {
        audioContext.close();
      }
    };
  }, [file.urls, audioContext, setVisibleTimeRange, setCurrentTime]);

  const hideToolbar = true;
  const leftMargin = 100;

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView2({
    width,
    height: height - 50,
    hideToolbar,
    leftMargin,
  });

  const {
    initializeTimeseriesSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();
  useEffect(() => {
    initializeTimeseriesSelection({
      startTimeSec: 0,
      endTimeSec: waveformData?.duration || 1,
      initialVisibleStartTimeSec: 0,
      initialVisibleEndTimeSec: waveformData?.duration || 1,
    });
  }, [waveformData, initializeTimeseriesSelection]);

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    if (!context || !waveformData) return;
    // Clear canvas
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    // Render waveform
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
      return;
    WaveformCanvas({
      context,
      waveformData,
      width: canvasWidth,
      height: canvasHeight,
      margins,
      visibleStartTimeSec,
      visibleEndTimeSec,
    });
  }, [
    context,
    waveformData,
    canvasWidth,
    canvasHeight,
    margins,
    visibleStartTimeSec,
    visibleEndTimeSec,
  ]);

  if (isLoading) {
    return <div>Loading audio file...</div>;
  }

  if (error || !waveformData) {
    return <div>Error: {error || "Failed to load audio file"}</div>;
  }

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column" }}>
      <AudioPlayer
        audioUrl={file.urls[0]}
        duration={waveformData.duration}
        height={50}
      />
      <div style={{ flex: 1 }}>
        <TimeScrollView2
          width={width}
          height={height - 50}
          onCanvasElement={(canvas) => {
            if (!canvas) return;
            const context = canvas.getContext("2d");
            setContext(context);
          }}
          hideToolbar={hideToolbar}
          leftMargin={leftMargin}
          yAxisInfo={{
            showTicks: true,
            yMin: waveformData.minValue,
            yMax: waveformData.maxValue,
            yLabel: "Amplitude",
          }}
        />
      </div>
    </div>
  );
};

export default WavFileView;
