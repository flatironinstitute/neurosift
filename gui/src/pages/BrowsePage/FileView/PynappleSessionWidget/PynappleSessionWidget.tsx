import { FunctionComponent, useEffect, useMemo, useReducer, useState } from "react"
import { FaPiedPiper } from "react-icons/fa"
import Hyperlink from "../../../../components/Hyperlink"
import SmallIconButton from "../../../../components/SmallIconButton"
import { useRtcshare } from "../../../../rtcshare/useRtcshare"
import { useOpenTabs } from "../../OpenTabsContext"
import './table-1.css'

type Props = {
    width: number
    height: number
    sessionPath: string
}

type PynappleSessionObject = {
    name: string
    type: 'TsGroup' | 'TsdFrame' | 'dict'
}

type PynappleSessionSummary = {
    objects: PynappleSessionObject[]
}

type SelectedObjectsState = {
    [key: string]: boolean
}

type SelectedObjectsAction = {
    type: 'toggle'
    objectName: string
}

const selectedObjectsReducer = (state: SelectedObjectsState, action: SelectedObjectsAction) => {
    if (action.type === 'toggle') {
        const newState = {...state}
        newState[action.objectName] = !newState[action.objectName]
        return newState
    }
    else {
        return state
    }
}

const PynappleSessionWidget: FunctionComponent<Props> = ({width, height, sessionPath}) => {
    const {client: rtcshareClient} = useRtcshare()
    const {openTab} = useOpenTabs()
    const [sessionSummary, setSessionSummary] = useState<PynappleSessionSummary>()
    useEffect(() => {
        let canceled = false
        if (!rtcshareClient) return
        (async () => {
            const {result} = await rtcshareClient.serviceQuery('pynapple', {
                type: 'session_summary',
                session_uri: `rtcshare://${sessionPath}`
            })
            if (canceled) return
            const summary = result as PynappleSessionSummary
            setSessionSummary(summary)
        })()
        return () => {canceled = true}
    }, [rtcshareClient, sessionPath])

    const [selectedObjects, selectedObjectsDispatch] = useReducer(selectedObjectsReducer, {})

    const topBarHeight = 30
    const selectedObjectsList = useMemo(() => {
        const ret: string[] = []
        for (const k in selectedObjects) {
            if (selectedObjects[k]) {
                ret.push(k)
            }
        }
        ret.sort()
        return ret
    }, [selectedObjects])

    const okayToViewFigure = useMemo(() => {
        if (selectedObjectsList.length <= 1) return false
        return true
    }, [selectedObjectsList])

    if (!sessionSummary) return (
        <div>Loading...</div>
    )

    const typeForObjectName = (objectName: string) => {
        const obj = sessionSummary.objects.find(obj => (obj.name === objectName))
        if (!obj) return ''
        return obj.type
    }
    return (
        <div style={{position: 'absolute', width, height}}>
            <div style={{position: 'absolute', top: 0, left: 0, width, height: topBarHeight, backgroundColor: 'rgb(240, 240, 240)', borderBottom: 'solid 1px rgb(200, 200, 200)'}}>
                {
                    okayToViewFigure && (
                        <div style={{position: 'absolute', top: 0, left: 0, width: 100, height: topBarHeight, display: 'flex', alignItems: 'center', paddingLeft: 10}}>
                            <SmallIconButton icon={<FaPiedPiper />} onClick={() => {
                                const x = selectedObjectsList.map(obj => `${obj}:${typeForObjectName(obj)}`)
                                openTab(`pynapple-objects:${sessionPath}|${x.join('|')}`)
                            }} label={`view ${selectedObjectsList.length}`} />
                        </div>
                    )
                }
            </div>
            <div style={{position: 'absolute', top: topBarHeight, left: 5, width: width - 10, height: height - topBarHeight, overflowY: 'auto'}}>
                <table className="table-1">
                    <thead>
                        <tr>
                            <th />
                            <th>Object</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessionSummary.objects.map((object) => (
                            <tr key={object.name}>
                                <td><Checkbox checked={!!selectedObjects[object.name]} onToggle={() => selectedObjectsDispatch({type: 'toggle', objectName: object.name})} /></td>
                                <td>
                                    <Hyperlink onClick={() => {
                                        openTab(`pynapple-object:${sessionPath}|${object.name}|${object.type}`)
                                    }}>
                                        {object.name}
                                    </Hyperlink>
                                </td>
                                <td>{object.type}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const Checkbox: FunctionComponent<{checked: boolean, onToggle: () => void}> = ({checked, onToggle}) => {
    return (
        <div className="file-browser-checkbox" onClick={onToggle}>
            <input type="checkbox" checked={checked} onChange={() => {}} />
        </div>
    )
}

export default PynappleSessionWidget