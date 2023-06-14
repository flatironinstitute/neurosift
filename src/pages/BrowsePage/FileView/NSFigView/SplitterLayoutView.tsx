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
    const itemPositions: number[] = useMemo(() => {
        let itemSizes: number[]
        if (direction === 'horizontal') {
            itemSizes = computeSizes(width, [item1, item2], [])
        }
        else {
            // not used until vertical is implemented
            itemSizes = computeSizes(height, [item1, item2], [])
        }
        const ret: number[] = []
        let x = 0
        for (const s of itemSizes) {
            ret.push(x)
            x += s
        }
        return ret
    }, [direction, item1, item2, width, height])
    const initialSplitterPosition: number = itemPositions[1]

    // Todo, we need to enforce min/max sizes
    return (
        <Splitter
            width={width}
            height={height}
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
    )
}

export default SplitterLayoutView