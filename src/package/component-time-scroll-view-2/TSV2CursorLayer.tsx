import { BaseCanvas } from '@figurl/core-views';
import React, { useMemo } from 'react';

export type TSVCursorLayerProps = {
    timeRange: [number, number]
    currentTimePixels?: number
    currentTimeIntervalPixels?: [number, number]
    margins: {left: number, right: number, top: number, bottom: number}
    width: number
    height: number
}

const paintCursor = (context: CanvasRenderingContext2D, props: TSVCursorLayerProps) => {
    const {margins, currentTimePixels, currentTimeIntervalPixels } = props
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)

    // current time interval
    if (currentTimeIntervalPixels !== undefined) {
        context.fillStyle = 'rgba(255, 225, 225, 0.4)'
        context.strokeStyle = 'rgba(150, 50, 50, 0.9)'
        const x = currentTimeIntervalPixels[0]
        const y = margins.top
        const w = currentTimeIntervalPixels[1] - currentTimeIntervalPixels[0]
        const h = context.canvas.height - margins.bottom - margins.top
        context.fillRect(x, y, w, h)
        context.strokeRect(x, y, w, h)
    }

    // current time
    if ((currentTimePixels !== undefined) && (currentTimeIntervalPixels === undefined)) {
        context.strokeStyle = 'red'
        context.beginPath()
        context.moveTo(currentTimePixels, margins.top)
        context.lineTo(currentTimePixels, context.canvas.height - margins.bottom)
        context.stroke()
    }
}

const TSV2CursorLayer = (props: TSVCursorLayerProps) => {
    const {width, height, timeRange, currentTimePixels, currentTimeIntervalPixels, margins } = props
    const drawData = useMemo(() => ({
        width, height, timeRange, currentTimePixels, currentTimeIntervalPixels, margins
    }), [width, height, timeRange, currentTimePixels, currentTimeIntervalPixels, margins])

    return (
        <BaseCanvas
            width={width}
            height={height}
            draw={paintCursor}
            drawData={drawData}
        />
    )
}

export default TSV2CursorLayer