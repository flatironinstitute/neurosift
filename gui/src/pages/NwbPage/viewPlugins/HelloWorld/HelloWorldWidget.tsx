import { FunctionComponent, useContext } from "react"
import { NwbFileContext } from "../../NwbFileContext"
import { useGroup } from "../../NwbMainView/NwbMainView"

type Props = {
    width: number
    height: number
    path: string
}

const HelloWorldWidget: FunctionComponent<Props> = ({width, height, path}) => {
    // Access the global nwb file
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')

    // Get the group of the item to be viewed
    const group = useGroup(nwbFile, path)
    console.info('Group:', group)

    const groupAttrs = group?.attrs
    const subgroups = group?.subgroups
    const datasets = group?.datasets

    // just display the contents
    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            <h1>Hello, World!</h1>
            <h3>Group attributes</h3>
            <pre>{JSON.stringify(groupAttrs || {}, null, 4)}</pre>
            <h3>Subgroups</h3>
            <pre>{JSON.stringify(subgroups || {}, null, 4)}</pre>
            <h3>Datasets</h3>
            <pre>{JSON.stringify(datasets || {}, null, 4)}</pre>
        </div>
    )
}

export default HelloWorldWidget