import { NSFigLayout, NSFigLayoutItem, NSFigViewItem } from "./NSFigViewData";
import React, { FunctionComponent, useMemo, useReducer } from "react"
import { CropSquare, ExpandMore } from "@mui/icons-material";
import LayoutItemView from "./LayoutItemView";

type Props = {
    layout: NSFigLayout & {type: 'Box'}
    views: NSFigViewItem[]
    path: string
    width: number
    height: number
}

type ItemPosition = {
    left: number,
    top: number,
    width: number,
    height: number,
    title?: string,
    collapsible?: boolean
}

const menuBarHeight = 40

export const computeSizes = (
    totalSize: number | undefined,  // undefined means we're using a scrollbar
    items: NSFigLayoutItem[],
    collapsedItems: number[]
) => {
    const adjustedItemProperties = items.map((x, i) => {
        if (collapsedItems.includes(i)) {
            return {...x, minSize: 0, maxSize: 0, stretch: 1}
        }
        else return x
    }, [])

    const effectiveMinSize = (x: {minSize?: number, maxSize?: number, stretch?: number, collapsible?: boolean}) => {
        if (x.collapsible) return (x.minSize || 0) + menuBarHeight
        else return x.minSize || 0
    }

    const effectiveMaxSize = (x: {minSize?: number, maxSize?: number, stretch?: number, collapsible?: boolean}) => {
        if (x.maxSize === undefined) return undefined
        if (x.collapsible) return x.maxSize + menuBarHeight
        else return x.maxSize || 0
    }

    const ret: number[] = []
    let remainingSize = totalSize || 0
    for (const x of adjustedItemProperties) {
        ret.push(effectiveMinSize(x) || 0)
        remainingSize -= effectiveMinSize(x) || 0
    }
    if (totalSize !== undefined) {
        while (remainingSize > 1e-3) {
            let totalStretch = 0
            for (const x of adjustedItemProperties) {
                totalStretch += x.stretch ? x.stretch : 1
            }
            if (totalStretch === 0) break
            const remainingSize0 = remainingSize
            let somethingChanged = false
            for (let i = 0; i < adjustedItemProperties.length; i++) {
                const s = ret[i]
                const str = adjustedItemProperties[i].stretch
                let newS = s + remainingSize0 * (str ? str : 1) / (totalStretch || 1)
                if (adjustedItemProperties[i].maxSize !== undefined) {
                    newS = Math.min(newS, effectiveMaxSize(adjustedItemProperties[i]) || 0)
                }
                if (newS > s) {
                    ret[i] = newS
                    remainingSize -= (newS - s)
                    somethingChanged = true
                }
            }
            if (!somethingChanged) break
        }
    }
    return ret
}

type CollapsedItems = number[]

type CollapsedItemsAction = {
    type: 'collapse'
    index: number
} | {
    type: 'expand'
    index: number
} | {
    type: 'toggle'
    index: number
}

const collapsedItemsReducer = (state: CollapsedItems, action: CollapsedItemsAction) => {
    if (action.type === 'collapse') {
        return state.includes(action.index) ? state : [...state, action.index].sort()
    }
    else if (action.type === 'expand') {
        return state.filter(a => (a !== action.index))
    }
    else if (action.type === 'toggle') {
        return state.includes(action.index) ? state.filter(a => (a !== action.index)) : [...state, action.index].sort()
    }
    else return state
}

