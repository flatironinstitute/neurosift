import { Matrix } from 'mathjs';
import { usePointWidthsFromIntervals } from '../util-point-projection';
import { HighlightIntervalSet } from './TimeScrollViewData';


export type PixelSpan = {
    start: number,
    width: number
}

export type PixelHighlightSpanSet = {
    pixelSpans: PixelSpan[],
    color?: number[]
}


 const filterTimeRanges = (startsSec: number[], endsSec: number[], rangeStartSec: number | undefined, rangeEndSec: number | undefined): number[][] => {
    // Take all intervals that begin before the range end or end after the range start
    const definedRangeStartSec = rangeStartSec || 0

    const startIndices = (rangeEndSec ? startsSec.map((s, i) => s <= rangeEndSec ? i : null) : startsSec.map((s, i) => i)).filter(i => i) as number[] // filter removes nulls
    const endIndices = endsSec.map((s, i) => s >= definedRangeStartSec ? i : null).filter(i => i) as number[]
    // get set intersection to find all those spans that begin before our window ends and end after our window begins
    const largerSet = new Set(startIndices.length > endIndices.length ? startIndices : endIndices)
    const smallerList = startIndices.length > endIndices.length ? endIndices : startIndices
    const validIndices = smallerList.filter(i => largerSet.has(i))
    const finalStarts = validIndices.map(i => Math.max(startsSec[i], definedRangeStartSec))
    const finalEnds = validIndices.map(i => Math.min(endsSec[i], (rangeEndSec ?? endsSec[i])))
    return [finalStarts, finalEnds]
}

export const filterAndProjectHighlightSpans = (highlightIntervals: HighlightIntervalSet[] | undefined, visibleStartTimeSec: number | undefined, visibleEndTimeSec: number | undefined, timeAxisTransform: Matrix) => {
    if (!highlightIntervals || highlightIntervals.length === 0) return []
    const highlightSpans = highlightIntervals.map(spanSet => {
        const filteredSpanSet = filterTimeRanges(spanSet.intervalStarts, spanSet.intervalEnds, visibleStartTimeSec, visibleEndTimeSec)
        const pixelSpanStartsAndWidths = usePointWidthsFromIntervals(timeAxisTransform, filteredSpanSet)
        const pixelSpans = pixelSpanStartsAndWidths[0].map((start, index) => {return {start, width: pixelSpanStartsAndWidths[1][index]} as PixelSpan})
        // TODO: something with the color if it were provided which we don't support here
        return { pixelSpans, color: spanSet.color } as PixelHighlightSpanSet
    })

    return highlightSpans
}
