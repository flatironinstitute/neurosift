import { e } from "mathjs";
import { FunctionComponent, useMemo } from "react";
import Splitter from "../../../../components/Splitter";
import { computeSizes } from "./BoxLayoutView";
import LayoutItemView from "./LayoutItemView";
import { NSFigLayout, NSFigViewItem } from "./NSFigViewData";

type Props = {
    layout: NSFigLayout & {type: 'Splitter'}
    views: NSFigViewItem[]
    path: string
    width: number
    height: number
}

const SplitterLayoutView: FunctionComponent<Props> = ({layout, views, path, width, height}) => {
    const {direction, item1, item2} = layout

    const {editNSFigMode} = layout
    const extraVMargin = editNSFigMode ? 15 : 0
    const extraHMargin = editNSFigMode ? 15 : 0

    const itemPositions: number[] = useMemo(() => {
        let itemSizes: number[]
        if (direction === 'horizontal') {
            itemSizes = computeSizes(width - extraHMargin, [item1, item2], [])
        }
        else {
            // not used until vertical is implemented
            itemSizes = computeSizes(height - extraVMargin, [item1, item2], [])
        }
        const ret: number[] = []
        let x = 0
        for (const s of itemSizes) {
            ret.push(x)
            x += s
        }
        return ret
    }, [direction, item1, item2, width, height, extraHMargin, extraVMargin])
    const initialSplitterPosition: number = itemPositions[1]

    const editNSFigBoxPosition = useMemo(() => {
        if (!editNSFigMode) return undefined
        return {
            left: 0,
            top: 0,
            width,
            height: extraVMargin
        }
    }, [editNSFigMode, width, extraVMargin])

    // Todo, we need to enforce min/max sizes
    return (
        <div style={{position: 'absolute', width: width, height: height, background: 'white'}}>
            {
                editNSFigMode && (
                    <div style={{position: 'absolute', ...editNSFigBoxPosition, backgroundColor: '#efe', color: 'darkblue', fontSize: 12}}>
                        Splitter ({layout.direction})
                    </div>
                )
            }
            <div style={{position: 'absolute', left: extraHMargin, top: extraVMargin, width: width - extraHMargin, height: height - extraVMargin}}>
                <Splitter
                    width={width - extraHMargin}
                    height={height - extraVMargin}
                    initialPosition={initialSplitterPosition}
                    direction={direction}
                >
                    {
                        [item1, item2].map((item, ii) => {
                            return (
                                <LayoutItemView
                                    key={ii}
                                    layoutItem={item}
                                    views={views}
                                    path={path}
                                    width={0} // filled in by splitter
                                    height={0} // filled in by splitter
                                />
                            )
                        })
                    }
                </Splitter>
            </div>
        </div>
    )
}

export default SplitterLayoutView