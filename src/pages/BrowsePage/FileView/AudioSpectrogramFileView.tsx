import { FunctionComponent } from "react";
import SpectrogramWidget from "../../../spectrogram/SpectrogramWidget";

type Props = {
    width: number
    height: number
    filePath: string
}

const AudioSpectrogramFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    return (
        <SpectrogramWidget
            width={width}
            height={height}
            spectrogramUri={`rtcshare://${filePath}`}
        />
    )
}

export default AudioSpectrogramFileView