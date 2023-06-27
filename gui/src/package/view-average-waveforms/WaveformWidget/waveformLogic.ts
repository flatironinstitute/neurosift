
export const defaultSpikeToNoiseRatio = 10

// A spike is defined as a signal which exceeds a threshold multiple of the recording background noise.
// (By default the threshold multiple is 10.)
// This function returns a coefficient that normalizes an amplitude reading so that levels of 1 or higher
// indicate a spike.
// export const getSpikeAmplitudeNormalizationFactor = (noiseLevel: number, spikeToNoiseRatio?: number) => {
//     const spikeNoiseRatio = spikeToNoiseRatio || defaultSpikeToNoiseRatio
//     const noise = noiseLevel || 1

//     return (1 / noise) / spikeNoiseRatio
// }

export const getSpikeAmplitudeNormalizationFactor = (peakAmplitude: number) => {
    return 1 / peakAmplitude
}