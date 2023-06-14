import { FunctionComponent } from "react";
import BoxLayoutView from "./BoxLayoutView";
import { NSFigViewData } from "./NSFigViewData";
import SplitterLayoutView from "./SplitterLayoutView";

type Props = {
    data: NSFigViewData
    path: string
    width: number
    height: number
}

const NSFigView: FunctionComponent<Props> = ({data, path, width, height}) => {
    const {layout, views} = data
    if (layout.type === 'Box') {
        return (
            <BoxLayoutView
                layout={layout}
                views={views}
                path={path}
                width={width}
                height={height}
            />
        )
    }
    else if (layout.type === 'Splitter') {
        return (
            <SplitterLayoutView
                layout={layout}
                views={views}
                path={path}
                width={width}
                height={height}
            />
        )
    }
    else {
        return <div>Unsupported layout type {(layout as any).type}</div>
    }
}

export default NSFigView