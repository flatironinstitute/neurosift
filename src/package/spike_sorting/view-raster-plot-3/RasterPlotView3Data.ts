import { isEqualTo, isString, validateObject } from "@figurl/core-utils"

export type RasterPlotView3Data = {
    type: 'neurosift.RasterPlotView'
    spike_trains_uri: string
}

export const isRasterPlotView3Data = (x: any): x is RasterPlotView3Data => {
    return validateObject(x, {
        type: isEqualTo('neurosift.RasterPlotView'),
        spike_trains_uri: isString
    })
}