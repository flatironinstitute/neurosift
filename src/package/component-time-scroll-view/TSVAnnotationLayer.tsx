import { Annotation } from '../context-annotations';
import { BaseCanvas } from '@figurl/core-views';
import { useCallback } from 'react';

type PixelTimepointAnnotation = {
    annotation: Annotation
    pixelTime: number
}

type PixelTimeIntervalAnnotation = {
    annotation: Annotation
    pixelTimeInterval: [number, number]
}

export type TSVAnnotationLayerProps = {
    timeRange: [number, number]
    margins: {left: number, right: number, top: number, bottom: number}
    pixelTimepointAnnotations: PixelTimepointAnnotation[]
    pixelTimeIntervalAnnotations: PixelTimeIntervalAnnotation[]
    width: number
    height: number
}

const emptyDrawData = {}

const TSVAnnotationLayer = (props: TSVAnnotationLayerProps) => {
    const {width, height, margins, pixelTimepointAnnotations, pixelTimeIntervalAnnotations} = props
    const paint = useCallback((context: CanvasRenderingContext2D) => {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height)

        for (let x of pixelTimeIntervalAnnotations) {
            const aa = x.annotation
            if (aa.type !== 'time-interval') throw Error('Unexpected')
            // at some point, we may want to do something with the annotation label
            const interval = x.pixelTimeInterval
            const t1 = interval[0]
            const t2 = interval[1]
            context.fillStyle = aa.fillColor || 'rgb(245, 240, 200)'
            context.strokeStyle = aa.strokeColor || 'rgb(200, 200, 160)'
            context.lineWidth = 2
            context.fillRect(t1, margins.top, t2 - t1, context.canvas.height - margins.bottom - margins.top)
            context.strokeRect(t1, margins.top, t2 - t1, context.canvas.height - margins.bottom - margins.top)
        }

        for (let x of pixelTimepointAnnotations) {
            const aa = x.annotation
            if (aa.type !== 'timepoint') throw Error('Unexpected')
            // at some point, we may want to do something with the annotation label
            const t = x.pixelTime
            context.strokeStyle = aa.color || 'rgb(200, 250, 0)'
            context.lineWidth = 3.5
            context.beginPath()
            context.moveTo(t, margins.top)
            context.lineTo(t, context.canvas.height - margins.bottom)
            context.stroke()
        }
    }, [margins, pixelTimepointAnnotations, pixelTimeIntervalAnnotations])

    return (
        <BaseCanvas
            width={width}
            height={height}
            draw={paint}
            drawData={emptyDrawData}
        />
    )
}

export default TSVAnnotationLayer