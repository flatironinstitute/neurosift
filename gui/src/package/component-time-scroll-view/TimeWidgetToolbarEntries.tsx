import { PanDirection, ZoomDirection } from '../context-timeseries-selection'
import { ToolbarItem } from '../ViewToolbar'
import { FaArrowLeft, FaArrowRight, FaSearchMinus, FaSearchPlus } from 'react-icons/fa'

interface TimeWidgetToolbarProps {
    zoomTimeseriesSelection: (direction: ZoomDirection, factor?: number) => void
    panTimeseriesSelection: (direction: PanDirection, pct?: number) => void
}

export const DefaultToolbarWidth = 36


const TimeWidgetToolbarEntries = (props: TimeWidgetToolbarProps): ToolbarItem[] => {
    const { zoomTimeseriesSelection, panTimeseriesSelection } = props

    const handleZoomTimeIn = () => zoomTimeseriesSelection('in')

    const handleZoomTimeOut = () => zoomTimeseriesSelection('out')

    const handleShiftTimeLeft = () => panTimeseriesSelection('back')

    const handleShiftTimeRight = () => panTimeseriesSelection('forward')

    return [
        {
            type: 'button',
            title: "Time zoom in (+)",
            callback: handleZoomTimeIn,
            icon: <FaSearchPlus />,
            keyCode: 173
        },
        {
            type: 'button',
            title: "Time zoom out (-)",
            callback: handleZoomTimeOut,
            icon: <FaSearchMinus />,
            keyCode: 61
        },
        {
            type: 'button',
            title: "Shift time window back [left arrow]",
            callback: handleShiftTimeLeft,
            icon: <FaArrowLeft />,
            keyCode: 37
        },
        {
            type: 'button',
            title: "Shift time window forward [right arrow]",
            callback: handleShiftTimeRight,
            icon: <FaArrowRight />,
            keyCode: 39
        }
    ]
}

export default TimeWidgetToolbarEntries