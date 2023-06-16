import { FunctionComponent } from "react";
import SpectrogramWidget from "../../../spectrogram/SpectrogramWidget";

type Props = {
    width: number
    height: number
    filePath: string
    annotationFilePath?: string
}

const AudioSpectrogramFileView: FunctionComponent<Props> = ({width, height, filePath, annotationFilePath}) => {
    return (
        <SpectrogramWidget
            width={width}
            height={height}
            spectrogramUri={`rtcshare://${filePath}`}
            annotationFilePath={annotationFilePath}
        />
    )
}

export default AudioSpectrogramFileView