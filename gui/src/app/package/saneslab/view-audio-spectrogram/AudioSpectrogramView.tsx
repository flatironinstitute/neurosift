import { FunctionComponent, useMemo } from "react";
import { AudioSpectrogramViewData } from "./AudioSpectrogramViewData";
import SpectrogramWidget from "./SpectrogramWidget";

type Props = {
  data: AudioSpectrogramViewData;
  width: number;
  height: number;
};

const AudioSpectrogramView: FunctionComponent<Props> = ({
  data,
  width,
  height,
}) => {
  const { samplingFrequency, spectrogramData } = data;
  const spectrogram = useMemo(
    () => ({
      samplingFrequency,
      data: spectrogramData,
    }),
    [samplingFrequency, spectrogramData],
  );
  return (
    <SpectrogramWidget
      width={width}
      height={height}
      spectrogram={spectrogram}
    />
  );
};

export default AudioSpectrogramView;
