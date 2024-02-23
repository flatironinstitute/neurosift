import { Vec2, Vec4 } from "./types"

export type DragSelectState = {
    isActive?: boolean,  // whether we are in an active dragging state
    dragAnchor?: Vec2, // The position where dragging began (pixels)
    dragPosition?: Vec2, // The position where dragging ends (pixels)
    dragRect?: Vec4,   // The drag rect. [0],[1] are the upper left corner, [2], [3] are width & height.
}

export type DragSelectAction = {
    type: 'DRAG_MOUSE_DOWN'
    point: Vec2
} | {
    type: 'DRAG_MOUSE_UP'
    point: Vec2
} | {
    type: 'DRAG_MOUSE_LEAVE'
} | {
    type: 'DRAG_MOUSE_MOVE'
    point: Vec2
}

export const dragSelectReducer = (state: DragSelectState, action: DragSelectAction): DragSelectState => {
    if (action.type === 'DRAG_MOUSE_DOWN') {
        const { point } = action
        return {
            ...state,
            isActive: false,
            dragAnchor: point,
            dragPosition: point,
            dragRect: undefined
        }
    } else if (action.type === 'DRAG_MOUSE_UP') {
        return {
            ...state,
            isActive: false,
            dragAnchor: undefined,
            dragPosition: undefined,
            dragRect: undefined
        }
    } else if (action.type === 'DRAG_MOUSE_MOVE') {
        if (!state.dragAnchor) return state
        const newDragRect = [
            Math.min(state.dragAnchor[0], action.point[0]),
            Math.min(state.dragAnchor[1], action.point[1]),
            Math.abs(state.dragAnchor[0] - action.point[0]),
            Math.abs(state.dragAnchor[1] - action.point[1])
        ]
        if (state.isActive) {
            return {
                ...state,
                dragRect: newDragRect,
                dragPosition: [action.point[0], action.point[1]]
            }
        }
        else if ((newDragRect[2] >= 10) || (newDragRect[3] >= 10)) {
            return {
                ...state,
                isActive: true,
                dragRect: newDragRect,
                dragPosition: [action.point[0], action.point[1]]
            }
        }
        else {
            return state
        }
    } else if (action.type === 'DRAG_MOUSE_LEAVE') {
        return {
            ...state
            // isActive: false,
            // dragAnchor: undefined,
            // dragRect: undefined
        }
    } else {
        console.log(`Error: unrecognized verb in dragSelectReducer.`)
        return state
    }
}

export default dragSelectReducer