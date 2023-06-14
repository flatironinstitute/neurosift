import { isEqualTo, isNumber, validateObject, optional, isBoolean } from "@figurl/core-utils"

export type SparseAudioSpectrogramViewData = {
    type: 'saneslab.AudioSpectrogram',
    numFrequencies: number,
    numTimepoints: number,
    samplingFrequency: number,
    spectrogramValues: number[],
    spectrogramIndicesDelta: number[],
    hideToolbar?: boolean
}

export const isSparseAudioSpectrogramViewData = (x: any): x is SparseAudioSpectrogramViewData => {
    return validateObject(x, {
        type: isEqualTo('saneslab.SparseAudioSpectrogram'),
        numFrequencies: isNumber,
        numTimepoints: isNumber,
        samplingFrequency: isNumber,
        spectrogramValues: () => (true),
        spectrogramIndicesDelta: () => (true),
        hideToolbar: optional(isBoolean)
    })
}