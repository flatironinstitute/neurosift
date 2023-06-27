import { FunctionComponent } from "react"
import { IpynbRenderer } from "react-ipynb-renderer";

// Jupyter theme
import "react-ipynb-renderer/dist/styles/monokai.css";

type IpynbCellOutput = {
    name: 'stdout' | 'stderr'
    output_type: 'execute_result' | 'display_data' | 'stream' | 'error'
    text: string[]
}

type IpynbCell = {
    cell_type: 'code' | 'markdown'
    execution_count: number | null
    metadata: any
    outputs: IpynbCellOutput[]
    source: string[]
}

type IpynbSource = {
    cells: IpynbCell[]
    metadata: any
    nbformat: number
    nbformat_minor: number
}

type Props = {
    width: number
    height: number
    source: IpynbSource
}

const IpynbView: FunctionComponent<Props> = ({width, height, source}) => {
    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            <IpynbRenderer ipynb={source} />
        </div>
    )
}

export default IpynbView