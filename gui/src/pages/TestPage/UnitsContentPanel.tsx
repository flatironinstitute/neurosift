import { FunctionComponent, useEffect, useMemo, useState } from "react"
import './nwb-table.css'
import { NwbFileGroup } from "./NwbView"

type Props = {
    group: NwbFileGroup
}

const useArray = (group: NwbFileGroup, name: string) => {
    const [array, setArray] = useState<number[] | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const x = await group.loadArray(name)
            if (canceled) return
            setArray(x as number[])
        }
        load()
        return () => {canceled = true}
    }, [group, name])
    return array
}

const UnitsContentPanel: FunctionComponent<Props> = ({group}) => {
    const unitIds = useArray(group, 'id')
    const firingRates = useArray(group, 'avg_firing_rate')
    const isiViolations = useArray(group, 'isi_violation')
    const probeIndices = useArray(group, 'probe_index')
    const regions = useArray(group, 'region')
    const spikeTimesIndices = useArray(group, 'spike_times_index')
    const numSpikes = useMemo(() => {
        if (!spikeTimesIndices) return undefined
        return spikeTimesIndices.map((ind, i) => {
            if (i === 0) {
                return ind
            }
            else {
                return ind - spikeTimesIndices[i - 1]
            }
        })
    }, [spikeTimesIndices])
    const xLocations = useArray(group, 'x')
    const yLocations = useArray(group, 'y')
    const zLocations = useArray(group, 'z')

    if (!unitIds) return <div>Loading...</div>
    return (
        <div style={{position: 'relative', height: 300, overflowY: 'auto'}}>
            <table className="nwb-table">
                <thead>
                    <tr>
                        <th>Unit</th>
                        <th>Firing rate (Hz)</th>
                        <th>ISI violation</th>
                        <th>Probe index</th>
                        <th>Region</th>
                        <th>Num. spikes</th>
                        <th>x / y / z</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        Array.from(unitIds).map((unitId, i) => (
                            <tr key={i}>
                                <td>{unitId}</td>
                                <td>{firingRates ? formatFiringRate(firingRates[i]) : '...'}</td>
                                <td>{isiViolations ? formatIsiViolation(isiViolations[i]) : '...'}</td>
                                <td>{probeIndices ? probeIndices[i] : '...'}</td>
                                <td>{regions ? regions[i] : '...'}</td>
                                <td>{numSpikes ? numSpikes[i] : '...'}</td>
                                <td>{xLocations && yLocations && zLocations ? `${xLocations[i].toFixed(0)} / ${yLocations[i].toFixed(0)} / ${zLocations[i].toFixed(0)}` : '...'}</td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
    )
}

const formatFiringRate = (x: number | undefined) => {
    if (x === undefined) return '.'
    return x.toFixed(2)
}

const formatIsiViolation = (x: number | undefined) => {
    if (x === undefined) return '.'
    return x.toFixed(2)
}

export default UnitsContentPanel