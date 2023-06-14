import { BaseCanvas } from '@figurl/core-views';
import { useMemo } from 'react';
import { TickSet } from './YAxisTicks';
import { TimeTick } from './TimeAxisTicks';
import { TimeScrollViewPanel } from './TimeScrollView';
import { paintAxes } from './TSVPaintAxes';

export type TSVAxesLayerProps<T extends {[key: string]: any}> = {
    panels: TimeScrollViewPanel<T>[]
    timeRange: [number, number]
    timeTicks: TimeTick[]
    yTickSet?: TickSet
    margins: {left: number, right: number, top: number, bottom: number}
    selectedPanelKeys: Set<number | string>
    panelHeight: number
    perPanelOffset: number
    hideTimeAxis?: boolean
    showYMinMaxLabels?: boolean
    gridlineOpts?: {hideX: boolean, hideY: boolean}
    width: number
    height: number
}

const TSVAxesLayer = <T extends {[key: string]: any}>(props: TSVAxesLayerProps<T>) => {
    const {width, height, panels, panelHeight, perPanelOffset, timeRange, timeTicks, yTickSet, margins, selectedPanelKeys, hideTimeAxis, showYMinMaxLabels=false, gridlineOpts} = props
    const drawData = useMemo(() => ({
        width, height, panels, panelHeight, perPanelOffset, timeRange, timeTicks, yTickSet, margins, selectedPanelKeys, hideTimeAxis, showYMinMaxLabels, gridlineOpts
    }), [width, height, panels, panelHeight, perPanelOffset, timeRange, timeTicks, yTickSet, margins, selectedPanelKeys, hideTimeAxis, showYMinMaxLabels, gridlineOpts])

    return (
        <BaseCanvas
            width={width}
            height={height}
            draw={paintAxes}
            drawData={drawData}
        />
    )
}

export default TSVAxesLayer