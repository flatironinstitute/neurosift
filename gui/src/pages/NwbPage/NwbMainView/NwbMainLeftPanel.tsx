import { FunctionComponent, useMemo } from "react"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { RemoteH5File } from "../RemoteH5File/RemoteH5File"
import { useDatasetData, useGroup } from "./NwbMainView"
import SelectedNeurodataItemsWidget from "./SelectedNeurodataItemsWidget"

type Props = {
    width: number
    height: number
    nwbFile: RemoteH5File
}

const labelMap: {name: string, newName: string}[] = [
    {name: 'session_id', newName: 'Session ID'},
    {name: 'experimenter', newName: 'Experimenter'},
    {name: 'lab', newName: 'Lab'},
    {name: 'institution', newName: 'Institution'},
    {name: 'related_publications', newName: 'Related publications'},
    {name: 'experiment_description', newName: 'Experiment description'},
    {name: 'session_description', newName: 'Session description'},
    {name: 'identifier', newName: 'Identifier'},
    {name: 'session_start_time', newName: 'Session start'},
    {name: 'timestamps_reference_time', newName: 'Timestamps ref.'},
    {name: 'file_create_date', newName: 'File creation'},
]

const NwbMainLeftPanel: FunctionComponent<Props> = ({width, height, nwbFile}) => {
    const rootGroup = useGroup(nwbFile, '/')
    const generalGroup = useGroup(nwbFile, '/general')

    const items = useMemo(() => {
        const ret: {name: string, path: string}[] = []
        rootGroup?.datasets.forEach(ds => {
            const newName = labelMap.find(x => (x.name === ds.name))?.newName || ds.name
            ret.push({name: newName || ds.name, path: ds.path})
        })
        generalGroup?.datasets.forEach(ds => {
            const newName = labelMap.find(x => (x.name === ds.name))?.newName || ds.name
            ret.push({name: newName || ds.name, path: ds.path})
        })
        return ret
    }, [rootGroup, generalGroup])

    const itemsSorted = useMemo(() => {
        const ret = [...items]
        ret.sort((a, b) => {
            const ind1 = labelMap.findIndex(x => (x.newName === a.name))
            const ind2 = labelMap.findIndex(x => (x.newName === b.name))
            if ((ind1 >= 0)) {
                if (ind2 < 0) return -1
                return ind1 - ind2
            }
            if ((ind2 >= 0)) {
                if (ind1 < 0) return 1
                return ind1 - ind2
            }
            return a.name.localeCompare(b.name)
        })
        return ret
    }, [items])

    const bottomBarHeight = 27
    return (
        <div className="LeftPanel" style={{position: 'absolute', width, height}}>
            <div className="MainArea" style={{position: 'absolute', width, height: height - bottomBarHeight, overflowY: 'auto'}}>
                <table
                    className="nwb-table"
                >
                    <tbody>
                        {
                            itemsSorted.map(item => (
                                <tr key={item.name}>
                                    <td>{item.name}</td>
                                    <td><DatasetDataView nwbFile={nwbFile} path={item.path} /></td>
                                </tr>
                            ))
                        }
                        <tr>
                            <td>NWB version</td>
                            <td>{rootGroup?.attrs['nwb_version'] || 'Loading...'}</td>
                        </tr>
                    </tbody>
                </table>
                <hr />
                <SelectedNeurodataItemsWidget />
            </div>
        </div>
    )
}

type DatasetDataViewProps = {
    nwbFile: RemoteH5File
    path: string
}

const DatasetDataView: FunctionComponent<DatasetDataViewProps> = ({nwbFile, path}) => {
    const {data: datasetData} = useDatasetData(nwbFile, path)
    if (!datasetData) return <span>Loading...</span>
    return <span>{datasetData}</span>
}

export default NwbMainLeftPanel