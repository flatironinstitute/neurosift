import { Opts, DataSeries } from "./SpatialWorkerTypes";

let canvas: HTMLCanvasElement | undefined = undefined
let opts: Opts | undefined = undefined
let dataSeries: DataSeries | undefined = undefined

onmessage = function (evt) {
    if (evt.data.canvas) {
        canvas = evt.data.canvas
        drawDebounced()
    }
    if (evt.data.opts) {
        opts = evt.data.opts
        drawDebounced()
    }
    if (evt.data.dataSeries) {
        dataSeries = evt.data.dataSeries
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
    if (!dataSeries) return

    const {margins, canvasWidth, canvasHeight, visibleStartTimeSec, visibleEndTimeSec, xMin, xMax, yMin, yMax} = opts

    // this is important because main thread no longer has control of canvas (it seems)
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    const canvasContext = canvas.getContext("2d")
    if (!canvasContext) return
    drawCode += 1
    const thisDrawCode = drawCode

    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight)

    const timer = Date.now()
    const valueRange = {xMin, xMax, yMin, yMax}
    const coordToPixel = (p: {x: number, y: number}) => {
        const {xMin, xMax, yMin, yMax} = valueRange
        const scale = Math.min((canvasWidth - margins.left - margins.right) / (xMax - xMin), (canvasHeight - margins.top - margins.bottom) / (yMax - yMin))
        const offsetX = (canvasWidth - margins.left - margins.right - (xMax - xMin) * scale) / 2
        const offsetY = (canvasHeight - margins.top - margins.bottom - (yMax - yMin) * scale) / 2
        return {
            x: !isNaN(p.x) ? margins.left + offsetX + (p.x - xMin) * scale : NaN, 
            y: !isNaN(p.y) ? canvasHeight - margins.bottom - offsetY - (p.y - yMin) * scale : NaN
        }
    }

    const tToColor = (t: number) => {
        const frac = (t - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec)
        const r = 0
        const g = Math.floor(255 * (1 - frac))
        const b = Math.floor(255 * frac)
        return `rgb(${r},${g},${b})`
    }
    let lastPixelPoint: {x: number, y: number} | undefined = undefined
    for (let i = 0; i < dataSeries.t.length; i ++) {
        const tt = dataSeries.t[i]
        if ((tt < visibleStartTimeSec) || (tt > visibleEndTimeSec)) continue
        const vx = dataSeries.x[i]
        const vy = dataSeries.y[i]
        if ((isNaN(vx)) || (isNaN(vy))) {
            lastPixelPoint = undefined
        }
        else {
            const pp = coordToPixel({x: dataSeries.x[i], y: dataSeries.y[i]})
            if (lastPixelPoint) {
                canvasContext.beginPath()
                canvasContext.moveTo(lastPixelPoint.x, lastPixelPoint.y)
                canvasContext.lineTo(pp.x, pp.y)
                canvasContext.strokeStyle = tToColor(tt)
                canvasContext.stroke()
            }
            lastPixelPoint = pp
        }
    }
}

const drawDebounced = debounce(draw, 10)

function sleepMsec(msec: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, msec)
    })
}

// export { }