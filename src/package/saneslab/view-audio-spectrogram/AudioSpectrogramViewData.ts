import validateObject, { isEqualTo, isNumber } from "../../../types/validateObject"

export type AudioSpectrogramViewData = {
    type: 'saneslab.AudioSpectrogram',
    samplingFrequency: number
    spectrogramData: number[][]
}

export const isAudioSpectrogramViewData = (x: any): x is AudioSpectrogramViewData => {
    return validateObject(x, {
        type: isEqualTo('saneslab.AudioSpectrogram'),
        samplingFrequency: isNumber,
        spectrogramData: () => (true)
    })
}