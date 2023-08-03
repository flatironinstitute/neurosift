import { FunctionComponent, useContext, useEffect, useMemo, useReducer } from "react"
import { valueToString } from "../../BrowseNwbView/BrowseNwbView"
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

type ColumnSortState = {
    primary?: {
        column: string
        ascending: boolean
    }
    secondary?: {
        column: string
        ascending: boolean
    }
}

type ColumnSortAction = {
    type: 'click'
    column: string
}

const columnSortReducer = (state: ColumnSortState, action: ColumnSortAction): ColumnSortState => {
    if (action.type === 'click') {
        if (state.primary) {
            // the primary column is already set
            if (state.primary.column === action.column) {
                // the primary column is the same as the one that was clicked
                return {
                    ...state,
                    primary: {
                        ...state.primary,
                        ascending: !state.primary.ascending // switch the sort order
                    }
                }
            }
            else {
                // the primary column becomes the secondary column
                return {
                    ...state,
                    secondary: state.primary,
                    primary: {
                        column: action.column,
                        ascending: true
                    }
                }
            }
        }
        else {
            // the primary column is not set
            return {
                ...state,
                primary: {
                    column: action.column,
                    ascending: true
                }
            }
        }
    }
    else return state
}

type ColumnDescriptions = {
    [colname: string]: string
}

type ColumnDescriptionAction = {
    type: 'set'
    column: string
    description: string
}

const columnDescriptionReducer = (state: ColumnDescriptions, action: ColumnDescriptionAction): ColumnDescriptions => {
    if (action.type === 'set') {
        return {
            ...state,
            [action.column]: action.description
        }
    }
    else return state
}

const DynamicTableView: FunctionComponent<Props> = ({ width, height, path }) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')
    const [data, dataDispatch] = useReducer(dataReducer, {})
    const group = useGroup(nwbFile, path)
    const [columnSortState, columnSortDispatch] = useReducer(columnSortReducer, {})
    const colnames = useMemo(() => {
        if (!group) return undefined
        let c = group.attrs['colnames'] as string[]
        if (!c) return undefined
        const idDataset = group.datasets.find(ds => (ds.name === 'id'))
        if (idDataset) {
            c = c.filter(name => {
                const ds = group.datasets.find(ds => (ds.name === name))
                if ((ds) && (ds.shape[0] !== idDataset.shape[0])) {
                    // for example, event_times, event_amplitudes
                    return false
                }
                return true
            })
        }
        if (!c.includes('id')) {
            if (group.datasets.find(ds => (ds.name === 'id'))) {
                c = ['id', ...c]
            }
        }
        // const nt = group.attrs['neurodata_type']
        // if (nt === 'Units') {
        //     c = c.filter(name => (name !== 'spike_times'))
        //     if (!c.includes('id')) {
        //         c = ['id', ...c]
        //     }
        // }
        return c
    }, [group])
    useEffect(() => {
        let canceled = false
        const load = async () => {
            if (!colnames) return
            for (const colname of colnames) {
                const ds0 = await nwbFile.getDataset(path + '/' + colname)
                if (ds0.shape.length !== 1) {
                    console.warn(`In DynamicTableView, unexpected shape for ${path}/${colname}`, ds0.shape)
                    continue
                }
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

    const sortedRowItems = useMemo(() => {
        if (!colnames) return rowItems
        const primary = columnSortState.primary
        const secondary = columnSortState.secondary
        if (!primary) return rowItems
        const primaryColIndex = colnames.indexOf(primary.column)
        if (primaryColIndex < 0) return rowItems
        const secondaryColIndex = secondary ? colnames.indexOf(secondary.column) : -1
        const ret = [...rowItems]
        ret.sort((a, b) => {
            const valA = a.columnValues[primaryColIndex]
            const valB = b.columnValues[primaryColIndex]
            if (valA === undefined) return 1
            if (valB === undefined) return -1
            if (valA < valB) return primary.ascending ? -1 : 1
            if (valA > valB) return primary.ascending ? 1 : -1
            if ((secondaryColIndex >= 0) && (secondary)) {
                const valA2 = a.columnValues[secondaryColIndex]
                const valB2 = b.columnValues[secondaryColIndex]
                if (valA2 === undefined) return 1
                if (valB2 === undefined) return -1
                if (valA2 < valB2) return secondary.ascending ? -1 : 1
                if (valA2 > valB2) return secondary.ascending ? 1 : -1
            }
            return 0
        })
        return ret
    }, [colnames, rowItems, columnSortState])

    const [columnDescriptions, columnDescriptionDispatch] = useReducer(columnDescriptionReducer, {})
    useEffect(() => {
        if (!group) return
        for (const colname of colnames || []) {
            const ds = group.datasets.find(ds => (ds.name === colname))
            if (ds) {
                columnDescriptionDispatch({type: 'set', column: colname, description: ds.attrs.description || ''})
            }
        }
    }, [colnames, group])

    if (!colnames) return <div>Loading...</div>
    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            <table className="nwb-table">
                <thead>
                    <tr>
                        {
                            colnames.map((colname) => (
                                <th key={colname}>
                                    <span
                                        onClick={() => {columnSortDispatch({type: 'click', column: colname})}}
                                        style={{cursor: 'pointer'}}
                                        title={columnDescriptions[colname] || ''}
                                    >
                                        {
                                            (columnSortState.primary) && (columnSortState.primary.column === colname) && (
                                                <span style={{color: 'white'}}>{columnSortState.primary.ascending ? '▲' : '▼'}&nbsp;</span>
                                            )
                                        }
                                        {colname}
                                    </span>
                                </th>
                            ))
                        }
                    </tr>
                </thead>
                <tbody>
                    {
                        sortedRowItems.map((rowItem, i) => (
                            <tr key={i}>
                                {
                                    rowItem.columnValues.map((val, j) => (
                                        <td key={j}>{valueToString(val)}</td>
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