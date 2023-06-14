import { FunctionComponent } from "react";
import Splitter from "../../components/Splitter";
import BrowsePageLeftPanel from "./BrowsePageLeftPanel";
import BrowsePageMainPanel from "./BrowsePageMainPanel";
import { useOpenTabs } from "./OpenTabsContext";

type Props = {
    width: number
    height: number
    folder: string
}

const BrowsePage: FunctionComponent<Props> = ({width, height, folder}) => {
    const {openTab} = useOpenTabs()
    const initialPosition = Math.max(250, Math.min(1000, width / 3))
    return (
        <Splitter
            width={width}
            height={height}
            initialPosition={initialPosition}
            direction='horizontal'
        >
            <BrowsePageLeftPanel width={0} height={0} folder={folder} onOpenFile={fileName => openTab(`file:${fileName}`)} />
            <BrowsePageMainPanel width={0} height={0} />
        </Splitter>
    )
}

export default BrowsePage