const BoxLayoutView: FunctionComponent<Props> = ({layout, views, path, width, height}) => {
    // for testing collapsible
    // for (let x of (layoutItem.itemProperties || [])) {
    //     x.collapsible = true
    // }

    const {editNSFigMode} = layout
    const extraVMargin = editNSFigMode ? 15 : 0
    const extraHMargin = editNSFigMode ? 15 : 0

    const [collapsedItems, collapsedItemsDispatch] = useReducer(collapsedItemsReducer, [])

    const {scrollbar, items, showTitles, direction} = layout
    const itemPositions: ItemPosition[] = useMemo(() => {
        if (direction === 'horizontal') {
            const ret: ItemPosition[] = []
            const itemWidths = computeSizes(!scrollbar ? width - extraHMargin : undefined, items, collapsedItems)
            let x = extraHMargin
            for (let i=0; i<items.length; i++) {
                ret.push({
                    left: x,
                    top: extraVMargin,
                    width: itemWidths[i],
                    height: height - extraVMargin,
                    title: items[i].title
                })
                x += itemWidths[i]
            }
            return ret
        }
        else {
            const ret: ItemPosition[] = []
            const itemHeights = computeSizes(!scrollbar ? height : undefined, items, collapsedItems)
            let y = extraVMargin
            for (let i=0; i<items.length; i++) {
                ret.push({
                    left: extraHMargin,
                    top: y,
                    width: width - extraHMargin,
                    height: itemHeights[i],
                    title: items[i].title,
                    collapsible: items[i].collapsible
                })
                y += itemHeights[i]
            }
            return ret
        }
    }, [direction, items, width, height, scrollbar, collapsedItems, extraHMargin, extraVMargin])

    const divStyle: React.CSSProperties = useMemo(() => {
        const ret: React.CSSProperties = {
            position: 'absolute',
            left: 0,
            top: 0,
            width,
            height
        }
        if (scrollbar) {
            if (direction === 'horizontal') {
                ret.overflowX = 'auto'
                ret.overflowY = 'hidden'
            }
            else if (direction === 'vertical') {
                ret.overflowY = 'auto'
                ret.overflowX = 'hidden'
            }
        }
        else {
            ret.overflow = 'hidden'
        }
        return ret
    }, [scrollbar, width, height, direction])

    const editNSFigBoxPosition = useMemo(() => {
        if (!editNSFigMode) return undefined
        return {
            left: 0,
            top: 0,
            width,
            height: extraVMargin
        }
    }, [editNSFigMode, width, extraVMargin])

    const titleFontSize = direction === 'vertical' ? 25 : 20
    const titleDim = titleFontSize + 3
    return (
        <div style={divStyle}>
            {
                editNSFigMode && (
                    <div style={{position: 'absolute', ...editNSFigBoxPosition, backgroundColor: '#efe', color: 'darkblue', fontSize: 12}}>
                        Box ({layout.direction})
                    </div>
                )
            }
            {
                items.map((item, i) => {
                    const p = itemPositions[i]
                    let titleBox = {left: 0, top: 0, width: 0, height: 0}
                    let itemBox = {left: 0, top: 0, width: p.width, height: p.height}
                    let menuBox = {left: 0, top: 0, width: 0, height: 0}
                    if ((p.collapsible) && (direction === 'vertical')) {
                        menuBox = {left: titleDim, top: 0, width: p.width - titleDim, height: menuBarHeight}
                        itemBox = {left: 0, top: menuBarHeight, width: p.width, height: p.height - menuBarHeight}
                    }
                    if ((!collapsedItems.includes(i)) && (showTitles)) {
                        if (direction === 'horizontal') {
                            titleBox = {left: 0, top: 0, width: p.width, height: titleDim}
                            itemBox = {left: 0, top: titleDim, width: p.width, height: p.height - titleDim}
                        }
                        else if (direction === 'vertical') {
                            titleBox = {left: 0, top: 0, width: titleDim, height: p.height}
                            itemBox = {left: titleDim, top: p.collapsible ? menuBarHeight : 0, width: p.width - titleDim, height: p.collapsible ? p.height - menuBarHeight : p.height}
                        }
                    }
                    const itemView = (
                        <LayoutItemView
                            layoutItem={item}
                            views={views}
                            path={path}
                            width={itemBox.width}
                            height={itemBox.height}
                        />
                    )
                    const titleRotationStyle: React.CSSProperties = direction === 'horizontal' ? {} : {
                        writingMode: 'vertical-lr',
                        transform: 'rotate(-180deg)',
                    }
                    return (
                        <div className="BoxLayout" key={i} style={{position: 'absolute', left: p.left, top: p.top, width: p.width, height: p.height}}>
                            <div style={{position: 'absolute', textAlign: 'center', fontSize: titleFontSize, ...titleBox, ...titleRotationStyle, overflow: 'hidden'}}>
                                {p.title || ''}
                            </div>
                            <div style={{position: 'absolute', ...menuBox, overflow: 'hidden', float: 'right', display: 'flex'}}>
                                <div style={{position: 'absolute', right: 0}} onClick={() => {collapsedItemsDispatch({type: 'toggle', index: i})}}>
                                    {
                                        collapsedItems.includes(i) ? <CropSquare /> : <ExpandMore />
                                    }
                                    
                                </div>
                            </div>
                            <div style={{position: 'absolute', ...itemBox, overflow: 'hidden'}}>
                                {itemView}
                            </div>
                        </div>
                    )
                })
            }
        </div>
    )
}

export default BoxLayoutView