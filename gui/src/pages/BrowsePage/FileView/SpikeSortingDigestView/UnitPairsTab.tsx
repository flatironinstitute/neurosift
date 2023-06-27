import { FunctionComponent, useEffect, useState } from "react"
import deserializeReturnValue from "../../../../deserializeReturnValue"
import { CrossCorrelogramsView, CrossCorrelogramsViewData, isCrossCorrelogramsViewData } from "../../../../package/view-cross-correlograms"
import { useRtcshare } from "../../../../rtcshare/useRtcshare"
import { DigestInfo } from "./SpikeSortingDigestView"

type UnitBoxesTabProps = {
    width: number
    height: number
    path: string
    digestInfo: DigestInfo
}

export const useCrossCorrelogramsViewData = (filePath: string) => {
    const {client} = useRtcshare()
    const [text, setText] = useState<string | undefined>(undefined)
    const [viewData, setViewData] = useState<CrossCorrelogramsViewData | undefined>(undefined)

    useEffect(() => {
        let canceled = false
        if (!client) return
        ; (async () => {
            const buf = await client.readFile(filePath)
            if (canceled) return
            // array buffer to text
            const decoder = new TextDecoder('utf-8')
            const txt = decoder.decode(buf)
            setText(txt)
        })()
        return () => {canceled = true}
    }, [client, filePath])

    useEffect(() => {
        let canceled = false
        if (!text) return
        ; (async () => {
            const d = await deserializeReturnValue(JSON.parse(text))
            if (canceled) return
            if (!isCrossCorrelogramsViewData(d)) {
                console.warn(d)
                console.warn('Invalid cross correlograms view data')
                return
            }
            setViewData(d)
        })()
        return () => {canceled = true}
    }, [text])

    return viewData
}


const UnitPairsTab: FunctionComponent<UnitBoxesTabProps> = ({width, digestInfo, height, path}) => {
    // const {selectedUnitIds} = useSelectedUnitIds()
    // const selectedUnitIdsList = useMemo(() => {
    //     if (!selectedUnitIds) return undefined
    //     const unitIds = Array.from(selectedUnitIds)
    //     return unitIds
    // }, [selectedUnitIds])

    const viewData = useCrossCorrelogramsViewData(`${path}/cross_correlograms.ns-ccg`)

    if (!viewData) return <div>...</div>
    return (
        <CrossCorrelogramsView
            width={width}
            height={height}
            data={viewData}
        />
    )
}

export default UnitPairsTab