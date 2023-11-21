import { FunctionComponent, useContext, useEffect, useMemo, useReducer, useState } from "react"
import { FaEye } from "react-icons/fa"
import SmallIconButton from "../../../components/SmallIconButton"
import { neurodataTypeInheritsFrom } from "../neurodataSpec"
import { NwbFileContext } from "../NwbFileContext"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"

type Props = {
    width: number
    height: number
}

type TAItem = {
    path: string
    neurodataType: string
    startTime: number
    endTime: number
}

type TimeseriesAlignmentState = {
    timeseries: TAItem[]
}

type TimeseriesAlignmentAction = {
    type: 'addItem'
    item: TAItem
}

const timeseriesAlignmentReducer = (state: TimeseriesAlignmentState, action: TimeseriesAlignmentAction) => {
    switch (action.type) {
        case 'addItem':
            return {
                ...state,
                timeseries: [...state.timeseries, action.item]
            }
        default:
            return state
    }
}

const TimeseriesAlignmentView: FunctionComponent<Props> = ({width, height}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined')

    const [timeseriesAlignment, timeseriesAlignmentDispatch] = useReducer(timeseriesAlignmentReducer, {timeseries: []})
    const [loadingMessage, setLoadingMessage] = useState('')

    useEffect(() => {
        setLoadingMessage('Loading...')
        let canceled = false
        const handleGroup = async (path: string) => {
            setLoadingMessage(`Loading ${path}...`)
            const gr = await nwbFile.getGroup(path)
            if (canceled) return
            const nt = gr.attrs['neurodata_type']
            if (neurodataTypeInheritsFrom(nt, 'TimeSeries')) {
                try {
                    const timestampsSubdataset = gr.datasets.find(ds => (ds.name === 'timestamps'))
                    const startingTimeSubdataset = gr.datasets.find(ds => (ds.name === 'starting_time'))
                    const dataSubdataset = gr.datasets.find(ds => (ds.name === 'data'))
                    if (timestampsSubdataset) {
                        const v1 = await nwbFile.getDatasetData(timestampsSubdataset.path, {slice: [[0, 1]]})
                        if (canceled) return
                        const N = timestampsSubdataset.shape[0]
                        const v2 = await nwbFile.getDatasetData(timestampsSubdataset.path, {slice: [[N - 1, N]]})
                        if (canceled) return
                        const startTime = v1[0]
                        const endTime = v2[0]
                        timeseriesAlignmentDispatch({
                            type: 'addItem',
                            item: {
                                path: gr.path,
                                neurodataType: nt,
                                startTime,
                                endTime
                            }
                        })
                    }
                    else if ((startingTimeSubdataset) && (dataSubdataset)) {
                        const v = await nwbFile.getDatasetData(startingTimeSubdataset.path, {})
                        if (canceled) return
                        const startTime = v as any as number
                        const rate = startingTimeSubdataset.attrs['rate']
                        const endTime = startTime + (dataSubdataset.shape[0] - 1) / rate
                        timeseriesAlignmentDispatch({
                            type: 'addItem',
                            item: {
                                path: gr.path,
                                neurodataType: nt,
                                startTime,
                                endTime
                            }
                        })
                    }
                }
                catch(err) {
                    console.warn('Problem processing group', gr.path)
                    console.warn(err)
                }
            }
            else {
                for (const sg of gr.subgroups) {
                    await handleGroup(sg.path)
                    if (canceled) return
                }
            }
        }
        handleGroup('/').then(() => {
            setLoadingMessage('')
        })
        return () => {canceled = true}
    }, [nwbFile])

    const {startTime, endTime} = useMemo(() => {
        let startTime: number | undefined = undefined
        let endTime: number | undefined = undefined
        for (const item of timeseriesAlignment.timeseries) {
            if ((startTime === undefined) || (item.startTime < startTime)) startTime = item.startTime
            if ((endTime === undefined) || (item.endTime > endTime)) endTime = item.endTime
        }
        return {startTime, endTime}
    }, [timeseriesAlignment])

    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            <div>{loadingMessage}&nbsp;</div>
            {
                timeseriesAlignment.timeseries.map(item => (
                    <TAItemView key={item.path} item={item} startTime={startTime} endTime={endTime} width={width} />
                ))
            }
        </div>
    )
}

type TAItemViewProps = {
    item: TAItem
    startTime?: number
    endTime?: number
    width: number
}

const getColorForNeurodataType = (nt: string) => {
    switch (nt) {
        case 'ElectricalSeries':
            return 'blue'
        case 'TwoPhotonSeries':
            return 'green'
        case 'OnePhotonSeries':
            return 'green'
        case 'SpatialSeries':
            return 'red'
        case 'ImageSeries':
            return 'orange'
        case 'RoiResponseSeries':
            return 'purple'
        case 'PatchClampSeries':
            return 'brown'
        case 'IndexSeries':
            return 'black'
        case 'AbstractFeatureSeries':
            return 'yellow'
        case 'AnnotationSeries':
            return 'cyan'
        case 'IntervalSeries':
            return 'magenta'
        case 'DecompositionSeries':
            return 'lime'
        case 'OptogeneticSeries':
            return 'pink'
        default:
            return 'gray'
    }
}

const TAItemView: FunctionComponent<TAItemViewProps> = ({item, startTime, endTime, width}) => {
    const h1 = 18
    const h2 = 7
    const h3 = 15
    const p1 = (item.startTime - (startTime || 0)) / ((endTime || 1) - (startTime || 0)) * width
    const p2 = (item.endTime - (startTime || 0)) / ((endTime || 1) - (startTime || 0)) * width
    const color = getColorForNeurodataType(item.neurodataType)
    const {openTab} = useNwbOpenTabs()
    return (
        <div style={{position: 'relative', width, height: h1 + h2 + h3}}>
            <div style={{position: 'absolute', width, height: h1, color, fontSize: 14}}>
                <SmallIconButton
                    icon={<FaEye />}
                    onClick={() => {
                        openTab(`neurodata-item:${item.path}|${item.neurodataType}`)
                    }}
                />&nbsp;
                {item.path} ({item.neurodataType}) [{item.startTime.toFixed(1)} - {item.endTime.toFixed(1)} sec]
            </div>
            <div style={{position: 'absolute', left: p1, width: p2 - p1, height: h2, top: h1, background: color}} />
        </div>
    )
}

export default TimeseriesAlignmentView