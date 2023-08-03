import { FunctionComponent, useContext } from "react"
import { NwbFileContext } from "../../NwbFileContext"
import { useDataset } from "../../NwbMainView/NwbMainView"

type Props = {
    width: number
    height: number
    objectPath: string
    electricalSeriesOpts: ElectricalSeriesOpts
    setElectricalSeriesOpts: (opts: ElectricalSeriesOpts) => void
}

export type ElectricalSeriesOpts = {
    numVisibleChannels: number
    visibleStartChannel: number
    autoChannelSeparation: number | undefined
}

const ElectricalSeriesToolbar: FunctionComponent<Props> = ({width, height, objectPath, electricalSeriesOpts, setElectricalSeriesOpts}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    const dataDataset = useDataset(nwbFile, `${objectPath}/data`)
    const numChannels = dataDataset ? dataDataset.shape[1] : undefined
    return (
        <div style={{display: 'flex'}}>
            <NumVisibleChannelsSelector totalNumChannels={numChannels} value={electricalSeriesOpts.numVisibleChannels} setValue={numVisibleChannels => setElectricalSeriesOpts({...electricalSeriesOpts, numVisibleChannels})} />
            &nbsp;&nbsp;&nbsp;&nbsp;
            <VisibleStartChannelSelector totalNumChannels={numChannels} value={electricalSeriesOpts.visibleStartChannel} setValue={visibleStartChannel => setElectricalSeriesOpts({...electricalSeriesOpts, visibleStartChannel})} numVisibleChannels={electricalSeriesOpts.numVisibleChannels} />
            &nbsp;&nbsp;&nbsp;&nbsp;
            <AutoChannelSeparationSelector value={electricalSeriesOpts.autoChannelSeparation} setValue={autoChannelSeparation => setElectricalSeriesOpts({...electricalSeriesOpts, autoChannelSeparation})} />
        </div>
    )
}

type NumVisibleChannelsSelectorProps = {
    totalNumChannels?: number
    value: number
    setValue: (value: number) => void
}

const NumVisibleChannelsSelector: FunctionComponent<NumVisibleChannelsSelectorProps> = ({totalNumChannels, value, setValue}) => {
    const opts = [1, 2, 5, 10, 20, 30, 40, 50, 60, 70, 80, 100].filter(x => (!totalNumChannels) || (x <= totalNumChannels))
    
    if (!totalNumChannels) return <span />

    if ((totalNumChannels <= 50) && (!opts.includes(totalNumChannels))) {
        opts.push(totalNumChannels)
    }

    return (
        <div>
            <span># visible chans:</span>&nbsp;
            <select
                value={value}
                onChange={e => setValue(Number(e.target.value))}
            >
                {
                    opts.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))
                }
            </select>
        </div>
    )
}

type VisibleStartChannelSelectorProps = {
    totalNumChannels?: number
    value: number
    setValue: (value: number) => void
    numVisibleChannels: number
}

const VisibleStartChannelSelector: FunctionComponent<VisibleStartChannelSelectorProps> = ({totalNumChannels, value, setValue, numVisibleChannels}) => {
    if (!totalNumChannels) return <span />

    const range = [value, value + numVisibleChannels - 1]

    const snap = (x: number) => {
        if (x > totalNumChannels - numVisibleChannels) return totalNumChannels - numVisibleChannels
        if (x < 0) return 0
        return Math.floor(x / numVisibleChannels) * numVisibleChannels
    }

    const upArrow = (
        <span>
            <button
                disabled={range[0] <= 0}
                onClick={() => setValue(snap(value - numVisibleChannels))}
            >
                &#x25B2;
            </button>
        </span>
    )
    const downArrow = (
        <span>
            <button
                disabled={range[1] >= totalNumChannels - 1}
                onClick={() => setValue(snap(value + numVisibleChannels))}
            >
                &#x25BC;
            </button>
        </span>
    )

    return (
        <div>
            {upArrow}
            {downArrow}
            &nbsp;
            Viewing chans:
            &nbsp;
            {range[0]} - {range[1]}
            &nbsp;
            / {totalNumChannels}
        </div>
    )
}

type AutoChannelSeparationSelectorProps = {
    value: number | undefined
    setValue: (value: number | undefined) => void
}

const AutoChannelSeparationSelector: FunctionComponent<AutoChannelSeparationSelectorProps> = ({value, setValue}) => {
    const opts = [0.1, 0.2, 0.5, 1, 2, 4, 8]
    return (
        <div>
            <span>Chan. separation (a.u.):</span>&nbsp;
            <select
                value={value || ''}
                onChange={e => {
                    const val = Number(e.target.value)
                    setValue(val || undefined)
                }}
            >
                <option value={''}>None</option>
                {
                    opts.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))
                }
            </select>
        </div>
    )
}

export default ElectricalSeriesToolbar