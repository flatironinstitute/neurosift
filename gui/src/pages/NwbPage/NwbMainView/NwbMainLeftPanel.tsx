import { MergedRemoteH5File, RemoteH5File } from "@fi-sci/remote-h5-file"
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useState } from "react"
import Hyperlink from "../../../components/Hyperlink"
import { serializeBigInt, valueToString } from "../BrowseNwbView/BrowseNwbView"
import { useDandiAssetContext } from "../DandiAssetContext"
import { NwbFileContext } from "../NwbFileContext"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { useDatasetData, useGroup } from "./NwbMainView"
import SelectedNeurodataItemsWidget from "./SelectedNeurodataItemsWidget"

type Props = {
    width: number
    height: number
    nwbFile: RemoteH5File | MergedRemoteH5File
}

const labelMap: {name: string, newName: string, renderer?: (val: any) => string}[] = [
    {name: 'session_id', newName: 'Session ID'},
    {name: 'experimenter', newName: 'Experimenter', renderer: (val: any) => {
        if (!val) return ''
        if (Array.isArray(val)) {
            return val.join('; ')
        }
        else return val + ''
    }},
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

    const {openTab} = useNwbOpenTabs()

    const items = useMemo(() => {
        const ret: {name: string, path: string, renderer?: (val: any) => string}[] = []
        rootGroup?.datasets.forEach(ds => {
            const mm = labelMap.find(x => (x.name === ds.name))
            const newName = mm?.newName || ds.name
            ret.push({name: newName || ds.name, path: ds.path, renderer: mm?.renderer})
        })
        generalGroup?.datasets.forEach(ds => {
            const mm = labelMap.find(x => (x.name === ds.name))
            const newName = mm?.newName || ds.name
            ret.push({name: newName || ds.name, path: ds.path, renderer: mm?.renderer})
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

    const bottomBarHeight = 23
    return (
        <div className="LeftPanel" style={{position: 'absolute', width, height}}>
            <div className="MainArea" style={{position: 'absolute', width, height: height - bottomBarHeight, overflowY: 'auto'}}>
                <DandiTable />
                <table
                    className="nwb-table"
                >
                    <tbody>
                        {
                            itemsSorted.map(item => (
                                <tr key={item.name}>
                                    <td>{item.name}</td>
                                    <td><DatasetDataView nwbFile={nwbFile} path={item.path} renderer={item.renderer} /></td>
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
            <div style={{position: 'absolute', width, height: bottomBarHeight, top: height - bottomBarHeight, backgroundColor: 'lightgray'}}>
                <button
                    onClick={() => {
                        openTab('timeseries-alignment')
                    }}
                >
                    View timeseries alignment
                </button>
            </div>
        </div>
    )
}

type DatasetDataViewProps = {
    nwbFile: RemoteH5File | MergedRemoteH5File
    path: string
    renderer?: (val: any) => string
}

const DatasetDataView: FunctionComponent<DatasetDataViewProps> = ({nwbFile, path, renderer}) => {
    const {data: datasetData} = useDatasetData(nwbFile, path)
    if (!datasetData) return <span>Loading...</span>
    if ((typeof(datasetData) === 'string') && (datasetData.length > 500)) {
        return (
            <div style={{height: 100, overflowY: 'auto'}}>
                {datasetData}
            </div>
        )
    }
    return <span>{
        renderer ? renderer(datasetData) : valueToString2(datasetData)
    }</span>
}

const valueToString2 = (val: any): string => {
    // same as valueToString, but don't include the brackets for arrays
    if (typeof(val) === 'string') {
        return val
    }
    else if (typeof(val) === 'number') {
        return val + ''
    }
    else if (typeof(val) === 'boolean') {
        return val ? 'true' : 'false'
    }
    else if (typeof(val) === 'object') {
        if (Array.isArray(val)) {
            return `${val.map(x => valueToString(x)).join(', ')}`
        }
        else {
            return JSON.stringify(serializeBigInt(val))
        }
    }
    else {
        return '<>'
    }
}

// type DandiAssetInfo = {
//     dandiset_id: string
//     dandiset_version_id: string
//     dandi_asset_id: string
//     dandi_asset_path: string
//     dandi_asset_size: number
//     dandi_asset_blob_id: string
// }

type DandisetInfo = {
    id: string,
    doi: string,
    url: string,
    name: string
    // others
}

const DandiTable = () => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')

    const {assetUrl, dandisetId, dandisetVersion, assetPath} = useDandiAssetContext()

    // const [dandiAssetInfo, setDandiAssetInfo] = useState<DandiAssetInfo | undefined>(undefined)
    const [dandisetInfo, setDandisetInfo] = useState<DandisetInfo | undefined>(undefined)

    // let nwbFileUrl: string
    // if (nwbFile instanceof MergedRemoteH5File) {
    //     nwbFileUrl = nwbFile.getFiles()[0].url
    // }
    // else {
    //     nwbFileUrl = nwbFile.url
    // }

    // useEffect(() => {
    //     const getDandiAssetInfo = async () => {
    //         const etag = await getEtag(nwbFileUrl)
    //         if (!etag) return
    //         const assetInfoUrl = `https://neurosift.org/computed/nwb/ETag/${etag.slice(0, 2)}/${etag.slice(2, 4)}/${etag.slice(4, 6)}/${etag}/dandi_asset_info.1.json`
    //         const resp = await fetch(assetInfoUrl)
    //         if (!resp.ok) return
    //         const obj = await resp.json() as DandiAssetInfo
    //         setDandiAssetInfo(obj)
    //         const dandiInfoUrl = `https://api.dandiarchive.org/api/dandisets/${obj.dandiset_id}/versions/${obj.dandiset_version_id}/`
    //         const resp2 = await fetch(dandiInfoUrl)
    //         if (!resp2.ok) return
    //         const obj2 = await resp2.json() as DandisetInfo
    //         setDandisetInfo(obj2)
    //     }
    //     getDandiAssetInfo()
    // }, [nwbFileUrl])

    // if (!dandiAssetInfo) return <span />

    useEffect(() => {
        if (!dandisetId) return
        if (!dandisetVersion) return
        const getDandisetInfo = async () => {
            const resp = await fetch(`https://api.dandiarchive.org/api/dandisets/${dandisetId}/versions/${dandisetVersion}/`)
            if (!resp.ok) return
            const obj = await resp.json() as DandisetInfo
            setDandisetInfo(obj)
        }
        getDandisetInfo()
    }, [dandisetId, dandisetVersion])

    const assetPathParentPath = assetPath ? assetPath.split('/').slice(0, -1).join('/') : undefined
    const assetPathFileName = assetPath ? assetPath.split('/').slice(-1)[0] : undefined

    const handleExportToDendro = useCallback(() => {
        const assetPathEncoded = encodeURIComponent(assetPath || '')
        const url = `https://dendro.vercel.app/importDandiAsset?projectName=neurosift&dandisetId=${dandisetId}&dandisetVersion=${dandisetVersion}&assetPath=${assetPathEncoded}&assetUrl=${assetUrl}`
        window.open(url, '_blank')
    }, [dandisetId, dandisetVersion, assetPath, assetUrl])

    if (!dandisetId) return <span />

    return (
        <div>
            {dandisetId && (
                <p>
                    DANDISET:&nbsp;
                    <Hyperlink
                        href={`https://gui.dandiarchive.org/#/dandiset/${dandisetId}/${dandisetVersion}`}
                        target="_blank"
                    >
                        {dandisetId} {dandisetVersion}
                    </Hyperlink>&nbsp;
                </p>
            )}
            {dandisetInfo && (
                <p>
                    {dandisetInfo.name}
                </p>
            )}
            {dandisetId && dandisetVersion && assetPath && (
                <p>
                    <Hyperlink
                        href={`https://gui.dandiarchive.org/#/dandiset/${dandisetId}/${dandisetVersion}/files?location=${assetPathParentPath}`}
                        target="_blank"
                    >
                        {assetPathParentPath}
                    </Hyperlink>/{assetPathFileName}
                </p>
            )}
            {dandisetId && dandisetVersion && assetPath && (
                <p>
                    <Hyperlink onClick={handleExportToDendro}>Export to Dendro</Hyperlink>
                </p>
            )}
            <hr />
        </div>
    )
}

export default NwbMainLeftPanel