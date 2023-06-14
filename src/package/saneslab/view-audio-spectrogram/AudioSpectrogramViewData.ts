import { isEqualTo, isNumber, validateObject } from "@figurl/core-utils"

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