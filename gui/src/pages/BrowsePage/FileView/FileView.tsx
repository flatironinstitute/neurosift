import { FunctionComponent } from "react";
import AudioSpectrogramFileView from "./AudioSpectrogramFileView";
import AutocorrelogramsFileView from "./AutocorrelogramsFileView";
import NSFigFileView from "./NSFigFileView";
import PositionDecodeFieldFileView from "./PositionDecodeFieldFileView";
import PynappleSessionFileView from "./PynappleSessionFileView";
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
    let view
    if ((filePath.endsWith('.avi')) || (filePath.endsWith('.mp4'))) {
        view = (
            <VideoFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.py')) {
        view = (
            <ScriptFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-tsg')) {
        // TimeseriesGraph
        view = (
            <TimeseriesGraphFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-van')) {
        // Video annotation
        view = (
            <VideoAnnotationFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-pdf')) {
        // Position decode field
        view = (
            <PositionDecodeFieldFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-spt')) {
        // Spike trains
        view = (
            <SpikeTrainsFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-asp')) {
        // Audio spectrogram
        view = (
            <AudioSpectrogramFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-tsa')) {
        // timeseries annotation
        view = (
            <TimeseriesAnnotationFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-fig')) {
        view = (
            <NSFigFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.pynapple')) {
        // pynapple session
        view = (
            <PynappleSessionFileView width={width} height={height} filePath={filePath} />
        )
    }
    else if (filePath.endsWith('.ns-acg')) {
        view = (
            <AutocorrelogramsFileView width={width} height={height} filePath={filePath} />
        )
    }
    else {
        view = (
            <div style={{position: 'absolute', width, height, background: 'white'}}>
                <div style={{position: 'absolute', left: 20, top: 20, fontSize: 20}}>{filePath}</div>
            </div>
        )
    }
    return view
}

export default FileView