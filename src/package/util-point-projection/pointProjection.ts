import { add, matrix, Matrix, multiply, transpose } from 'mathjs';
import { useMemo } from 'react';

export type Margins = {
    left: number
    right: number
    top: number
    bottom: number
}

export type PartialMargins = {
    left?: number
    right?: number
    top?: number
    bottom?: number
}

export type ScalingProps = {
    totalPixelWidth: number
    totalPixelHeight: number
    pixelMargins?: PartialMargins
    dataXMin?: number
    dataXMax?: number
    dataYMin?: number
    dataYMax?: number
    yScaleFactor?: number
    xScaleFactor?: number
    positiveYGrowsDownward?: boolean
    preserveAspectRatio?: boolean
}

export type Dims = {
    xMin: number
    xMax: number
    yMin: number
    yMax: number
}

type scaleOffset = {
    xScale: number
    yScale: number
    xOffsetPx: number
    yOffsetPx: number
}


/**
 * Convenience method to convert a 1d data series from native units into pixel space, using a transform
 * provided by use1dScalingMatrix.
 * 
 * @param data The one-dimensional data series to project into pixel space, as a 1d array of numbers.
 * @param transform The 1d scaling matrix produced from use1dScalingMatrix.
 * @returns The equivalent data series in pixel space.
 */
export const convert1dDataSeries = (data: number[], transform: Matrix): number[] => {
    const augmentedData = matrix([data, new Array(data.length).fill(1)])
    return multiply(transform, augmentedData).valueOf() as number[]
}


/**
 * Gets the per-unit scale factor from a 1d data series scaling matrix.
 * @param transform The one-dimensional scaling matrix, as from use1dScalingMatrix.
 * @returns The number of pixels represented by one native unit.
 */
export const getScaleFrom1dScalingMatrix = (transform: Matrix): number => {
    const unit = matrix([[1], [0]])
    return multiply(transform, unit).valueOf()[0] as number
}


/**
 * For a given data series, computes a 1 x 2 matrix (vector) which can left-multiply an augmented vector
 * of the data series to map it into pixel space.
 * This is appropriate for use with x-axis/horizontal-only data (e.g. times in a time series)--it does not offer the
 * ability to invert the axis, as is needed for y-axis data (since the browser maps y-0 to the top of the container and
 * y-values increase as you move down, rather than up, the screen).
 * 
 * This transform matrix is consumed by convert1dDataSeries as:
 * 
 * const data = [5, 10, 20]
 * const transform = use1dScalingMatrix(pixelWidth: 500, dataStart: 0, dataEnd: 50, extraPixelOffset: 10)
 * const pixelData = useConverted1dDataSeres(data, transform)
 * // pixelData = [60, 110, 210], since we mapped a 50-unit range into a 500-pixel space with a 10-pixel offset.
 * 
 * @param pixelWidth Width of the target space in pixels. (This is the width of the drawing space only--if the total window
 * is 700 pixels but you want a 100-pixel margin on either side, you would use 500 for this value and 100 for the extraPixelOffset.)
 * @param dataStart Value, in native units, of the first data point to be projected into pixel space.
 * @param dataLength Length, in native units, of the range of data points to be projected into pixel space. The range of the
 * data is assumed to be continuous.
 * @param extraPixelOffset The width of any margin between the left side of the space ('pixel zero') and the start of the
 * space the data series should be projected into.
 * @returns A 1 x 2 vector which projects data into pixel space, usable directly or by useConverted1dDataSeries and useSpansToStartWidthForm.
 */
export const use1dScalingMatrix = (pixelWidth: number, dataStart: number | undefined, dataEnd: number | undefined, extraPixelOffset: number = 0) => {
    return useMemo(() => {
        if (dataStart === undefined || dataEnd === undefined) {
            console.warn("Attempt to compute 1d scaling matrix, but either start or length is unset. Mapping to null.")
            return matrix([0, 0])
        }
        if (dataStart === dataEnd) {
            console.warn("Attempt to compute 1d scaling matrix with 0-length data. Mapping to null.")
            return matrix([0, 0])
        }
        const pixelsPerBaseUnit = pixelWidth / (dataEnd - dataStart)
        return matrix([pixelsPerBaseUnit, extraPixelOffset + dataStart * -pixelsPerBaseUnit])
    }, [pixelWidth, dataStart, dataEnd, extraPixelOffset])
}


