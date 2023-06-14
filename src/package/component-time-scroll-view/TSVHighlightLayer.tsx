import { BaseCanvas } from '@figurl/core-views';
import { useMemo } from 'react';
import { PixelHighlightSpanSet } from './TimeScrollViewSpans';

export type TSVHighlightLayerProps = {
    highlightSpans?: PixelHighlightSpanSet[]
    margins: {left: number, right: number, top: number, bottom: number}
    width: number
    height: number
}

// some nice purples: [161, 87, 201], or darker: [117, 56, 150]
// dark blue: 0, 30, 255
const defaultSpanHighlightColor = [0, 30, 255]

const paintSpanHighlights = (context: CanvasRenderingContext2D, props: TSVHighlightLayerProps) => {
    const { height, margins, highlightSpans } = props
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)
    if (!highlightSpans || highlightSpans.length === 0) { return }

    const visibleHeight = height - margins.bottom - margins.top
    const zeroHeight = margins.top
    highlightSpans.forEach(h => {
        const definedColor = h.color || defaultSpanHighlightColor
        const [r, g, b, a] = [...definedColor]
        if (a) context.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`

        h.pixelSpans.forEach((span) => {
            if (!a) {
                const alpha = span.width < 2 ? 1 : 0.2
                context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
            }
            context.fillRect(span.start, zeroHeight, span.width, visibleHeight)
        })
    })
}


const TSVHighlightLayer = (props: TSVHighlightLayerProps) => {
    const {width, height, highlightSpans, margins } = props
    const drawData = useMemo(() => ({
        width, height, highlightSpans, margins
    }), [width, height, highlightSpans, margins])

    return (
        <BaseCanvas
            width={width}
            height={height}
            draw={paintSpanHighlights}
            drawData={drawData}
        />
    )
}

export default TSVHighlightLayer