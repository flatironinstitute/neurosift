import { Matrix } from 'mathjs'
import { useMemo } from 'react'
import { convert2dDataSeries } from '../util-point-projection'

type YAxisProps = {
    datamin?: number
    datamax?: number
    userSpecifiedZoom?: number
    pixelHeight: number
}

export type Step = {
    label: string,
    dataValue: number,
    pixelValue?: number,
    isMajor: boolean
}

export type TickSet = {
    ticks: Step[],
    datamax: number,
    datamin: number
}

const minGridSpacingPx = 23
const maxGridSpacingPx = 60

const TRUNCATE_UNCHANGED_HIGHER_ORDER_DIGITS = true

const range = (min: number, max: number, step: number, base: number) => {
    return Array(Math.ceil((max - base)/step))
        .fill(0)
        .map((x, ii) => base + ii * step)
        .filter(x => x > min)
}

const computeInvariant = (min: number, max: number) => {
    // Identify all the high-order digits that don't change between the range min and max, &
    // suppress them for tick labeling purposes, to keep labels from getting too wide or
    // obscuring the actual change between ticks.
    // (We'll continue to display one digit higher than the actual range.)
    // (This may be undesirable--it's not really that commonly done...)
    let invariant = 0
    const maxScale = Math.trunc(Math.log10(max))
    if (Math.trunc(Math.log10(min)) !== maxScale) return invariant
    const rangeScale = Math.trunc(Math.log10(max - min))
    if (maxScale <= rangeScale) return invariant // can happen with a negative minimum
    const oneOmGreaterThanRange = rangeScale + 1
    const realizedMultiplier = Math.pow(10, -oneOmGreaterThanRange)
    const maxStr = Math.trunc(max * realizedMultiplier).toString()
    const minStr = Math.trunc(min * realizedMultiplier).toString()
    for (const [index, digit] of [...maxStr].entries()) {
        if (digit !== minStr[index]) {
            invariant = invariant * Math.pow(10, (index - oneOmGreaterThanRange))
            break
        }
        invariant = invariant * 10 + parseInt(digit)
    }
    return invariant * Math.pow(10, oneOmGreaterThanRange)
}

const alignWithStepSize = (min: number, stepScale: number) => {
    // Return a number a) lower than the data minimum and b) with a 0 in the stepSize-place.
    // So convert min to 1 place bigger than step scale, then floor.
    const floor = Math.floor(min * Math.pow(10, -(stepScale + 1)))
    const rescaled = floor * Math.pow(10, stepScale + 1)
    return rescaled
}

const makeStep = (raw: number, base: number, scale: number): Step => {
    const trimmed = raw - (TRUNCATE_UNCHANGED_HIGHER_ORDER_DIGITS ? base : 0)
    const scaled = Math.trunc(trimmed * Math.pow(10, -scale))
    const isMajor = scaled % 10 === 0
    const label =  Math.abs(scale) > 3 ? `${(scaled/10).toFixed(1)}e${scale + 1}` : `${Math.round(scaled * Math.pow(10, scale) * 1e9) / 1e9}` // use precision rounding
    return {label, isMajor, dataValue: raw}
}

const enumerateScaledSteps = (base: number, datamin: number, datamax: number, stepsize: number, scale: number): Step[] => {
    const stepValues = range(datamin, datamax, stepsize, base).map(v => (Math.round(v * 1e9) / 1e9)) // use precision rounding
    const invariantAboveRange = computeInvariant(datamin, datamax)
    const steps = stepValues.map(v => makeStep(v, invariantAboveRange, scale))

    return steps
}

const emptyTickSet = {
    ticks: [] as any as Step[],
    datamin: 0,
    datamax: 0
}

const simplerGridFit = (dataRange: number, maxGridLines: number) => {
    const baseStep = Math.floor( Math.log10(dataRange / maxGridLines))
    const step = Math.pow(10, baseStep)
    const candidates = [1, 2, 5, 10]
    const numLines = candidates.map(c => (dataRange / (step * c)))
    const i = numLines.findIndex(x => (x < maxGridLines))
    return i === 3 ? {step: 1, scale: baseStep + 1 } : { step: candidates[i], scale: baseStep }
}

const useYAxisTicks = (props: YAxisProps) => {
    const { datamin, datamax, userSpecifiedZoom } = props
    let { pixelHeight } = props
    if (pixelHeight <= 1) pixelHeight = 1 // safely handle case where pixelHeight is negative or zero
    const yZoom = userSpecifiedZoom ?? 1
    return useMemo(() => {
        if (datamin === undefined || datamax === undefined || datamin === datamax) return emptyTickSet
        const _dataMin = datamin / yZoom
        const _dataMax = datamax / yZoom
        const dataRange = _dataMax - _dataMin
    
        const minGridLines = pixelHeight / maxGridSpacingPx
        const maxGridLines = pixelHeight / minGridSpacingPx

        const gridInfo = simplerGridFit(dataRange, maxGridLines)
        const scaledStep = gridInfo.step * Math.pow(10, gridInfo.scale)

        if (dataRange/scaledStep < minGridLines) {
            console.warn(`Error: Unable to compute valid y-axis step size. Suppressing display.`)
            return emptyTickSet
        }
        const startFrom = alignWithStepSize(_dataMin, gridInfo.scale)
        const steps = enumerateScaledSteps(startFrom, _dataMin, _dataMax, scaledStep, gridInfo.scale)
        return { ticks: steps, datamin: _dataMin, datamax: _dataMax }
    }, [datamax, datamin, yZoom, pixelHeight])
}

/**
 * Returns a set of labeled y-axis ticks/grid line locations, projected into the pixel drawing space.
 * @param ticks The set of vertical/data-axis tick marks to draw.
 * @param transform Output of pointProjection.use2dScalingMatrix(); a transform matrix mapping the native
 * unit space into the two-dimensional pixel space. (The x portion will be ignored, though.)
 * @returns Structured set of y-axis ticks ready for painting on the canvas.
 */
export const useProjectedYAxisTicks = (ticks: TickSet, transform: Matrix) => {
    return useMemo(() => {
        const _ticks = ticks.ticks
        const pixelPoints = convert2dDataSeries(transform, [new Array(_ticks.length).fill(0), _ticks.map(t => t.dataValue)])
        const pixelYValues = pixelPoints[1]
        return {
            ...ticks,
            ticks: _ticks.map((t, ii) => {return {...t, pixelValue: pixelYValues[ii]}})
        }
    }, [ticks, transform])
}


export default useYAxisTicks