/**
 * Hook to convert [TODO: MEMOIZED] 1-d intervals, represented as start and stop intervals in a native unit, into
 * corresponding starts and widths in pixel space. This is particularly useful for graphics applications like
 * drawing rectangles, since the canvas rect() function takes (x, y, w, h). If you actually want start and end
 * points in pixelspace, you're better off using one of the useConvertedDataSeries methods.
 * @param scalingMatrix A 1d scaling matrix (as from use1dScalingMatrix) appropriate to the data and window.
 * @param data List of lists of numbers representing the start and end points of intervals in the native data units. May
 * be written either as two series, i.e. [ [start_0, start_1, start_2, ...], [end_0, end_1, end_2, ...]] or
 * in pairs, as [ [start_0, end_0], [start_1, end_1], [start_2, end_2], ... ]
 * @param dataInPairs Should be set to true if `data` is represented as a list of pairs of numbers, so that they can
 * be transposed appropriately.
 * @returns Conversion of the original data series into pixel space, with each interval represented as its start
 * pixel and pixel width (instead of start and stop). (This is usually what you want for drawing rectangles.) If
 * the data were passed as two series, the return value is [[...starts...], [...ends...]]; if the original data
 * were passed as pairs, the return value will also be in pairs, as [[start_0, width_0], [start_1, width_1], ...].
 */
export const usePointWidthsFromIntervals = (scalingMatrix: Matrix, data: number[][], dataInPairs?: boolean) => {
    const baseTransformValues = scalingMatrix.valueOf().flat()
    const scale = baseTransformValues[0]
    const offset = baseTransformValues[1]

    // 1st row scales the start value & adds the offset; 2nd row subtracts the start value from the end value, no offset
    const intervalToSegmentMatrix = matrix([
        [ scale,   0  , offset],
        [-scale, scale,    0  ]
    ])

    const dataMatrix = dataInPairs ? transpose(matrix(data)) : matrix(data)
    dataMatrix.resize(add(dataMatrix.size(), [1,0]), 1)
    const pixelStartsAndWidths = multiply(intervalToSegmentMatrix, dataMatrix)
    return (dataInPairs ? (transpose(pixelStartsAndWidths).valueOf()) : pixelStartsAndWidths.valueOf()) as number[][]
}


const applyPixelMargins = (totalPixelWidth: number, totalPixelHeight: number, pixelMargins?: PartialMargins) => {
    const pixelXMin = pixelMargins?.left ?? 0
    const pixelYMin = pixelMargins?.top ?? 0
    const pixelXMax = totalPixelWidth - (pixelMargins?.right ?? 0)
    const pixelYMax = totalPixelHeight - (pixelMargins?.bottom ?? 0)

    return { xMin: pixelXMin, xMax: pixelXMax, yMin: pixelYMin, yMax: pixelYMax }
}


const handleAspectRatio = (pixelDims: Dims, dataDims: Dims): Dims => {
    const yRangeD = (dataDims.yMax - dataDims.yMin)
    const xRangeD = (dataDims.xMax - dataDims.xMin)
    const yRangePx = (pixelDims.yMax - pixelDims.yMin)
    const xRangePx = (pixelDims.xMax - pixelDims.xMin)

    const aspectRatioPx = xRangePx / yRangePx
    const aspectRatioD = yRangeD > 0 ? xRangeD / yRangeD : -1
    // No need to adjust if we have 1D data or the ratios already match
    if (aspectRatioPx === aspectRatioD || aspectRatioD === -1) return pixelDims

    // aspect ratios do not match. So the pixel space has one dimension too large, relative to the other.
    // Figure out which it is, then add extra margin to either side of it in order to center the result.
    // Update the corresponding pixel ranges and then hand off to the base scale computation.
    if (aspectRatioPx > aspectRatioD) {
        // pixel space is too wide
        const rightPxWidth = xRangeD * (yRangePx / yRangeD)
        const extraWidth = xRangePx - rightPxWidth
        return {...pixelDims, xMin: pixelDims.xMin + extraWidth/2, xMax: pixelDims.xMax - extraWidth/2}
    } else {
        // pixel space is too tall
        const rightPxHeight = yRangeD * (xRangePx / xRangeD)
        const extraHeight = yRangePx - rightPxHeight
        return {...pixelDims, yMin: pixelDims.yMin + extraHeight/2, yMax: pixelDims.yMax - extraHeight/2}
    }
}


