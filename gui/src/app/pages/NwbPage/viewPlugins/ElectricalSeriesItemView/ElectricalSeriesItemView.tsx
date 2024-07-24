import { FunctionComponent, useMemo, useState } from "react"
import NeurodataTimeSeriesItemView from "../TimeSeries/NeurodataTimeSeriesItemView"
import TabWidget from "../../../../TabWidget/TabWidget"
import EphysSummaryItemView from "../Ephys/EphysSummaryItemView"
import { checkUrlIsLocal } from "../viewPlugins"
import { useNwbFile } from "../../NwbFileContext"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}

const ElectricalSeriesItemView: FunctionComponent<Props> = ({width, height, path, condensed}) => {
    const [currentTabId, setCurrentTabId] = useState<string>('traces')
    const nwbFile = useNwbFile()
    const showDendroView = useMemo(() => {
        return ((nwbFile) && (!checkUrlIsLocal({nwbUrl: nwbFile.getUrls()[0]})) && (!condensed))
    }, [nwbFile, condensed])
    const tabs = useMemo(() => {
        const tabs = [{
            label: 'Traces',
            id: 'traces',
            closeable: false
        }]
        if (showDendroView) {
            tabs.push({
                label: 'Dendro Summary',
                id: 'dendro-summary',
                closeable: false
            })
        }
        return tabs
    }, [showDendroView])
    return (
        <TabWidget
            width={width}
            height={height}
            tabs={tabs}
            currentTabId={currentTabId}
            setCurrentTabId={setCurrentTabId}
            onCloseTab={() => {}}
        >
            <NeurodataTimeSeriesItemView
                width={width}
                height={height}
                path={path}
                condensed={condensed}
            />
            {!condensed && <EphysSummaryItemView
                width={width}
                height={height}
                path={path}
                condensed={false}
            />}
        </TabWidget>
    )
}

export default ElectricalSeriesItemView