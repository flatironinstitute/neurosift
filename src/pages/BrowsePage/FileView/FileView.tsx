import { FunctionComponent } from "react";
import AudioSpectrogramFileView from "./AudioSpectrogramFileView";
import NSFigFileView from "./NSFigFileView";
import ScriptFileView from "./ScriptFileView";
import SpikeTrainsFileView from "./SpikeTrainsFileView";
import TimeseriesAnnotationFileView from "./TimeseriesAnnotationFileView";
import TimeseriesGraphFileView from "./TimeseriesGraphFileView";
import VideoAnnotationFileView from "./VideoAnnotationFileView";
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
    else if (filePath.endsWith('.ns-tsg')) {
        // TimeseriesGraph
        return (
            <TimeseriesGraphFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-van')) {
        // Video annotation
        return (
            <VideoAnnotationFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-spt')) {
        // Spike trains
        return (
            <SpikeTrainsFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-asp')) {
        // Audio spectrogram
        return (
            <AudioSpectrogramFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-tsa')) {
        // timeseries annotation
        return (
            <TimeseriesAnnotationFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-fig')) {
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