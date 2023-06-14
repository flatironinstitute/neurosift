import { Splitter } from '@figurl/core-views';
import React, { FunctionComponent, useCallback, useEffect, useMemo, useRef } from 'react';
import { DefaultToolbarWidth, useYAxisTicks } from '../component-time-scroll-view';
import useActionToolbar from '../component-time-scroll-view/TimeScrollViewActionsToolbar';
import useTimeScrollEventHandlers, { suppressWheelScroll } from '../component-time-scroll-view/TimeScrollViewInteractions/TimeScrollViewEventHandlers';
import useTimeScrollZoom from '../component-time-scroll-view/TimeScrollViewInteractions/useTimeScrollZoom';
import { TickSet } from '../component-time-scroll-view/YAxisTicks';
import { useTimeRange, useTimeseriesSelection } from '../context-timeseries-selection';
import { ViewToolbar } from '../ViewToolbar';
import { useTimeTicks } from './timeTicks';
import TSV2AxesLayer from './TSV2AxesLayer';
import TSV2CursorLayer from './TSV2CursorLayer';

type Props = {
    width: number
    height: number
    onCanvasElement: (elmt: HTMLCanvasElement) => void
    gridlineOpts?: {hideX: boolean, hideY: boolean}
    onKeyDown?: (e: React.KeyboardEvent) => void
    onMouseDown?: (e: React.MouseEvent) => void
    onMouseUp?: (e: React.MouseEvent) => void
    onMouseMove?: (e: React.MouseEvent) => void
    onMouseOut?: (e: React.MouseEvent) => void
    hideToolbar?: boolean
    yAxisInfo?: {
        showTicks: boolean
        yMin?: number
        yMax?: number
    }
}

const defaultMargins = {
    left: 30,
    right: 20,
    top: 20,
    bottom: 30
}

export const useTimeScrollView2 = ({width, height, hideToolbar}: {width: number, height: number, hideToolbar?: boolean}) => {
    const margins = useMemo(() => (
        defaultMargins
    ), [])
    const toolbarWidth = hideToolbar ? 0 : DefaultToolbarWidth
    const canvasWidth = width - toolbarWidth
    const canvasHeight = height
    return {
        margins,
        canvasWidth,
        canvasHeight,
        toolbarWidth
    }
}