const computeScales = (pixelDims: Dims, dataDims: Dims, invertY: boolean, preserveAspectRatio: boolean): scaleOffset => {
    /*
        For the x-dimension, the logic is fairly straightforward; we follow the 1d scaling matrix logic.
        for the y-dimension, we potentially need to worry about inversion (since computer graphics convention puts y=0 at the top).
        a non-inverted scaling would look like:
            [1]   y --> (((y * userScaleFactor) - y_min) / (y_max - y_min)) * panelHeight
        which places y proportionally in the panel to where it falls in the data.
        Inverting that scaling would mean subtracting the variable part from 1:
            [2]   y --> (1 - ((y * userScaleFactor) - y_min) / (y_max - y_min)) * panelHeight
        But we don't want to have to do the subtraction and rescale everything every time.
        Instead, let's rewrite [1] as:
            [1']  y --> ((y * userScaleFactor) / (y_max - y_min) - (y_min / (y_max - y_min)) * panelHeight
        That will be less hairy if we let yScale = (panelHeight) / (y_max - y_min), then:
        
            [1f] y --> ( y * yScale * userScaleFactor) - (y_min * yScale)
        which gives us an input, a scale, and an offset.

        For the inverted case, rewrite [2] as:
            [2']  y --> (1                -  ((y * userScaleFactor)/y_range) + (y_min/y_range)) * panelHeight
        Distribute the panelHeight:
            [2"]  y --> (panelHeight      - (panelHeight * y * usf)/y_range) + (panelHeight * y_min)/y_range)
        Again, use yScale = (panelHeight) / y_range:
            [2"'] y --> (yScale * y_range) - (yScale  * y * userScaleFactor) + (yScale * y_min)
        and as a scale and offset version:
        
            [2f]  y --> (-yScale * y * userScaleFactor) + (yScale * (y_range + y_min))
        (and observe that since y_range = y_max - y_min, then y_range + y_min = y_max.)
        
        If either data dimension has width 0, we will map it to the midpoint of the corresponding pixel dimension.
    */

    const adjustedPixelDims = preserveAspectRatio ? handleAspectRatio(pixelDims, dataDims) : pixelDims

    const yRangeD = (dataDims.yMax - dataDims.yMin)
    const xRangeD = (dataDims.xMax - dataDims.xMin)
    const yRangePx = (adjustedPixelDims.yMax - adjustedPixelDims.yMin)
    const xRangePx = (adjustedPixelDims.xMax - adjustedPixelDims.xMin)

    const xScale = xRangeD === 0
        ? 0
        : (xRangePx / xRangeD)
    const yScale = yRangeD === 0
        ? 0
        : (yRangePx / yRangeD)
    
    const xOffsetPx = adjustedPixelDims.xMin + (-xScale * dataDims.xMin)
    const yOffsetPx = adjustedPixelDims.yMin + (invertY ? yScale * dataDims.yMax : -yScale * dataDims.yMin)
    return {xScale, yScale, xOffsetPx, yOffsetPx}
}


const matrixFromScaleOffset = (scale: scaleOffset, xScaleFactor: number, yScaleFactor: number) => {
    const xScale = scale.xScale * xScaleFactor
    const yScale = scale.yScale * yScaleFactor
    // 2d transform matrices that we use are always of the form:
    // x-scale,    0,     x-offset,
    //     0,   y-scale,  y-offset
    // (We don't actually need a third row)
    return matrix([[xScale,    0   ,  scale.xOffsetPx],
                   [  0   ,  yScale,  scale.yOffsetPx]])
}


/**
 * For a given data range in 2 dimensions, computes a (memoized) 2 x 3 matrix which can left-multiply
 * an augmented data vector to map the data points into pixel space.
 * This is appropriate for use with 2D data (in x and y).
 * Graphics convention places y=0 at the top of the window with increasing y values moving lower in
 * the drawing space. This is probably not what you want, so by default the transformation matrix
 * corrects for the inversion.
 * 
 * It is probably easiest not to adjust the `totalPixelWidth` and `totalPixelHeight` parameters, but
 * rather to let the `pixelMargins` parameter take care of this. The code assumes they run from 0
 * to the full range of the visible window.
 * However, if you have already computed a specific pixel space, you can submit that, just be aware
 * that there may be odd behavior in applying user scaling and in preserving aspect ratio.
 * In any event, be aware that user scaling options may result in drawing in the margins.
 * 
 * The transform matrix returned by this function can be consumed by useConverted2dDataSeries as:
 * 
 * const data = [[1, 3, 5], [1, 9, 25]]
 * const scalingMatrixProps = {
 *   totalPixelWidth: 250,
 *   totalPixelHeight: 250,
 *   pixelMargins: { top: 20, bottom: 30, left: 25, right: 25 },
 *   dataXMin: 0,
 *   dataXMax: 10,
 *   dataYMin: 0,
 *   dataYMax: 50
 * }
 * const transform = use2dScalingMatrix(scalingMatrixProps)
 * const pixelData = convert2dDataSeries(data, transform)
 * // pixelData = [[45, 85, 125], [216, 184, 120]]
 * 
 * @param props A `ScalingProps` containing the total pixel dimensions, pixel margins, data dimensions,
 * user-defined scaling factors in x and y directions, and options to preserve the aspect ratio of the
 * data and to accept the graphics-system default of setting y=0 at the top of the window.
 * @returns A 2d scaling matrix which maps native data points into a desired drawing space.
 */
