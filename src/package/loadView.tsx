import { isSparseAudioSpectrogramViewData, SparseAudioSpectrogramView } from "./saneslab/view-sparse-audio-spectrogram"
import BoxLayoutView from "./view-box-layout/BoxLayoutView"
import { isBoxLayoutViewData } from "./view-box-layout/BoxLayoutViewData"
import { isRasterPlotView3Data, RasterPlotView3 } from "./spike_sorting/view-raster-plot-3"
import { isTimeseriesGraphViewData, TimeseriesGraphView } from "./view-timeseries-graph"

const loadView = (o: {data: any, width: number, height: number}) => {
    const {data, width, height} = o
    if (isTimeseriesGraphViewData(data)) {
        return <TimeseriesGraphView data={data} width={width} height={height} />
    }
    else if (isRasterPlotView3Data(data)) {
        return <RasterPlotView3 data={data} width={width} height={height} />
    }
    else if (isSparseAudioSpectrogramViewData(data)) {
        return <SparseAudioSpectrogramView data={data} width={width} height={height} />
    }
    else if (isBoxLayoutViewData(data)) {
        return <BoxLayoutView data={data} width={width} height={height} />
    }
    else return undefined
}

export default loadView