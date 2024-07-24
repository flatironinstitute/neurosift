import { FunctionComponent, useMemo } from "react";
import { SparseAudioSpectrogramViewData } from "./SparseAudioSpectrogramViewData";
import SparseSpectrogramWidget from "./SparseSpectrogramWidget";

type Props = {
  data: SparseAudioSpectrogramViewData;
  width: number;
  height: number;
};

const SparseAudioSpectrogramView: FunctionComponent<Props> = ({
  data,
  width,
  height,
}) => {
  const {
    samplingFrequency,
    numFrequencies,
    numTimepoints,
    spectrogramValues,
    spectrogramIndicesDelta,
    hideToolbar,
  } = data;
  const sparseSpectrogram: {
    numFrequencies: number;
    numTimepoints: number;
    data: { indices: number[]; values: number[] }[];
    samplingFrequency: number;
  } = useMemo(() => {
    const sparseData: { indices: number[]; values: number[] }[] = [];
    for (let i = 0; i < numTimepoints; i++) {
      sparseData.push({ indices: [], values: [] });
    }
    let aa = 0;
    for (let bb = 0; bb < spectrogramValues.length; bb++) {
      aa += spectrogramIndicesDelta[bb];
      const v = spectrogramValues[bb];
      const i = Math.floor(aa / numFrequencies);
      const j = aa % numFrequencies;
      if (v) {
        sparseData[i].indices.push(j);
        sparseData[i].values.push(v);
      }
    }
    return {
      numFrequencies,
      numTimepoints,
      data: sparseData,
      samplingFrequency,
    };
  }, [
    numFrequencies,
    numTimepoints,
    samplingFrequency,
    spectrogramIndicesDelta,
    spectrogramValues,
  ]);
  return (
    <SparseSpectrogramWidget
      width={width}
      height={height}
      sparseSpectrogram={sparseSpectrogram}
      hideToolbar={hideToolbar}
    />
  );
};

export default SparseAudioSpectrogramView;
