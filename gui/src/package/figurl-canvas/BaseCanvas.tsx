import React, { useEffect, useRef } from 'react'

const baseCanvasStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0
}

const getDrawingContextFromCanvasRef = (canvasRef: React.MutableRefObject<HTMLCanvasElement | null>, ) => {
    if (!canvasRef || typeof canvasRef === 'function') return undefined
    const canvas = canvasRef.current
    const ctxt = canvas && canvas.getContext('2d')
    if (!ctxt) return undefined
    return ctxt
}

export type DrawFn<T> = (ctxt: CanvasRenderingContext2D, data: T) => void
/**
 * @param width Pixel width of canvas element.
 * @param height Pixel height of canvas element.
 * @param vOffsetPx Optional; pixels to reposition this canvas relative to the top of the parent element.
 * @param hOffsetPx Optional; pixels to reposition this canvas relative to the top of its parent element.
 * @param draw A function mapping a CanvasRenderingContext2D and a generically-typed backing-data object to void;
 * this will be called every time the backing data changes. The function should draw the input data.
 * @param drawData The data backing this Canvas view.
 */
export interface BaseCanvasProps<T> {
    width: number
    height: number
    vOffsetPx?: number
    hOffsetPx?: number
    draw: DrawFn<T>
    drawData: T
}

// the ', ' in the type parameter is so the parser knows it isn't
// an unclosed HTML tag. Can also use 'extends {}' for this, but this is more idiomatic.
/**
 * Creates a canvas object with a specified data type and draw function that draws that data type,
 * along with wiring to ensure the draw function is called every time the underlying data changes.
 * A graphical-element View in an MVC pattern.
 * 
 * @param props Dimensions and positioning parameters, plus typed drawing data and drawing function.
 * @returns A Canvas element which automatically redraws when its content data changes.
 */
const BaseCanvas = <T, > (props: BaseCanvasProps<T>) => {
    const { width, height, vOffsetPx, hOffsetPx, draw, drawData } = props
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const ctxt = getDrawingContextFromCanvasRef(canvasRef)
        ctxt && ctxt.canvas && draw(ctxt, drawData)
    }, [draw, canvasRef, drawData])

    const topPosition = vOffsetPx ? {top: vOffsetPx} : {}
    const leftPosition = hOffsetPx ? {left: hOffsetPx} : {}
    const style = {...baseCanvasStyle, ...topPosition, ...leftPosition }
    return <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={style}
    />
}

export default BaseCanvas
