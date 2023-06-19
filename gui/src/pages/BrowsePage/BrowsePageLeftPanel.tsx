import { FunctionComponent } from "react"
import useRoute from "../../useRoute"
import FileBrowser from "./FileBrowser/FileBrowser"

type Props = {
    width: number
    height: number
    folder: string
    onOpenTab: (tabName: string) => void
}

const BrowsePageLeftPanel: FunctionComponent<Props> = ({width, height, folder, onOpenTab}) => {
    const {setRoute} = useRoute()
    return (
        <FileBrowser
            width={width}
            height={height}
            currentFolderPath={folder}
            setCurrentFolderPath={folderPath => setRoute({page: 'browse', folder: folderPath})}
            onOpenTab={onOpenTab}
        />
    )
}

export default BrowsePageLeftPanel