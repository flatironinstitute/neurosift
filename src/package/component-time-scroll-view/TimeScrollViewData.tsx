import { validateObject } from "@figurl/core-utils"
import { isArrayOf, isNumber, optional } from "@figurl/core-utils"

export type HighlightIntervalSet = {
    intervalStarts: number[]
    intervalEnds: number[]
    color?: number[] // optional to set the span highlight color for each set of spans.
    // color, if defined, should be an array of 3 or 4 numbers representing the [r, g, b, a]
    // components of the chosen color in the range 0-255.
    // If a is set, a constant alpha will be used throughout, but it's recommended to leave it
    // blank, in which case we will automatically use full alpha for sub-two-pixel span widths
    // and downgrade to 50% alpha for spans of 2 or more pixels, which helps make the spans
    // visible at smaller zooms but not opaque at higher zooms.
}

export const isHighlightIntervalSet = (x: any): x is HighlightIntervalSet => {
    const baseCheck = validateObject(x, {
        intervalStarts: isArrayOf(isNumber),
        intervalEnds: isArrayOf(isNumber),
        color: optional(isArrayOf(isNumber))
    })
    const lengthCheck = x.intervalStarts.length === x.intervalEnds.length
    const orderCheck = x.intervalStarts.every((startVal: number, index: number) => startVal <= x.intervalEnds[index])
    const validColorCheck = (!x.color) || (x.color.length > 2 && x.color.length < 5)
    return baseCheck && lengthCheck && orderCheck && validColorCheck
}
