import { FunctionComponent, useCallback, useEffect, useReducer } from "react"

type ApiKeysWindowProps = {
    onClose: () => void
}

type KeysState = {
    dandiApiKey: string
    dandiStagingApiKey: string
}

const defaultKeysState: KeysState = {
    dandiApiKey: '',
    dandiStagingApiKey: ''
}

type KeysAction = {
    type: 'setDandiApiKey' | 'setDandiStagingApiKey'
    value: string
}

const keysReducer = (state: KeysState, action: KeysAction): KeysState => {
    switch (action.type) {
        case 'setDandiApiKey':
            return {...state, dandiApiKey: action.value}
        case 'setDandiStagingApiKey':
            return {...state, dandiStagingApiKey: action.value}
        default:
            throw new Error('invalid action type')
    }
}

const ApiKeysWindow: FunctionComponent<ApiKeysWindowProps> = ({onClose}) => {
    const [keys, keysDispatch] = useReducer(keysReducer, defaultKeysState)
    useEffect(() => {
        // initialize from local storage
        const dandiApiKey = localStorage.getItem('dandiApiKey') || ''
        const dandiStagingApiKey = localStorage.getItem('dandiStagingApiKey') || ''
        keysDispatch({type: 'setDandiApiKey', value: dandiApiKey})
        keysDispatch({type: 'setDandiStagingApiKey', value: dandiStagingApiKey})
    }, [])
    const handleSave = useCallback(() => {
        localStorage.setItem('dandiApiKey', keys.dandiApiKey)
        localStorage.setItem('dandiStagingApiKey', keys.dandiStagingApiKey)
        onClose()
    }, [keys, onClose])
    return (
        <div style={{padding: 30}}>
            <h3>Set API Keys</h3>
            <hr />
            <table className="table-1" style={{maxWidth: 300}}>
                <tbody>
                    <tr>
                        <td>DANDI API Key: </td>
                        <td><input type="password" value={keys.dandiApiKey} onChange={e => keysDispatch({type: 'setDandiApiKey', value: e.target.value})} /></td>
                    </tr>
                    <tr>
                        <td>DANDI Staging API Key: </td>
                        <td><input type="password" value={keys.dandiStagingApiKey} onChange={e => keysDispatch({type: 'setDandiStagingApiKey', value: e.target.value})} /></td>
                    </tr>
                </tbody>
            </table>
            <hr />
            <div>
                <button onClick={handleSave}>Save</button>
                &nbsp;
                <button onClick={onClose}>Cancel</button>
            </div>
        </div>
    )
}

export default ApiKeysWindow