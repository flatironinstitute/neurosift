import { Vec2, Vec4 } from "./types"
import { dragSelectReducer } from "./dragSelectReducer"
import { useCallback, useReducer } from "react"

const useDragSelectLayer = (width: number, height: number, handleSelectRect: (r: Vec4, o: {ctrlKey: boolean, shiftKey: boolean}) => void, handleClickPoint: (p: Vec2, o: {ctrlKey: boolean, shiftKey: boolean}) => void) => {
    const [dragSelectState, dragSelectStateDispatch] = useReducer(dragSelectReducer, {})
    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (e.buttons) { // this condition is important for the case where we leave the window and then come back without the button pressed
            dragSelectStateDispatch({
                type: 'DRAG_MOUSE_MOVE',
                point: getEventPoint(e)
            })
        }
    }, [])

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        dragSelectStateDispatch({
            type: 'DRAG_MOUSE_DOWN',
            point: getEventPoint(e)
        })
    }, [])

    const onMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if ((dragSelectState.isActive) && (dragSelectState.dragRect)) {
            handleSelectRect(dragSelectState.dragRect, {ctrlKey: e.ctrlKey, shiftKey: e.shiftKey})
        }
        if (!dragSelectState.isActive) {
            handleClickPoint(getEventPoint(e), {ctrlKey: e.ctrlKey, shiftKey: e.shiftKey})
        }
        dragSelectStateDispatch({
            type: 'DRAG_MOUSE_UP',
            point: getEventPoint(e)
        })
    }, [dragSelectState, handleSelectRect, handleClickPoint])

    const onMouseLeave = useCallback((e: React.MouseEvent) => {
        dragSelectStateDispatch({
            type: 'DRAG_MOUSE_LEAVE'
        })
    }, [])

    const paintDragSelectLayer = useCallback((ctxt: CanvasRenderingContext2D, props: any) => {
        ctxt.clearRect(0, 0, width, height)
        if ((dragSelectState.isActive) && (dragSelectState.dragRect)) {
            const rect = dragSelectState.dragRect
            ctxt.fillStyle = defaultDragStyle
            ctxt.fillRect(rect[0], rect[1], rect[2], rect[3])
        }
    }, [width, height, dragSelectState])

    return {
        dragSelectState,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave,
        paintDragSelectLayer
    }
}

const defaultDragStyle = 'rgba(196, 196, 196, 0.5)'

const getEventPoint = (e: React.MouseEvent) => {
    const boundingRect = e.currentTarget.getBoundingClientRect()
    const point: Vec2 = [e.clientX - boundingRect.x, e.clientY - boundingRect.y]
    return point
}

export default useDragSelectLayer