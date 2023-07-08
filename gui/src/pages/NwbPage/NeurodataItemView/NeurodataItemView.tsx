import { FunctionComponent } from "react"
import NeurodataLFPItemView from "./NeurodataLFPItemView"
import NeurodataSpatialSeriesItemView from "./NeurodataSpatialSeriesItemView"
import NeurodataTimeIntervalsItemView from "./NeurodataTimeIntervalsItemView"
import NeurodataTimeSeriesItemView from "./NeurodataTimeSeriesItemView"

type Props = {
    width: number
    height: number
    path: string
    neurodataType: string
    condensed?: boolean
}

const NeurodataItemView: FunctionComponent<Props> = ({width, height, path, neurodataType, condensed}) => {
    if (['TimeSeries', 'ElectricalSeries'].includes(neurodataType)) {
        return <NeurodataTimeSeriesItemView width={width} height={height} path={path} condensed={condensed} />
    }
    else if (['SpatialSeries'].includes(neurodataType)) {
        return <NeurodataSpatialSeriesItemView width={width} height={height} path={path} condensed={condensed} />
    }
    else if (['TimeIntervals'].includes(neurodataType)) {
        return <NeurodataTimeIntervalsItemView width={width} height={height} path={path} condensed={condensed} />
    }
    else if (['LFP'].includes(neurodataType)) {
        return <NeurodataLFPItemView width={width} height={height} path={path} condensed={condensed} />
    }
    else {
        return <div>Unsupported neurodata type: {neurodataType}</div>
    }
}

export default NeurodataItemView