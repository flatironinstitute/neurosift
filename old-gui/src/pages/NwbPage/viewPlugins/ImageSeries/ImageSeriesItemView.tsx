import { FunctionComponent } from "react"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}

const ImageSeriesItemView: FunctionComponent<Props> = ({width, height, path}) => {
    return <div>Avi page no longer supported</div>
    // const nwbFile = useContext(NwbFileContext)
    // if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')

    // const {route} = useRoute()
    // // const dandiAssetUrl = route.page === 'nwb' ? route.dandiAssetUrl : undefined

    // const {data: externalFileData} = useDatasetData(nwbFile, `${path}/external_file`)
    // const [videoUrl, setVideoUrl] = useState<string | undefined | null>(undefined)
    // useEffect(() => {
    //     let canceled = false
    //     if (!dandiAssetUrl) return
    //     if (!externalFileData) return
    //     const externalFileRelativePath = externalFileData[0]
    //     const load = async () => {
    //         const assetInfo = await fetchJson(dandiAssetUrl)
    //         const assetPath = assetInfo['path']
    //         if (!assetPath) throw Error(`Unexpected: no path in asset info`)
    //         const videoPath = constructPath(assetPath, externalFileRelativePath)
    //         const dandisetAssetsUrl = dandiAssetUrl.split('/').slice(0, -2).join('/')
    //         const dandisetAssets = await fetchJson(dandisetAssetsUrl)
    //         const videoAsset = dandisetAssets['results'].find((a: any) => (a.path === videoPath))
    //         if (!videoAsset) throw Error(`Unexpected: video asset not found`)
    //         const videoAssetId = videoAsset['asset_id']
    //         const videoAssetUrl = dandisetAssetsUrl + '/' + videoAssetId
    //         const videoAssetInfo = await fetchJson(videoAssetUrl)
    //         const videoBlobUrl = videoAssetInfo['contentUrl'].find((x: any) => (x.startsWith('https://dandiarchive.s3.amazonaws.com/blobs')))
    //         if (!videoBlobUrl) throw Error(`Unexpected: no video blob url`)
    //         if (canceled) return
    //         setVideoUrl(videoBlobUrl)
    //     }
    //     load()
    //     return () => {canceled = true}
    // }, [externalFileData, dandiAssetUrl])

    // if (!dandiAssetUrl) {
    //     return (
    //         <div>Missing dandi-asset query parameter</div>
    //     )
    // }

    // if (!videoUrl) {
    //     return (
    //         <div>Trying to locate video...</div>
    //     )
    // }

    // return (
    //     <AviPage
    //         width={width}
    //         height={height}
    //         url={videoUrl || ''}
    //     />
    // )
}

export const fetchJson = async (url: string) => {
    const response = await fetch(url)
    if (!response.ok) {
        throw Error(`Unexpected response from ${url}: ${response.status} ${response.statusText}`)
    }
    return await response.json()
}

// const constructPath = (assetPath: string, relativePath: string) => {
//     const assetPathParts = assetPath.split('/')
//     const relativePathParts = relativePath.split('/')
//     const newPathParts = assetPathParts.slice(0, assetPathParts.length - 1).concat(relativePathParts)
//     return newPathParts.join('/')
// }


export default ImageSeriesItemView