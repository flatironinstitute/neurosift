import { FunctionComponent, useContext, useEffect, useState } from "react"
import { NwbFileContext } from "../../NwbFileContext"
import { useDatasetData, useGroup } from "../../NwbMainView/NwbMainView"
import NwbTimeIntervalsWidget from "./NwbTimeIntervalsWidget"

type Props = {
    width: number
    height: number
    path: string
}

const NwbTimeIntervalsView: FunctionComponent<Props> = ({width, height, path}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')
    const group = useGroup(nwbFile, path)
    const {data: startTimeData} = useDatasetData(nwbFile, `${path}/start_time`)
    const {data: stopTimeData} = useDatasetData(nwbFile, `${path}/stop_time`)

    // auto detect label data
    const [labelData, setLabelData] = useState<string[] | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        setLabelData(undefined)
        const load = async () => {
            if (!group) return
            const colnames = await group.attrs['colnames'] || []
            const scores: {colname: string, score: number, values: string[]}[] = []
            for (const colname of colnames) {
                const d = await nwbFile.getDatasetData(`${path}/${colname}`, {})
                if (canceled) return
                try {
                    const values = Array.from(d) as any as string[]
                    const distinctValues = getDistinctValues(values)
                    if ((distinctValues.length > 1) && (distinctValues.length <= values.length / 4)) {
                        const score = distinctValues.length / values.length
                        scores.push({colname, score, values})
                    }
                }
                catch(err) {
                    console.warn(err)
                }
            }
            scores.sort((a, b) => (b.score - a.score))
            if (scores.length > 0) {
                setLabelData(scores[0].values)
            }
        }
        load()
        return () => { canceled = true }
    }, [group, nwbFile, path])

    if ((!startTimeData) || (!stopTimeData)) {
        return <div>loading data...</div>
    }

    return (
        <NwbTimeIntervalsWidget
            labels={labelData}
            startTimes={startTimeData}
            stopTimes={stopTimeData}
            width={width}
            height={height}
        />
    )
}

const getDistinctValues = (values: string[]) => {
    const ret = new Set<string>()
    for (const val of values) {
        ret.add(val)
    }
    return Array.from(ret).sort()
}

export default NwbTimeIntervalsView