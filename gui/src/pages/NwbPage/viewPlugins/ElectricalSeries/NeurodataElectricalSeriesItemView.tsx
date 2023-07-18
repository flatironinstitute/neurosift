import { FunctionComponent, useMemo, useState } from "react"
import NwbTimeseriesView from "../../viewPlugins/TimeSeries/TimeseriesItemView/NwbTimeseriesView"
import ElectricalSeriesToolbar, { ElectricalSeriesOpts } from "./ElectricalSeriesToolbar"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}

const NeurodataElectricalSeriesItemView: FunctionComponent<Props> = ({width, height, path}) => {
    const bottomToolBarHeight = 30
    // important to start with only 1 visible channel --- if we want to default to more, do it in a useEffect after we figure out the number of channels in the dataset
    const [electricalSeriesOpts, setElectricalSeriesOpts] = useState<ElectricalSeriesOpts>({numVisibleChannels: 1, visibleStartChannel: 0, autoChannelSeparation: 2})
    const visibleChannelsRange = useMemo(() => {
        const {numVisibleChannels, visibleStartChannel} = electricalSeriesOpts
        return [visibleStartChannel, visibleStartChannel + numVisibleChannels] as [number, number]
    }, [electricalSeriesOpts])
    return (
        <div style={{position: 'absolute', width, height, overflow: 'hidden'}}>
            <div style={{position: 'absolute', width, height: height - bottomToolBarHeight}}>
                <NwbTimeseriesView
                    width={width}
                    height={height - bottomToolBarHeight}
                    objectPath={path}
                    visibleChannelsRange={visibleChannelsRange}
                    autoChannelSeparation={electricalSeriesOpts.autoChannelSeparation}
                />
            </div>
            <div style={{position: 'absolute', width, height: bottomToolBarHeight, top: height - bottomToolBarHeight}}>
                <ElectricalSeriesToolbar
                    width={width}
                    height={bottomToolBarHeight}
                    objectPath={path}
                    electricalSeriesOpts={electricalSeriesOpts}
                    setElectricalSeriesOpts={setElectricalSeriesOpts}
                />
            </div>
        </div>
    )
}

export default NeurodataElectricalSeriesItemView