export const use2dScalingMatrix = (props: ScalingProps) => {
    const {positiveYGrowsDownward, preserveAspectRatio} = props
    const {totalPixelWidth, totalPixelHeight, pixelMargins} = props
    const {dataXMin, dataXMax, dataYMin, dataYMax, yScaleFactor, xScaleFactor} = props
    const xformMatrix = useMemo(() => {
        // NOTE scaling may make us draw in the margins!!!! Think about this
        const invert = !positiveYGrowsDownward
        if (dataXMin === undefined || dataXMax === undefined || dataYMin === undefined || dataYMax === undefined) {
            console.warn("Attempt to compute pixel projection matrix with undefined data elements. Mapping to null.")
            return matrix([[0, 0, 0], [0, 0, 0]])
        }
        if (dataXMin === dataXMax && dataYMin === dataYMax) {
            console.warn("Attempt to compute pixel projection matrix, but data has 0 width in both dimensions. Mapping to null.")
            return matrix([[0, 0, 0], [0, 0, 0]])
        }
        
        const _pixelDims = applyPixelMargins(totalPixelWidth, totalPixelHeight, pixelMargins)
        const dataDims = { xMin: dataXMin, xMax: dataXMax, yMin: dataYMin, yMax: dataYMax }
        const scale = computeScales(_pixelDims, dataDims, invert, (preserveAspectRatio ?? false))
        
        const xform = matrixFromScaleOffset(scale, (xScaleFactor ?? 1), ((yScaleFactor ?? 1) * (invert ? -1 : 1)) )
        return xform
    }, [positiveYGrowsDownward, preserveAspectRatio, dataXMin, dataXMax, dataYMin, dataYMax,
        totalPixelWidth, totalPixelHeight, pixelMargins, yScaleFactor, xScaleFactor])
    return xformMatrix
}


/**
 * This function returns the pixel value on the y axis corresponding to the 0 of a rendered plot (accounting for margins
 * if they were used in creating the input transform matrix).
 * This value is often needed for drawing baselines and axes in plots, and the function decreases the chance of error
 * when dealing with the reversed y-axis conventions between computer graphics and usual plotting practice.
 * @param transformMatrix2d A matrix (as generated by use2dScalingMatrix) which projects native data points into
 * pixels.
 * @returns The scalar pixel value, within the window, corresponding to 0 in the native unit space.
 */
export const getYAxisPixelZero = (transformMatrix2d: Matrix) => {
    const augmentedZero = matrix([[0], [0], [1]])
    const value = (multiply(transformMatrix2d, augmentedZero).valueOf() as number[][])[1][0]
    return value
}


/**
 * Function to project a data series of 2-d points into a pixel drawing space.
 * @param transform Transformation matrix from use2dScalingMatrix.
 * @param data The two-dimensional data series to project into the pixel space. May be represented as 
 * an x-series and a y-series ([[x_0, x_1, ...], [y_0, y_1, ...]]) or as a list of paired points
 * ([[x_0, y_0], [x_1, y_1], [x_2, y_2], ...]).
 * @param dataAsPairs Must be set to true if the `data` value is passed as a list of paired points.
 * @returns The pixel values corresponding to the given data points. The return value will match the
 * structure of the input value: if the original data were passed as two series, the return value will
 * be two series; if the original data were a list of [x, y] pairs, then a list of pairs will be returned.
 */
export const convert2dDataSeries = (transform: Matrix, data: number[][], dataAsPairs?: boolean) => {
    const dataMatrix = dataAsPairs ? transpose(matrix(data)) : matrix(data)
    dataMatrix.resize(add(dataMatrix.size(), [1,0]), 1) // augment matrix with a row of 1s
    const convertedSeries = multiply(transform, dataMatrix)
    return (dataAsPairs ? (transpose(convertedSeries)).valueOf() : convertedSeries.valueOf()) as number[][]
}


/**
 * Converts distances in the data's native units into the corresponding distance in pixels. Input distances and
 * output distances are to be broken into x and y components. (This is intended for converting rectangles and
 * other spans, not for computing a distance metric.)
 * @param xDistance The distance between the x-values of two points in the data's native units.
 * @param yDistance The distance between the y-values of two points in the data's native units.
 * @param transform 2d scaling matrix as provided by use2dScalingMatrix.
 * @returns The corresponding x- and y-distances in pixels.
 */
export const convertBaseDistanceToPixelDistance = (xDistance: number, yDistance: number, transform: Matrix) => {
    const dataMatrix = ([[xDistance], [yDistance], [0]])
    const result = multiply(transform, dataMatrix).valueOf() as number[][]
    return { xDistance: result[0][0], yDistance: result[1][1] }
}
