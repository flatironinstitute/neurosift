import { Opts, TimeseriesAnnotationEvent, TimeseriesAnnotationEventType } from "./WorkerTypes";

let canvas: HTMLCanvasElement | undefined = undefined
let opts: Opts | undefined = undefined
let events: TimeseriesAnnotationEvent[] | undefined = undefined
let event_types: TimeseriesAnnotationEventType[] | undefined = undefined

onmessage = function (evt) {
    if (evt.data.canvas) {
        canvas = evt.data.canvas
        drawDebounced()
    }
    if (evt.data.opts) {
        opts = evt.data.opts
        drawDebounced()
    }
    if (evt.data.events) {
        events = evt.data.events
        drawDebounced()
    }
    if (evt.data.event_types) {
        event_types = evt.data.event_types
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
    if (!events) return
    if (!event_types) return

    const {margins, canvasWidth, canvasHeight, visibleStartTimeSec, visibleEndTimeSec} = opts

    // this is important because main thread no longer has control of canvas (it seems)
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    const canvasContext = canvas.getContext("2d")
    if (!canvasContext) return

    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight)

    drawCode += 1
    const thisDrawCode = drawCode

    const eventsFiltered = events.filter(e => (e.s <= visibleEndTimeSec) && (e.e >= visibleStartTimeSec))

    let timer = Date.now()

    const colors = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],
        [255, 0, 255],
        [0, 255, 255],
        [255, 128, 0],
        [255, 0, 128],
        [128, 255, 0],
        [0, 255, 128],
        [128, 0, 255],
        [0, 128, 255]
    ] as [number, number, number][]
    const colorsForEventTypes: {[key: string]: [number, number, number]} = {}
    for (const et of event_types) {
        const color = colors[et.color_index % colors.length]
        colorsForEventTypes[et.event_type] = color
    }

    for (const pass of ['rect', 'line']) {
        for (const e of eventsFiltered) {
            if (thisDrawCode !== drawCode) return
            
            const color = colorsForEventTypes[e.t]
            if (e.e > e.s) {
                if (pass !== 'rect') continue
                const R = {
                    x: margins.left + (e.s - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec) * (canvasWidth - margins.left - margins.right),
                    y: margins.top,
                    w: (e.e - e.s) / (visibleEndTimeSec - visibleStartTimeSec) * (canvasWidth - margins.left - margins.right),
                    h: canvasHeight - margins.top - margins.bottom
                }
                canvasContext.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},0.3)`
                canvasContext.fillRect(R.x, R.y, R.w, R.h)
                const elapsed = Date.now() - timer
                if (elapsed > 100) {
                    await sleepMsec(elapsed)
                    timer = Date.now()
                }
            }
            else {
                if (pass !== 'line') continue
                const pt1 = {
                    x: margins.left + (e.s - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec) * (canvasWidth - margins.left - margins.right),
                    y: margins.top
                }
                const pt2 = {
                    x: pt1.x,
                    y: canvasHeight - margins.bottom
                }
                canvasContext.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},1)`
                canvasContext.beginPath()
                canvasContext.moveTo(pt1.x, pt1.y)
                canvasContext.lineTo(pt2.x, pt2.y)
                canvasContext.stroke()
            }
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