import { FunctionComponent, useMemo, useState } from "react"
import NwbTimeseriesView from "../TimeseriesItemView/NwbTimeseriesView"
import ElectricalSeriesToolbar, { ElectricalSeriesOpts } from "./ElectricalSeriesToolbar"

type Props = {
    width: number
    height: number
    objectPath: string
}

const ElectricalSeriesWidget: FunctionComponent<Props> = ({width, height, objectPath}) => {
    const bottomToolBarHeight = 30
    const [electricalSeriesOpts, setElectricalSeriesOpts] = useState<ElectricalSeriesOpts>({numVisibleChannels: 5, visibleStartChannel: 0})
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
                    objectPath={objectPath}
                    visibleChannelsRange={visibleChannelsRange}
                />
            </div>
            <div style={{position: 'absolute', width, height: bottomToolBarHeight, top: height - bottomToolBarHeight}}>
                <ElectricalSeriesToolbar
                    width={width}
                    height={bottomToolBarHeight}
                    objectPath={objectPath}
                    electricalSeriesOpts={electricalSeriesOpts}
                    setElectricalSeriesOpts={setElectricalSeriesOpts}
                />
            </div>
        </div>
    )
}

export default ElectricalSeriesWidget