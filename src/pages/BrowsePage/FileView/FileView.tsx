import { FunctionComponent } from "react";
import NSFigFileView from "./NSFigFileView";
import ScriptFileView from "./ScriptFileView";
import TimeseriesGraphFileView from "./TimeseriesGraphFileView";
import VideoFileView from "./VideoFileView";

type Props = {
    width: number
    height: number
    filePath: string
}

const FileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    if ((filePath.endsWith('.avi')) || (filePath.endsWith('.mp4'))) {
        return (
            <VideoFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.py')) {
        return (
            <ScriptFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.tsg')) {
        // TimeseriesGraph
        return (
            <TimeseriesGraphFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.nsfig')) {
        return (
            <NSFigFileView width={width} height={height} filePath={filePath} />
        )
    }
    return (
        <div style={{position: 'absolute', width, height, background: 'white'}}>
            <div style={{position: 'absolute', left: 20, top: 20, fontSize: 20}}>{filePath}</div>
        </div>
    )
}

export default FileView