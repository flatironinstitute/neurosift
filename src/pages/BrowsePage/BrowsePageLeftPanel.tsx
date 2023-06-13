import { FunctionComponent } from "react"
import useRoute from "../../useRoute"
import FileBrowser from "./FileBrowser/FileBrowser"

type Props = {
    width: number
    height: number
    folder: string
    onOpenFile: (filePath: string) => void
}

const BrowsePageLeftPanel: FunctionComponent<Props> = ({width, height, folder, onOpenFile}) => {
    const {setRoute} = useRoute()
    return (
        <FileBrowser
            currentFolderPath={folder}
            setCurrentFolderPath={folderPath => setRoute({page: 'browse', folder: folderPath})}
            onOpenFile={onOpenFile}
        />
    )
}

export default BrowsePageLeftPanel