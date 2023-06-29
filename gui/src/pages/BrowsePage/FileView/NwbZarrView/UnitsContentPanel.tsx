import { FunctionComponent, useEffect, useMemo, useState } from "react"
import { ZarrClient } from "./NwbZarrView"
import './nwb-table.css'

type Props = {
    zarrClient: ZarrClient
}

const useArray = (zarrClient: ZarrClient, name: string) => {
    const [array, setArray] = useState<any[] | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const arrayClient = zarrClient.getArrayClient(name)
            const x = await arrayClient.getArray()
            if (canceled) return
            setArray(x as any[])
        }
        load()
        return () => {canceled = true}
    }, [zarrClient, name])
    return array
}

const UnitsContentPanel: FunctionComponent<Props> = ({zarrClient}) => {
    const unitIds = useArray(zarrClient, 'units/id')
    const firingRates = useArray(zarrClient, 'units/avg_firing_rate')
    const isiViolations = useArray(zarrClient, 'units/isi_violation')
    const probeIndices = useArray(zarrClient, 'units/probe_index')
    const regions = useArray(zarrClient, 'units/region')
    const spikeTimesIndices = useArray(zarrClient, 'units/spike_times_index')
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
    const xLocations = useArray(zarrClient, 'units/x')
    const yLocations = useArray(zarrClient, 'units/y')
    const zLocations = useArray(zarrClient, 'units/z')

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
                        unitIds.map((unitId, i) => (
                            <tr key={unitId}>
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