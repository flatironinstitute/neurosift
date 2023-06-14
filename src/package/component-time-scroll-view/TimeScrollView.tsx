import { Splitter } from '@figurl/core-views';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { DefaultToolbarWidth } from '../component-time-scroll-view';
import { useAnnotations } from '../context-annotations';
import { useTimeRange } from '../context-timeseries-selection';
import { TimeseriesLayoutOpts } from '../types/TimeseriesLayoutOpts';
import { convert1dDataSeries, use1dScalingMatrix } from '../util-point-projection';
import { ViewToolbar } from '../ViewToolbar';
import { useTimeTicks } from './TimeAxisTicks';
import useActionToolbar, { OptionalToolbarActions } from './TimeScrollViewActionsToolbar';
import { HighlightIntervalSet } from './TimeScrollViewData';
import { Margins, useDefinedMargins, useFocusTimeInPixels, usePanelDimensions } from './TimeScrollViewDimensions';
import useTimeScrollEventHandlers, { suppressWheelScroll } from './TimeScrollViewInteractions/TimeScrollViewEventHandlers';
import useTimeScrollZoom from './TimeScrollViewInteractions/useTimeScrollZoom';
import { filterAndProjectHighlightSpans } from './TimeScrollViewSpans';
import TSVAnnotationLayer from './TSVAnnotationLayer';
import TSVAxesLayer from './TSVAxesLayer';
import TSVCursorLayer from './TSVCursorLayer';
import TSVHighlightLayer from './TSVHighlightLayer';
import TSVMainLayer from './TSVMainLayer';
import { TickSet } from './YAxisTicks';


export type TimeScrollViewPanel<T extends {[key: string]: any}> = {
    key: string,
    label: string,
    props: T,
    paint: (context: CanvasRenderingContext2D, props: T) =>  void
}


type TimeScrollViewProps<T extends {[key: string]: any}> = {
    panels: TimeScrollViewPanel<T>[]
    panelSpacing: number
    margins?: Margins
    width: number
    height: number
    selectedPanelKeys?: Set<number | string>
    highlightSpans?: HighlightIntervalSet[]
    optionalActions?: OptionalToolbarActions
    timeseriesLayoutOpts?: TimeseriesLayoutOpts
    yTickSet?: TickSet
    showYMinMaxLabels?: boolean
    gridlineOpts?: {hideX: boolean, hideY: boolean}
    onKeyDown?: (e: React.KeyboardEvent) => void
}

const emptyPanelSelection = new Set<number | string>()

