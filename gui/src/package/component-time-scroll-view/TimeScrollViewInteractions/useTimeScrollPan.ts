import React, { useCallback, useMemo, useRef } from 'react';
import { DebounceThrottleResolver, DebounceThrottleUpdater } from '../../util-rate-limiters';
import { useThrottler } from '../../util-rate-limiters/rateLimiters';

export type PanState = {
    anchorX?: number
    pannedX?: number
    panning?: boolean
}

export type PanStateRef = React.MutableRefObject<PanState>

export type PanUpdateProperties = {
    mouseX: number
}

type PanUpdateRefs = {
    divRef: React.MutableRefObject<HTMLDivElement | null>
    panStateRef: PanStateRef
}

// Convenience alias for long fn signature
type PanFn = (deltaT: number) => void
type PanResolverProps = {
    secondsPerPixel: number,
    panTimeseriesSelectionDeltaT: PanFn
}


const setNextPanUpdate: DebounceThrottleUpdater<PanUpdateProperties, PanUpdateRefs> = (refs, state) => {
    const { panStateRef } = refs
    const { mouseX } = state
    if (!panStateRef.current.panning) return false
    if (panStateRef.current.pannedX === mouseX) return false
    panStateRef.current.pannedX = mouseX

    return true
}


const panResolver: DebounceThrottleResolver<PanUpdateRefs, PanResolverProps> = (refs, props) => {
    const {panStateRef} = refs
    const {secondsPerPixel, panTimeseriesSelectionDeltaT} = props
    if (panStateRef === undefined || panStateRef?.current === undefined) return
    const deltaPx = (panStateRef.current.anchorX ?? 0) - (panStateRef.current.pannedX ?? 0)
    if (deltaPx === 0) return

    panStateRef.current.anchorX = panStateRef.current.pannedX
    panTimeseriesSelectionDeltaT && panTimeseriesSelectionDeltaT(secondsPerPixel * deltaPx)
    // Don't reset panning state by default here--user may still be holding the mouse button
}


export const useThrottledPan = (refs: PanUpdateRefs, secondsPerPixel: number, panTimeseriesSelectionDeltaT: PanFn) => {
    const resolverProps = useMemo(() => {return {secondsPerPixel, panTimeseriesSelectionDeltaT}}, [secondsPerPixel, panTimeseriesSelectionDeltaT])
    const panHandler = useThrottler(setNextPanUpdate, panResolver, refs, resolverProps, 50)
    return panHandler
}


const resetPanStateAnchor = (ref: PanStateRef, mouseX: number, cancelPendingPan: () => void) => {
    ref.current.anchorX = mouseX
    ref.current.panning = false
    ref.current.pannedX = undefined
    cancelPendingPan()
}


const startPanning = (ref: PanStateRef, mouseX: number) => {
    const deltaX = mouseX - (ref.current.anchorX ?? mouseX)
    if (Math.abs(deltaX) > 5) {
        ref.current.panning = true
    }
}


const clearPanState = (ref: PanStateRef, cancelPendingPan: () => void) => {
    ref.current = {}
    cancelPendingPan()
}


const isPanning = (ref: PanStateRef) => {
    return ref.current?.panning ?? false
}


const useTimeScrollPan = (divRef: React.MutableRefObject<HTMLDivElement | null>, secondsPerPixel: number, panTimeseriesSelectionDeltaT: PanFn) => {
    const panStateRef = useRef<PanState>({})
    const refs = useMemo(() => {return {divRef, panStateRef}}, [divRef, panStateRef])
    const { throttler, cancelThrottled } = useThrottledPan(refs, secondsPerPixel, panTimeseriesSelectionDeltaT)
    const resetAnchor = useCallback((mouseX: number) => {
        resetPanStateAnchor(panStateRef, mouseX, cancelThrottled)
    }, [panStateRef, cancelThrottled])
    const startPan = useCallback((mouseX: number) => startPanning(panStateRef, mouseX), [panStateRef])
    const clearPan = useCallback(() => clearPanState(panStateRef, cancelThrottled), [panStateRef, cancelThrottled])
    const panning = useCallback(() => isPanning(panStateRef), [panStateRef])

    return {
        setPanUpdate: throttler,
        resetAnchor,
        startPan,
        clearPan,
        isPanning: panning
    }
}

export default useTimeScrollPan