const TimeScrollView2: FunctionComponent<Props> = ({width, height, onCanvasElement, gridlineOpts, onKeyDown, onMouseDown, onMouseMove, onMouseOut, onMouseUp, hideToolbar, yAxisInfo}) => {
    const { visibleStartTimeSec, visibleEndTimeSec, zoomTimeseriesSelection, panTimeseriesSelection } = useTimeRange()
    const {currentTime, currentTimeInterval } = useTimeseriesSelection()
    const timeRange = useMemo(() => (
        [visibleStartTimeSec, visibleEndTimeSec] as [number, number]
    ), [visibleStartTimeSec, visibleEndTimeSec])

    const {margins, canvasWidth, canvasHeight, toolbarWidth} = useTimeScrollView2({width, height, hideToolbar})

    const timeToPixel = useMemo(() => {
        if ((visibleStartTimeSec === undefined) || (visibleEndTimeSec === undefined)) return () => (0)
        if (visibleEndTimeSec <= visibleStartTimeSec) return () => (0)
        return (t: number) => (
            margins.left + (t - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec) * (canvasWidth - margins.left - margins.right)
        )
    }, [canvasWidth, visibleStartTimeSec, visibleEndTimeSec, margins])

    const yToPixel = useMemo(() => {
        const y0 = yAxisInfo?.yMin || 0
        const y1 = yAxisInfo?.yMax || 0
        if (y1 <= y0) return () => (0)
        return (y: number) => (
            canvasHeight - margins.bottom - (y - y0) / (y1 - y0) * (canvasHeight - margins.top - margins.bottom)
        )
    }, [yAxisInfo, canvasHeight, margins])

    const timeTicks = useTimeTicks(canvasWidth, visibleStartTimeSec, visibleEndTimeSec, timeToPixel)

    const yTicks = useYAxisTicks({datamin: yAxisInfo?.yMin || 0, datamax: yAxisInfo?.yMax || 0, pixelHeight: canvasHeight - margins.left - margins.right})
    const yTickSet: TickSet = useMemo(() => (
        {
            datamin: yTicks.datamin,
            datamax: yTicks.datamax,
            ticks: yTicks.ticks.map(t => ({...t, pixelValue: yToPixel(t.dataValue)}))
        }
    ), [yTicks, yToPixel])

    const axesLayer = useMemo(() => {
        return (
            <TSV2AxesLayer
                width={canvasWidth}
                height={canvasHeight}
                timeRange={timeRange}
                margins={margins}
                timeTicks={timeTicks}
                yTickSet={yAxisInfo?.showTicks ? yTickSet : undefined}
                gridlineOpts={gridlineOpts}
            />)
    }, [gridlineOpts, canvasWidth, canvasHeight, timeRange, margins, timeTicks, yAxisInfo?.showTicks, yTickSet])

    const currentTimePixels = useMemo(() => (currentTime !== undefined ? timeToPixel(currentTime) : undefined), [currentTime, timeToPixel])
    const currentTimeIntervalPixels = useMemo(() => (currentTimeInterval !== undefined ? [timeToPixel(currentTimeInterval[0]), timeToPixel(currentTimeInterval[1])] as [number, number] : undefined), [currentTimeInterval, timeToPixel])

    const cursorLayer = useMemo(() => {
        return (
            <TSV2CursorLayer
                width={canvasWidth}
                height={canvasHeight}
                timeRange={timeRange}
                margins={margins}
                currentTimePixels={currentTimePixels}
                currentTimeIntervalPixels={currentTimeIntervalPixels}
            />
        )
    }, [canvasWidth, canvasHeight, timeRange, margins, currentTimePixels, currentTimeIntervalPixels])

    const divRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => suppressWheelScroll(divRef), [divRef])
    const panelWidthSeconds = (visibleEndTimeSec ?? 0) - (visibleStartTimeSec ?? 0)
    const handleWheel = useTimeScrollZoom(divRef, zoomTimeseriesSelection)
    const {handleMouseDown, handleMouseUp, handleMouseLeave, handleMouseMove} = useTimeScrollEventHandlers(margins.left, canvasWidth - margins.left - margins.right, panelWidthSeconds, divRef)

    const handleKeyDown: React.KeyboardEventHandler = useCallback((e) => {
        if (e.key === '=') {
            zoomTimeseriesSelection('in')
        }
        else if (e.key === '-') {
            zoomTimeseriesSelection('out')
        }
        else if (e.key === 'ArrowRight') {
            panTimeseriesSelection('forward')
        }
        else if (e.key === 'ArrowLeft') {
            panTimeseriesSelection('back')
        }
        onKeyDown && onKeyDown(e)
    }, [onKeyDown, zoomTimeseriesSelection, panTimeseriesSelection])

    const handleMouseDown2: React.MouseEventHandler = useCallback((e) => {
        if ((!e.shiftKey) && (!e.ctrlKey) && (!e.altKey)) {
            handleMouseDown(e)
        }
        else {
            onMouseDown && onMouseDown(e)
        }
    }, [handleMouseDown, onMouseDown])

    const handleMouseUp2: React.MouseEventHandler = useCallback((e) => {
        if ((!e.shiftKey) && (!e.ctrlKey) && (!e.altKey)) {
            handleMouseUp(e)
        }
        else {
            onMouseUp && onMouseUp(e)
        }
    }, [handleMouseUp, onMouseUp])

    const handleMouseMove2: React.MouseEventHandler = useCallback((e) => {
        if ((!e.shiftKey) && (!e.ctrlKey) && (!e.altKey)) {
            handleMouseMove(e)
        }
        onMouseMove && onMouseMove(e)
    }, [handleMouseMove, onMouseMove])

    const handleMouseOut2: React.MouseEventHandler = useCallback((e) => {
        if ((!e.shiftKey) && (!e.ctrlKey) && (!e.altKey)) {
            handleMouseLeave(e)
        }
        onMouseOut && onMouseOut(e)
    }, [handleMouseLeave, onMouseOut])

    const content = useMemo(() => {
        return (
            <div
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    width: canvasWidth,
                    height: canvasHeight
                }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown2}
                onMouseUp={handleMouseUp2}
                onMouseMove={handleMouseMove2}
                onMouseOut={handleMouseOut2}
                tabIndex={0}
                onKeyDown={handleKeyDown}
            >
                {axesLayer}
                <canvas
                    style={{position: 'absolute', width: canvasWidth, height: canvasHeight}}
                    ref={onCanvasElement}
                    width={canvasWidth}
                    height={canvasHeight}
                />
                {cursorLayer}
            </div>
        )
    }, [onCanvasElement, axesLayer, cursorLayer, canvasWidth, canvasHeight, handleKeyDown, handleWheel, handleMouseDown2, handleMouseUp2, handleMouseMove2, handleMouseOut2])
    
    const timeControlActions = useActionToolbar()

    if (hideToolbar) {
        return (
            <div ref={divRef}>
                {content}
            </div>
        )
    }

    return (
        <Splitter
            ref={divRef}
            width={width}
            height={height}
            initialPosition={toolbarWidth}
            adjustable={false}
        >
            <ViewToolbar
                width={0}
                height={0}
                customActions={timeControlActions}
            />
            {content}
        </Splitter>
    )
}

export default TimeScrollView2