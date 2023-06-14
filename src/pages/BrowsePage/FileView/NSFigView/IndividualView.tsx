import { FunctionComponent } from "react";
import TimeseriesGraphFileView from "../TimeseriesGraphFileView";
import VideoFileView from "../VideoFileView";
import { NSFigViewItem } from "./NSFigViewData";

type Props = {
    view: NSFigViewItem
    path: string
    width: number
    height: number
}

const IndividualView: FunctionComponent<Props> = ({view, path, width, height}) => {
    if (view.type === 'TimeseriesGraph') {
        return (
            <TimeseriesGraphFileView
                filePath={join(path, view.data)}
                width={width}
                height={height}
            />
        )
    }
    else if (view.type === 'AnnotatedVideo') {
        return (
            <VideoFileView
                filePath={join(path, view.data)}
                width={width}
                height={height}
            />
        )
    }
    return <div>{(view as any).type} {path} {width} {height}</div>
}

const join = (a: string, b: string) => {
    if (b.startsWith('./')) b = b.slice(2)
    if (!a) return b
    if (a.endsWith('/')) return a + b
    else return a + '/' + b
}

export default IndividualView