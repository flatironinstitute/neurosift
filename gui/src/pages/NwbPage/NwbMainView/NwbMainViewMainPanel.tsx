import { ToggleButton, ToggleButtonGroup } from "@mui/material"
import { FunctionComponent, useState } from "react"
import BrowseNwbView from "../BrowseNwbView/BrowseNwbView"
import { RemoteH5File } from "../RemoteH5File/RemoteH5File"
import DefaultNwbFileView from "./DefaultNwbFileView"

type Props = {
    width: number
    height: number
    nwbFile: RemoteH5File
}

type ViewMode = 'default' | 'raw'

const NwbMainViewMainPanel: FunctionComponent<Props> = ({ width, height, nwbFile }) => {
    const topBarHeight = 50

    const [viewMode, setViewMode] = useState<ViewMode>('default')

    return (
        <div style={{ position: 'absolute', width, height }}>
            <div style={{ position: 'absolute', width, height: topBarHeight, paddingLeft: 10}}>
                <ViewModeToggleButton viewMode={viewMode} setViewMode={setViewMode} />
            </div>
            {/* Important to use undefined rather than visible so that the hidden value is respected for parent components */}
            <div style={{ position: 'absolute', width, height: height - topBarHeight, top: topBarHeight, visibility: viewMode === 'default' ? undefined : 'hidden' }}>
                <DefaultNwbFileView
                    width={width}
                    height={height - topBarHeight}
                    nwbFile={nwbFile}
                />
            </div>
            <div style={{ position: 'absolute', width, height: height - topBarHeight, top: topBarHeight, visibility: viewMode === 'raw' ? undefined : 'hidden' }}>
                <BrowseNwbView
                    width={width}
                    height={height - topBarHeight}
                />
            </div>
        </div>
    )
}

type ViewModeToggleButtonProps = {
    viewMode: ViewMode
    setViewMode: (mode: ViewMode) => void
}

const ViewModeToggleButton: FunctionComponent<ViewModeToggleButtonProps> = ({ viewMode, setViewMode }) => {
    const handleChange = (
        event: React.MouseEvent<HTMLElement>,
        newViewMode: string
    ) => {
        setViewMode(newViewMode as ViewMode)
    }
    return (
        <ToggleButtonGroup
            color="primary"
            value={viewMode}
            exclusive
            onChange={handleChange}
            aria-label="Platform"
        >
            <ToggleButton value="default">Default</ToggleButton>
            <ToggleButton value="raw">Raw</ToggleButton>
        </ToggleButtonGroup>
    )
}

export default NwbMainViewMainPanel