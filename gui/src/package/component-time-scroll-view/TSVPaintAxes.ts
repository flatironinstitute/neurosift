import { TickSet } from "./YAxisTicks";
import { TimeTick } from "./TimeAxisTicks";
import { TimeScrollViewPanel } from "./TimeScrollView";
import { TSVAxesLayerProps } from "./TSVAxesLayer";

const highlightedRowFillStyle = '#c5e1ff' // TODO: This should be standardized across the application

export const paintAxes = <T extends {[key: string]: any}>(context: CanvasRenderingContext2D, props: TSVAxesLayerProps<T> & {'selectedPanelKeys': Set<number | string>, showYMinMaxLabels: boolean}) => {
    // I've left the timeRange in the props list since we will probably want to display something with it at some point
    const {width, height, margins, panels, panelHeight, perPanelOffset, selectedPanelKeys, yTickSet, timeTicks, hideTimeAxis, showYMinMaxLabels, gridlineOpts} = props
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)

    const xAxisVerticalPosition = height - margins.bottom
    paintTimeTicks(context, timeTicks, hideTimeAxis, xAxisVerticalPosition, margins.top, {hideGridlines: gridlineOpts?.hideX})
    if (!hideTimeAxis) {
        context.strokeStyle = 'black'
        drawLine(context, margins.left, xAxisVerticalPosition, width - margins.right, xAxisVerticalPosition)
    }
    yTickSet && paintYTicks(context, yTickSet, xAxisVerticalPosition, margins.left, width - margins.right, margins.top, showYMinMaxLabels, {hideGridlines: gridlineOpts?.hideY})
    paintPanelHighlights(context, panels, selectedPanelKeys, margins.top, width, perPanelOffset, panelHeight)
    paintPanelLabels(context, panels, margins.left, margins.top, perPanelOffset, panelHeight)
}

const paintYTicks = (context: CanvasRenderingContext2D, tickSet: TickSet, xAxisYCoordinate: number, yAxisXCoordinate: number, plotRightPx: number, topMargin: number, showYMinMaxLabels: boolean, o: {hideGridlines?: boolean}) => {
    const labelOffsetFromGridline = 2
    const gridlineLeftEdge = yAxisXCoordinate - 5
    const labelRightEdge = gridlineLeftEdge - labelOffsetFromGridline
    const { datamax, datamin, ticks } = tickSet
    context.fillStyle = 'black'
    context.textAlign = 'right'

    if (showYMinMaxLabels) {
        // Range-end labels
        const stringMax = datamax.toString()
        const printMax = stringMax.substring(0, 5).search(".") === -1 ? 5 : 6
        const stringMin = datamin.toString()
        const printMin = stringMin.substring(0, 5).search(".") === -1 ? 5 : 6
        context.textBaseline = 'bottom'
        context.fillText(stringMax.substring(0, printMax), labelRightEdge, topMargin)
        context.textBaseline = 'top'
        context.fillText(datamin.toString().substring(0, printMin), labelRightEdge, xAxisYCoordinate)
    }

    context.textBaseline = 'middle'
    ticks.forEach(tick => {
        if (!tick.pixelValue) return
        const pixelValueWithMargin = tick.pixelValue + topMargin
        context.strokeStyle = tick.isMajor ? 'gray' : 'lightgray'
        context.fillStyle = tick.isMajor ? 'black' : 'gray'
        const rightPixel = !o.hideGridlines ? plotRightPx : yAxisXCoordinate
        drawLine(context, gridlineLeftEdge, pixelValueWithMargin, rightPixel, pixelValueWithMargin)
        context.fillText(tick.label, labelRightEdge, pixelValueWithMargin) // TODO: Add a max width thingy
    })
}

const paintTimeTicks = (context: CanvasRenderingContext2D, timeTicks: TimeTick[], hideTimeAxis: boolean | undefined, xAxisPixelHeight: number, plotTopPixelHeight: number, o: {hideGridlines?: boolean}) => {
    if (!timeTicks || timeTicks.length === 0) return
    // Grid line length: if time axis is shown, grid lines extends 5 pixels below it. Otherwise they should stop at the edge of the plotting space.
    const labelOffsetFromGridline = 2
    const gridlineBottomEdge = xAxisPixelHeight + (hideTimeAxis ? 0 : + 5)
    context.textAlign = 'center'
    context.textBaseline = 'top'
    timeTicks.forEach(tick => {
        context.strokeStyle = tick.major ? 'gray' : 'lightgray'
        const topPixel = !o.hideGridlines ? plotTopPixelHeight : xAxisPixelHeight
        drawLine(context, tick.pixelXposition, gridlineBottomEdge, tick.pixelXposition, topPixel)
        if (!hideTimeAxis) {
            context.fillStyle = tick.major ? 'black' : 'gray'
            context.fillText(tick.label, tick.pixelXposition, gridlineBottomEdge + labelOffsetFromGridline)
        }
    })
}

const paintPanelHighlights = (context: CanvasRenderingContext2D, panels: TimeScrollViewPanel<any>[], selectedPanelKeys: Set<number | string>, topMargin: number, width: number, perPanelOffset: number, panelHeight: number) => {
    if (!selectedPanelKeys || selectedPanelKeys.size === 0) return
    context.fillStyle = highlightedRowFillStyle
    panels.forEach((panel, ii) => {
        if (selectedPanelKeys.has(Number(panel.key))) {
            const topOfHighlight = topMargin + ii * (perPanelOffset)
            context.fillRect(0, topOfHighlight, width, panelHeight)
        }
    })
}

const paintPanelLabels = (context: CanvasRenderingContext2D, panels: TimeScrollViewPanel<any>[], leftMargin: number, topMargin: number, perPanelOffset: number, panelHeight: number) => {
    if (!panels.some(p => p.label) || perPanelOffset < 7.2) return  // based on our default '10px sans-serif' font -- probably should be dynamic

    context.textAlign = 'right'
    context.textBaseline = 'middle'
    context.fillStyle = 'black'
    const rightEdgeOfText = leftMargin - 5
    let yPosition = topMargin + panelHeight / 2
    panels.forEach((panel) => {
        context.fillText(panel.label, rightEdgeOfText, yPosition)
        yPosition += perPanelOffset
    })
}


const drawLine = (context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    context.beginPath()
    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
    context.stroke()
}