// Unfortunately, you can't nest generic type declarations here: so while this is properly a
// FunctionComponent<TimeScrollViewPanel<T>>, there just isn't a way to do that syntactically
// while still using arrow notation. (It *might* be possible with explicit function notation, but
// I haven't tried too hard.)
// I felt it was more important to stress that the props are of the same type that the paint function
// expects to consume, since the code will successfully infer that this is a FunctionComponent that
// takes a TimeScrollViewProps.
const TimeScrollView = <T extends {[key: string]: any}> (props: TimeScrollViewProps<T>) => {
    const { margins, panels, panelSpacing, selectedPanelKeys, width, height, optionalActions, timeseriesLayoutOpts, highlightSpans, yTickSet, showYMinMaxLabels, gridlineOpts, onKeyDown } = props
    const { hideToolbar, hideTimeAxis } = timeseriesLayoutOpts || {}
    const divRef = useRef<HTMLDivElement | null>(null)
    
    const { visibleStartTimeSec, visibleEndTimeSec, zoomTimeseriesSelection, panTimeseriesSelection } = useTimeRange()
    const timeRange = useMemo(() => (
        [visibleStartTimeSec, visibleEndTimeSec] as [number, number]
    ), [visibleStartTimeSec, visibleEndTimeSec])
    const panelWidthSeconds = (visibleEndTimeSec ?? 0) - (visibleStartTimeSec ?? 0)

    const definedMargins = useDefinedMargins(margins)
    const toolbarWidth = hideToolbar ? 0 : DefaultToolbarWidth
    const {panelHeight, panelWidth} = usePanelDimensions(width - toolbarWidth, height, panels.length, panelSpacing, definedMargins)
    const perPanelOffset = panelHeight + panelSpacing

    const timeToPixelMatrix = use1dScalingMatrix(panelWidth, visibleStartTimeSec, visibleEndTimeSec, definedMargins.left)
    const {currentTimeInPixels, currentTimeIntervalInPixels} = useFocusTimeInPixels(timeToPixelMatrix)

    const timeTicks = useTimeTicks(visibleStartTimeSec, visibleEndTimeSec, timeToPixelMatrix)

    const pixelHighlightSpans = filterAndProjectHighlightSpans(highlightSpans, visibleStartTimeSec, visibleEndTimeSec, timeToPixelMatrix)

    const timeControlActions = useActionToolbar(optionalActions ?? {})
    useEffect(() => suppressWheelScroll(divRef), [divRef])
    const handleWheel = useTimeScrollZoom(divRef, zoomTimeseriesSelection)
    const {handleMouseDown, handleMouseUp, handleMouseLeave, handleMouseMove} = useTimeScrollEventHandlers(definedMargins.left, panelWidth, panelWidthSeconds, divRef)

    // TODO: It'd be nice to show some sort of visual indication of how much zoom has been requested,

    const effectiveWidth = useMemo(() => width - toolbarWidth, [width, toolbarWidth])

    const style = useMemo(() => {
        return {width: effectiveWidth, height, position: 'relative'} as any as React.CSSProperties},
        [effectiveWidth, height])

    const axesLayer = useMemo(() => {
        return (
            <TSVAxesLayer<T>
                width={effectiveWidth}
                height={height}
                panels={panels}
                panelHeight={panelHeight}
                perPanelOffset={perPanelOffset}
                selectedPanelKeys={selectedPanelKeys || emptyPanelSelection}
                timeRange={timeRange}
                timeTicks={timeTicks}
                yTickSet={yTickSet}
                gridlineOpts={gridlineOpts}
                margins={definedMargins}
                hideTimeAxis={hideTimeAxis}
                showYMinMaxLabels={showYMinMaxLabels}
            />)
    }, [effectiveWidth, height, panels, panelHeight, perPanelOffset, selectedPanelKeys,
        timeRange, timeTicks, yTickSet, definedMargins, hideTimeAxis, showYMinMaxLabels, gridlineOpts])

    const mainLayer = useMemo(() => {
        return (
            <TSVMainLayer<T>
                width={effectiveWidth}
                height={height}
                panels={panels}
                panelHeight={panelHeight}
                perPanelOffset={perPanelOffset}
                margins={definedMargins}
            />
        )
    }, [effectiveWidth, height, panels, panelHeight, perPanelOffset, definedMargins])

    const highlightLayer = useMemo(() => {
        return (
            pixelHighlightSpans.length > 0
            ? <TSVHighlightLayer
                    width={effectiveWidth}
                    height={height}
                    highlightSpans={pixelHighlightSpans}
                    margins={definedMargins}
              />
            : <div />
        )
    }, [effectiveWidth, height, pixelHighlightSpans, definedMargins])

    const cursorLayer = useMemo(() => {
        return (
            <TSVCursorLayer
                width={effectiveWidth}
                height={height}
                timeRange={timeRange}
                margins={definedMargins}
                currentTimePixels={currentTimeInPixels}
                currentTimeIntervalPixels={currentTimeIntervalInPixels}
            />
        )
    }, [effectiveWidth, height, timeRange, definedMargins, currentTimeInPixels, currentTimeIntervalInPixels])

    const {annotations} = useAnnotations()
    const annotationLayer = useMemo(() => {
        const annotationsInRange = annotations.filter(x => (
            x.type === 'timepoint' ? (
                (timeRange[0] <= x.timeSec) && (x.timeSec <= timeRange[1])
            ) : (
                (timeRange[0] <= x.timeIntervalSec[1]) && (x.timeIntervalSec[0] <= timeRange[1])
            )
        ))
        const pixelTimepointAnnotations = annotationsInRange.filter(x => (x.type === 'timepoint')).map(x => {
            if (x.type !== 'timepoint') throw Error('Unexpected')
            return {
                pixelTime: convert1dDataSeries([x.timeSec], timeToPixelMatrix)[0],
                annotation: x
            }
        })
        const pixelTimeIntervalAnnotations = annotationsInRange.filter(x => (x.type === 'time-interval')).map(x => {
            if (x.type !== 'time-interval') throw Error('Unexpected')
            return {
                pixelTimeInterval: convert1dDataSeries(x.timeIntervalSec, timeToPixelMatrix) as [number, number],
                annotation: x
            }
        })
        return (
            <TSVAnnotationLayer
                width={effectiveWidth}
                height={height}
                timeRange={timeRange}
                pixelTimepointAnnotations={pixelTimepointAnnotations}
                pixelTimeIntervalAnnotations={pixelTimeIntervalAnnotations}
                margins={definedMargins}
            />
        )
    }, [annotations, definedMargins, effectiveWidth, height, timeRange, timeToPixelMatrix])

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

    const content = useMemo(() => {
        return (
            <div
                style={style}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseOut={handleMouseLeave}
                tabIndex={0}
                onKeyDown={handleKeyDown}
            >
                {annotationLayer}
                {axesLayer}
                {mainLayer}
                {highlightLayer}
                {cursorLayer}
            </div>
        )
    }, [style, handleWheel, handleMouseDown, handleMouseUp, handleMouseMove, handleMouseLeave,
        annotationLayer, axesLayer, mainLayer, highlightLayer, cursorLayer, handleKeyDown])
    
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
                width={toolbarWidth}
                height={height}
                customActions={timeControlActions}
            />
            {content}
        </Splitter>
    )
}

export default TimeScrollView