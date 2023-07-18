import { FunctionComponent, useContext, useEffect, useMemo, useReducer } from "react"
import { NwbFileContext } from "../../NwbFileContext"
import { useGroup } from "../../NwbMainView/NwbMainView"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}

type DataState = {
    [key: string]: any[]
}
type DataAction = {
    type: 'set'
    key: string
    data: any[]
}
const dataReducer = (state: DataState, action: DataAction) => {
    if (action.type === 'set') {
        return {
            ...state,
            [action.key]: action.data
        }
    }
    else return state
}

const DynamicTableView: FunctionComponent<Props> = ({ width, height, path, condensed }) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')
    const [data, dataDispatch] = useReducer(dataReducer, {})
    const group = useGroup(nwbFile, path)
    const colnames = useMemo(() => (
        group ? group.attrs['colnames'] as string[] : undefined
    ), [group])
    useEffect(() => {
        let canceled = false
        const load = async () => {
            if (!colnames) return
            for (const colname of colnames) {
                const d = await nwbFile.getDatasetData(path + '/' + colname, {})
                if (canceled) return
                dataDispatch({type: 'set', key: colname, data: Array.from(d)})
            }
        }
        load()
        return () => {canceled = true}
    }, [colnames, nwbFile, path])

    const rowItems: {columnValues: any[]}[] = useMemo(() => {
        if (!colnames) return []
        let numRows = 0
        for (const colname of colnames) {
            const d = data[colname]
            if (d) {
                numRows = Math.max(numRows, d.length)
            }
        }
        const ret: {columnValues: any[]}[] = []
        for (let i = 0; i < numRows; i++) {
            const row: {columnValues: any[]} = {columnValues: []}
            for (const colname of colnames) {
                const d = data[colname]
                if (d) {
                    row.columnValues.push(d[i])
                }
                else {
                    row.columnValues.push(undefined)
                }
            }
            ret.push(row)
        }
        return ret
    }, [colnames, data])

    if (!colnames) return <div>Loading...</div>
    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            <table className="nwb-table">
                <thead>
                    <tr>
                        {
                            colnames.map((colname) => (
                                <th key={colname}>{colname}</th>
                            ))
                        }
                    </tr>
                </thead>
                <tbody>
                    {
                        rowItems.map((rowItem, i) => (
                            <tr key={i}>
                                {
                                    rowItem.columnValues.map((val, j) => (
                                        <td key={j}>{val}</td>
                                    ))
                                }
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
    )
}

export default DynamicTableView