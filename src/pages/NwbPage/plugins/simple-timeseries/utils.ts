export const formatSamplingFrequency = (freq: number): string => {
  if (freq >= 1000) {
    return `${(freq / 1000).toFixed(2)} kHz`;
  }
  return `${freq.toFixed(2)} Hz`;
};
