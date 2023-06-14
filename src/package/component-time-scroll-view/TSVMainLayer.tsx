import { BaseCanvas } from '@figurl/core-views';
import { useMemo } from 'react';
import { TimeScrollViewPanel } from './TimeScrollView';

export type MainLayerProps<T extends {[key: string]: any}> = {
    panels: TimeScrollViewPanel<T>[]
    margins: {left: number, right: number, top: number, bottom: number}
    panelHeight: number
    perPanelOffset: number
    width: number
    height: number
}

const paintPanels = <T extends {[key: string]: any}>(context: CanvasRenderingContext2D, props: MainLayerProps<T>) => {
    const {margins, panels, perPanelOffset } = props
    context.resetTransform()
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)
    context.translate(margins.left, margins.top)
    for (let i = 0; i < panels.length; i++) {
        const p = panels[i]
        p.paint(context, p.props)
        context.translate(0, perPanelOffset)
    }
}


const TSVMainLayer = <T extends {[key: string]: any}>(props: MainLayerProps<T>) => {
    const {width, height, panels, panelHeight, perPanelOffset, margins} = props
    const drawData = useMemo(() => ({
        width, height, panels, panelHeight, perPanelOffset, margins,
    }), [width, height, panels, panelHeight, perPanelOffset, margins])

    return (
        <BaseCanvas
            width={width}
            height={height}
            draw={paintPanels}
            drawData={drawData}
        />
    )
}

export default TSVMainLayer