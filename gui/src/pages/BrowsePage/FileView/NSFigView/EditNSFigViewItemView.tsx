import { FunctionComponent } from "react";
import { NSFigViewItem } from "./NSFigViewData";

type Props = {
    view: NSFigViewItem
    path: string
    width: number
    height: number
}

const EditNSFigViewItemView: FunctionComponent<Props> = ({view, path, width, height}) => {
    const c1 = <div><span style={{fontWeight: 'bold'}}>{view.name}</span> ({view.type})</div>
    if (view.type === 'TimeseriesGraph') {
        return (
            <div>
                {c1}
                <div>data: {view.data}</div>
                <div>annotation: {view.annotation}</div>
            </div>
        )
    }
    else if (view.type === 'TimeseriesGraph2') {
        return (
            <div>
                {c1}
                <div>data: {view.data}</div>
                <div>annotation: {view.annotation}</div>
            </div>
        )
    }
    else if (view.type === 'AnnotatedVideo') {
        return (
            <div>
                {c1}
                <div>data: {view.data}</div>
                <div>annotation: {view.annotation}</div>
            </div>
        )
    }
    else if (view.type === 'AudioSpectrogram') {
        return (
            <div>
                {c1}
                <div>data: {view.data}</div>
                <div>annotation: {view.annotation}</div>
            </div>
        )
    }
    else if (view.type === 'RasterPlot') {
        return (
            <div>
                {c1}
                <div>data: {view.data}</div>
            </div>
        )
    }
    else {
        return (
            <div>
                {c1}
            </div>
        )
    }
}

export default EditNSFigViewItemView