import { FunctionComponent } from "react";
import IndividualView from "./IndividualView";
import NSFigView from "./NSFigView";
import { NSFigLayoutItem, NSFigViewItem, NSFigViewData } from "./NSFigViewData";

type Props = {
    layoutItem: NSFigLayoutItem
    views: NSFigViewItem[]
    path: string
    width: number
    height: number
}

const LayoutItemView: FunctionComponent<Props> = ({layoutItem, views, path, width, height}) => {
    if (typeof(layoutItem.view) === 'string') {
        const view = views.find(v => (v.name === layoutItem.view))
        if (!view) {
            console.warn(`View not found: ${layoutItem.view}`)
            return <div></div>
        }
        return (
            <IndividualView
                view={view}
                path={path}
                width={width}
                height={height}
            />
        )
    }
    else {
        const viewData: NSFigViewData = {
            type: 'neurosift_figure',
            version: 'v1',
            layout: layoutItem.view,
            views: views
        }
        return (
            <NSFigView
                data={viewData}
                path={path}
                width={width}
                height={height}
            />
        )
    }
}

export default LayoutItemView