import { Opts, Plot, PlotData } from "./WorkerTypes";

let canvas: HTMLCanvasElement | undefined = undefined
let opts: Opts | undefined = undefined
let plotData: PlotData | undefined = undefined
let plotDataFiltered: PlotData | undefined = undefined 

onmessage = function (evt) {
    if (evt.data.canvas) {
        canvas = evt.data.canvas
        drawDebounced()
    }
    if (evt.data.opts) {
        opts = evt.data.opts
        drawDebounced()
    }
    if (evt.data.plotData) {
        plotData = evt.data.plotData
        drawDebounced()
    }
}

function debounce(f: () => void, msec: number) {
    let scheduled = false
    return () => {
        if (scheduled) return
        scheduled = true
        setTimeout(() => {
            scheduled = false
            f()
        }, msec)
    }
}

let drawCode = 0
async function draw() {
    if (!canvas) return
    if (!opts) return
    if (!plotData) return

    const {margins, canvasWidth, canvasHeight, visibleStartTimeSec, visibleEndTimeSec, hoveredUnitId, selectedUnitIds} = opts

    // this is important because main thread no longer has control of canvas (it seems)
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    const canvasContext = canvas.getContext("2d")
    if (!canvasContext) return
    drawCode += 1
    const thisDrawCode = drawCode

    const numUnits = plotData.plots.length
    const unitIndexToY = (unitIndex: number) => (
        canvasHeight - margins.bottom - ((unitIndex + 0.5) - 0) / (numUnits - 0) * (canvasHeight - margins.top - margins.bottom)
    )

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const pass of (plotData ? [1, 2] : [1])) {
        if (thisDrawCode !== drawCode) return

        const timer = Date.now()
        if ((pass === 2) || (!plotDataFiltered)) {
            plotDataFiltered = filterPlotData(plotData)
        }
        const tToX = (t: number) => (
            margins.left + (t - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec) * (canvasWidth - margins.left - margins.right)
        )
        
        const pixelPlots: PixelPlot[] = plotData.plots.map((plot, i) => {
            return {
                y: unitIndexToY(i),
                x: plot.spikeTimesSec.map(t => (tToX(t))),
                unitId: plot.unitId,
                color: plot.color,
                hovered: plot.unitId === hoveredUnitId,
                selected: selectedUnitIds.includes(plot.unitId)
            }
        })
        paintPanel(canvasContext, pixelPlots)
        
        // the wait time is equal to the render time
        const elapsed = Date.now() - timer
        await sleepMsec(elapsed)
    }
}

const drawDebounced = debounce(draw, 10)

type PixelPlot = {
    y: number,
    x: number[]
    unitId: string | number
    color: string
    hovered: boolean
    selected: boolean
}

const paintPanel = (context: CanvasRenderingContext2D, pixelPlots: PixelPlot[]) => {
    if (!opts) return
    const { margins, canvasWidth, canvasHeight } = opts

    context.clearRect(0, 0, canvasWidth, canvasHeight)

    const pixelsPerUnit = canvasHeight / pixelPlots.length

    // do this before clipping
    for (const pass of [1, 2, 3]) {
        pixelPlots.forEach(pPlot => {
            if (((pass === 1) && (pixelsPerUnit >= 10)) || ((pass === 2) && (pPlot.selected)) || ((pass === 3) && (pPlot.hovered))) {
                context.fillStyle = pass === 1 ? pPlot.color : pass === 2 ? 'black' : pPlot.color
                context.textAlign = 'right'
                context.textBaseline = 'middle'
                context.font = `${pass > 1 ? 'bold ' : ''}12px Arial`
                context.fillText(pPlot.unitId + '', margins.left - 4, pPlot.y)

                if ((pass === 3) || ((pass === 2) && pPlot.hovered)) {
                    context.textAlign = 'left'
                    context.textBaseline = 'middle'
                    context.font = `${pass > 1 ? 'bold ' : ''}12px Arial`
                    context.fillText(pPlot.unitId + '', canvasWidth - margins.right + 4, pPlot.y)
                }
            }
        })
    }

    context.save()
    context.beginPath()
    context.rect(margins.left, margins.top, canvasWidth - margins.left - margins.right, canvasHeight - margins.top - margins.bottom)
    context.clip()

    for (const pass of [1, 2]) {
        pixelPlots.forEach(pPlot => {
            if ((pass === 2) && (pPlot.hovered)) {
                context.strokeStyle = 'yellow'
                context.lineWidth = 3
                context.beginPath()
                context.moveTo(0, pPlot.y)
                context.lineTo(canvasWidth, pPlot.y)
                context.stroke()

                context.strokeStyle = 'gray'
                context.lineWidth = 1
                context.beginPath()
                context.moveTo(0, pPlot.y)
                context.lineTo(canvasWidth, pPlot.y)
                context.stroke()
            }
            if ((pass === 1) && (pPlot.selected)) {
                context.strokeStyle = 'lightblue'
                context.lineWidth = 3
                context.beginPath()
                context.moveTo(0, pPlot.y)
                context.lineTo(canvasWidth, pPlot.y)
                context.stroke()
            }
        })
    }

    pixelPlots.forEach(pPlot => {
        context.strokeStyle = pPlot.color
        context.lineWidth = 3
        context.beginPath()
        pPlot.x.forEach(x => {
            context.moveTo(x - 2, pPlot.y)
            context.lineTo(x + 2, pPlot.y)
        })
        context.stroke()
    })

    context.restore()
}

const filterPlotData = (plotData: PlotData): PlotData | undefined => {
    if (!opts) return undefined
    const {visibleStartTimeSec, visibleEndTimeSec} = opts

    if ((visibleStartTimeSec === undefined) || (visibleEndTimeSec === undefined)) {
        return undefined
    }
    const newPlots: Plot[] = plotData.plots.map(plot => (
        {
            ...plot,
            spikeTimesSec: plot.spikeTimesSec.filter(t => (visibleStartTimeSec <= t) && (t <= visibleEndTimeSec))
        }
    ))
    return {
        ...plotData,
        plots: newPlots
    }
}

function sleepMsec(msec: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, msec)
    })
}

// export { }