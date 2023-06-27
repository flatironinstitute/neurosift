import { FunctionComponent, useEffect, useState } from "react";
import Splitter from "../../../../components/Splitter";
import { AutocorrelogramsView, AutocorrelogramsViewData } from "../../../../package/view-autocorrelograms";
import { AverageWaveformsView, AverageWaveformsViewData } from "../../../../package/view-average-waveforms";
import { useRtcshare } from "../../../../rtcshare/useRtcshare";
import TabWidget from "../../../../TabWidget/TabWidget";
import AutocorrelogramsFileView, { useAutocorrelogramsViewData } from "../AutocorrelogramsFileView";
import AverageWaveformsFileView, { useAverageWaveformsViewData } from "../AverageWaveformsFileView";
import SelectedUnitTab from "./SelectedUnitTab";
import UnitBoxesTab from "./UnitBoxesTab";
import UnitsTable from "./UnitsTable";

type Props = {
    width: number
    height: number
    path: string
}

export type DigestInfo = {
    channel_ids: (number | string)[]
    sampling_frequency: number
    num_frames: number
    unit_ids: (number | string)[]
    unit_pair_ids: ([number | string, number | string])[]
    channel_locations: number[][]
}

const useDigestInfo = (path: string) => {
    const [digestInfo, setDigestInfo] = useState<DigestInfo | undefined>(undefined)

    const {client: rtcshareClient} = useRtcshare()

    useEffect(() => {
        if (!rtcshareClient) return
        let canceled = false
        ; (async () => {
            const p = `${path}/spike_sorting_digest_info.json`
            const buf = await rtcshareClient.readFile(p)
            // decode array buffer
            const txt = new TextDecoder().decode(buf)
            if (canceled) return
            const digestInfo = JSON.parse(txt)
            setDigestInfo(digestInfo)
        })()
        return () => { canceled = true }
    }, [path, rtcshareClient])

    return digestInfo
}

const tabs = [
    {
        id: 'summary',
        label: 'Summary',
        closeable: false
    },
    {
        id: 'unit-boxes',
        label: 'Unit boxes',
        closeable: false
    },
    {
        id: 'selected-unit',
        label: 'Selected unit',
        closeable: false
    }
]

const SpikeSortingDigestView: FunctionComponent<Props> = ({width, height, path}) => {
    const digestInfo = useDigestInfo(path)
    const [currentTabId, setCurrentTabId] = useState<string>('summary')
    const autocorrelogramsViewData = useAutocorrelogramsViewData(`${path}/autocorrelograms.ns-acg`)
    const averageWaveformsViewData = useAverageWaveformsViewData(`${path}/average_waveforms.ns-awf`)

    if (!digestInfo) {
        return <div>Loading digest info...</div>
    }

    const initialUnitsTableWidth = 60

    return (
        <Splitter
            width={width}
            height={height}
            direction="horizontal"
            initialPosition={initialUnitsTableWidth}
        >
            <UnitsTable
                unitIds={digestInfo.unit_ids}
            />
            <TabWidget
                width={0}
                height={0}
                tabs={tabs}
                currentTabId={currentTabId}
                setCurrentTabId={setCurrentTabId}
                onCloseTab={() => {}}
            >
                <SummaryTab
                    width={0}
                    height={0}
                    path={path}
                    autocorrelogramsViewData={autocorrelogramsViewData}
                    averageWaveformsViewData={averageWaveformsViewData}
                />
                <UnitBoxesTab
                    width={0}
                    height={0}
                    path={path}
                    digestInfo={digestInfo}
                    autocorrelogramsViewData={autocorrelogramsViewData}
                    averageWaveformsViewData={averageWaveformsViewData}
                />
                <SelectedUnitTab
                    width={0}
                    height={0}
                    path={path}
                    digestInfo={digestInfo}
                    autocorrelogramsViewData={autocorrelogramsViewData}
                    averageWaveformsViewData={averageWaveformsViewData}
                />
            </TabWidget>
        </Splitter>
    )
}

type SummaryTabProps = {
    width: number
    height: number
    path: string
    autocorrelogramsViewData?: AutocorrelogramsViewData
    averageWaveformsViewData?: AverageWaveformsViewData
}

const SummaryTab: FunctionComponent<SummaryTabProps> = ({width, height, path, autocorrelogramsViewData, averageWaveformsViewData}) => {
    return (
        <Splitter
            direction="vertical"
            width={width}
            height={height}
            initialPosition={(height) / 2}
        >
            {
                autocorrelogramsViewData ? <AutocorrelogramsView
                    width={0}
                    height={0}
                    data={autocorrelogramsViewData}
                /> : <span />
            }
            {
                averageWaveformsViewData ? <AverageWaveformsView
                    width={0}
                    height={0}
                    data={averageWaveformsViewData}
                /> : <span />
            }
        </Splitter>
    )
}

export default SpikeSortingDigestView