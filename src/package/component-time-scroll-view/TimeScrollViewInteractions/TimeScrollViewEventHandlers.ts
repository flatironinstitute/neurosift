import React, { useCallback, useMemo } from 'react';
import { useTimeseriesSelection, useTimeRange } from '../../context-timeseries-selection';
import { clearDivFocus, divExists, setDivFocus } from './divRefHandling';
import useTimeScrollPan, { PanUpdateProperties } from './useTimeScrollPan';


export const suppressWheelScroll = (divRef: React.MutableRefObject<HTMLDivElement | null>) => {
    if (!divRef || !divRef.current) return
    const canvases = Array.from(divRef.current.children).filter(e => e.nodeName === 'CANVAS')
    canvases.forEach(c => {
        c.addEventListener('wheel', (e: Event) => {
            if ((divRef?.current as any)['_hasFocus']) {
                e.preventDefault()
            }
        })
    })
}


type DivRef = React.MutableRefObject<HTMLDivElement | null>

type ClickReader = (e: React.MouseEvent) => { mouseX: number, fraction: number }
const useClickReader = (leftMargin: number, panelWidthPx: number): ClickReader => {
    return useCallback((e: React.MouseEvent) => {
        const x = e.clientX - e.currentTarget.getBoundingClientRect().x - leftMargin
        const frac = Math.max(0, Math.min(1, x / panelWidthPx))
        return { mouseX: x, fraction: frac }
    }, [leftMargin, panelWidthPx])
}


const useMousedownHandler = (divRef: DivRef, clickReader: ClickReader, resetPanStateAnchor: (mouseX: number) => void) => {
    const handler = useCallback((e: React.MouseEvent) => {
        if (divExists(divRef)) {
            const {mouseX} = clickReader(e)
            resetPanStateAnchor(mouseX)
        }
    }, [divRef, clickReader, resetPanStateAnchor])

    return handler
}


const useMouseLeaveHandler = (divRef: DivRef, clearPanState: () => void) => {
    const handler = useCallback((e: React.MouseEvent) => {
        if (divExists(divRef)) {
            clearPanState()
            clearDivFocus(divRef)
        }
    }, [divRef, clearPanState])

    return handler
}


const useClickHandler = (divRef: DivRef, clickReader: ClickReader, setCurrentTimeFraction: (fraction: number, opts: {event: React.MouseEvent}) => void) => {
    const handler = useCallback((e: React.MouseEvent) => {
        if (divExists(divRef)) {
            const {fraction} = clickReader(e)
            setCurrentTimeFraction(fraction, {event: e})
            setDivFocus(divRef)
        }
    }, [clickReader, setCurrentTimeFraction, divRef])

    return handler
}


const useMouseupHandler = (divRef: DivRef, isPanning: () => boolean, handleClick: (e: React.MouseEvent) => void, clearPan: () => void) => {
    const handler = useCallback((e: React.MouseEvent) => {
        if (divExists(divRef)) {
            if (!isPanning()) {
                handleClick(e)
            }
            clearPan()
        }
    }, [divRef, isPanning, handleClick, clearPan])

    return handler
}


const useMouseMoveHandler = (divRef: DivRef, clickReader: ClickReader, startPan: (mouseX: number) => void, setPanUpdate: (state: PanUpdateProperties) => void) => {
    const handler = useCallback((e: React.MouseEvent) => {
        if (!divExists(divRef)) {
            return
        }
        const {mouseX} = clickReader(e)
        startPan(mouseX)
        setPanUpdate({mouseX})
    }, [divRef, clickReader, startPan, setPanUpdate])

    return handler
}


const useTimeScrollEventHandlers = (leftMargin: number, panelWidth: number, panelWidthSeconds: number, divRef: React.MutableRefObject<HTMLDivElement | null>) => {
    const { panTimeseriesSelectionDeltaT } = useTimeRange()
    const { setCurrentTimeFraction } = useTimeseriesSelection()

    const clickReader = useClickReader(leftMargin, panelWidth)
    const secondsPerPixel = useMemo(() => panelWidthSeconds / panelWidth, [panelWidthSeconds, panelWidth])
    const {setPanUpdate, resetAnchor, startPan, clearPan, isPanning} = useTimeScrollPan(divRef, secondsPerPixel, panTimeseriesSelectionDeltaT)
    const handleClick = useClickHandler(divRef, clickReader, setCurrentTimeFraction)
    const handleMouseDown = useMousedownHandler(divRef, clickReader, resetAnchor)
    const handleMouseUp = useMouseupHandler(divRef, isPanning, handleClick, clearPan)
    const handleMouseMove = useMouseMoveHandler(divRef, clickReader, startPan, setPanUpdate)
    const handleMouseLeave = useMouseLeaveHandler(divRef, clearPan)

    const handlers = useMemo(() => {
        return {handleMouseUp, handleMouseMove, handleMouseDown, handleMouseLeave}
    }, [handleMouseUp, handleMouseMove, handleMouseDown, handleMouseLeave])

    return handlers
}

export default useTimeScrollEventHandlers