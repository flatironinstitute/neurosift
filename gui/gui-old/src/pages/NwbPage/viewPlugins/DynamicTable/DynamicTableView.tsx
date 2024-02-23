import { FunctionComponent, useContext, useEffect, useMemo, useReducer } from "react"
import { valueToString } from "../../BrowseNwbView/BrowseNwbView"
import { NwbFileContext } from "../../NwbFileContext"
import { useGroup } from "../../NwbMainView/NwbMainView"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
    referenceColumnName?: string // for example, 'id'
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

const DynamicTableView: FunctionComponent<Props> = ({ width, height, path, referenceColumnName }) => {
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
                if (!ds0) {
                    console.warn(`In DynamicTableView, dataset not found: ${path}/${colname}`)
                    continue
                }
                if (ds0.shape.length !== 1) {
                    console.warn(`In DynamicTableView, unexpected shape for ${path}/${colname}`, ds0.shape)
                    continue
                }
                const d = await nwbFile.getDatasetData(path + '/' + colname, {})
                if (canceled) return
                if (!d) {
                    console.warn(`In DynamicTableView, dataset data not found: ${path}/${colname}`)
                    continue
                }
                dataDispatch({type: 'set', key: colname, data: Array.from(d)})
            }
        }
        load()
        return () => {canceled = true}
    }, [colnames, nwbFile, path])

    const validColumnNames = useMemo(() => {
        if (!colnames) return undefined
        const referenceColumnData = referenceColumnName ? data[referenceColumnName] : undefined
        const ret: string[] = []
        for (const colname of colnames) {
            const d = data[colname]
            if (d) {
                if ((referenceColumnData) && (d.length !== referenceColumnData.length)) {
                    console.warn(`In DynamicTableView, unexpected length for ${path}/${colname}`, d.length, referenceColumnData.length)
                    continue
                }
                ret.push(colname)
            }
        }
        return ret
    }, [colnames, data, path, referenceColumnName])

    const rowItems: {columnValues: any[]}[] = useMemo(() => {
        if (!validColumnNames) return []
        let numRows = 0
        for (const colname of validColumnNames) {
            const d = data[colname]
            if (d) {
                numRows = Math.max(numRows, d.length)
            }
        }
        const ret: {columnValues: any[]}[] = []
        for (let i = 0; i < numRows; i++) {
            const row: {columnValues: any[]} = {columnValues: []}
            for (const colname of validColumnNames) {
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
    }, [validColumnNames, data])

    const sortedRowItems = useMemo(() => {
        if (!validColumnNames) return rowItems
        const primary = columnSortState.primary
        const secondary = columnSortState.secondary
        if (!primary) return rowItems
        const primaryColIndex = validColumnNames.indexOf(primary.column)
        if (primaryColIndex < 0) return rowItems
        const secondaryColIndex = secondary ? validColumnNames.indexOf(secondary.column) : -1
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
    }, [validColumnNames, rowItems, columnSortState])

    const [columnDescriptions, columnDescriptionDispatch] = useReducer(columnDescriptionReducer, {})
    useEffect(() => {
        if (!group) return
        for (const colname of validColumnNames || []) {
            const ds = group.datasets.find(ds => (ds.name === colname))
            if (ds) {
                columnDescriptionDispatch({type: 'set', column: colname, description: ds.attrs.description || ''})
            }
        }
    }, [validColumnNames, group])

    const sortedRowItemsAbbreviated = useMemo(() => {
        const maxLength = 20_000 / (validColumnNames?.length || 1)
        if (sortedRowItems.length < maxLength) {
            return sortedRowItems
        }
        const ret = []
        for (let i = 0; i < maxLength; i++) {
            ret.push(sortedRowItems[i])
        }
        return ret
    }, [sortedRowItems, validColumnNames])

    if (!validColumnNames) return <div>Loading...</div>

    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            {
                sortedRowItemsAbbreviated.length < sortedRowItems.length && (
                    <div style={{padding: 10, fontSize: 12, color: 'gray'}}>Showing {sortedRowItemsAbbreviated.length} of {sortedRowItems.length} rows</div>
                )
            }
            <table className="nwb-table">
                <thead>
                    <tr>
                        {
                            validColumnNames.map((colname) => (
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
                        sortedRowItemsAbbreviated.map((rowItem, i) => (
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