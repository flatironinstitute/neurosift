import { FunctionComponent } from "react";
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
    return (
        <div style={{position: 'absolute', width, height, background: 'white'}}>
            <div style={{position: 'absolute', left: 20, top: 20, fontSize: 20}}>{filePath}</div>
        </div>
    )
}

export default FileView