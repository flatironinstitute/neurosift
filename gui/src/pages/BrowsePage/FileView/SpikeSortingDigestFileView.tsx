import { FunctionComponent } from "react";
import SpikeSortingDigestView from "./SpikeSortingDigestView/SpikeSortingDigestView";

type Props = {
    width: number
    height: number
    filePath: string
}

const SpikeSortingDigestFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    return (
        <SpikeSortingDigestView
            width={width}
            height={height}
            path={filePath}
        />
    )
}

export default SpikeSortingDigestFileView