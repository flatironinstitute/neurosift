import { faPython } from "@fortawesome/free-brands-svg-icons";
import { faBox, faFile, faFileText, faVideo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FunctionComponent, useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { FaPencilAlt, FaPiedPiper } from "react-icons/fa";
import SmallIconButton from "../../../components/SmallIconButton";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import { timeAgoString } from "../../../timeStrings";
import "./file-browser-table.css";
import formatByteCount from "./formatByteCount";

type Props = {
    width: number
    height: number
    onOpenTab: (tabName: string) => void
    currentFolderPath: string
    setCurrentFolderPath: (path: string) => void
}

type FileItem = {
    id: string
    name: string
    size?: number
    timestampModified?: number
    isDir: boolean
}

type SelectedFilesState = {
    [key: string]: boolean
}

type SelectedFilesAction = {
    type: 'toggle'
    fileName: string
}

const selectedFilesReducer = (state: SelectedFilesState, action: SelectedFilesAction) => {
    if (action.type === 'toggle') {
        const newState = {...state}
        newState[action.fileName] = !newState[action.fileName]
        return newState
    }
    else {
        return state
    }
}

const FileBrowser: FunctionComponent<Props> = ({onOpenTab, currentFolderPath, setCurrentFolderPath, width, height}) => {
    const {client} = useRtcshare()
    const [files, setFiles] = useState<FileItem[]>([])

    const [selectedFiles, selectedFilesDispatch] = useReducer(selectedFilesReducer, {})

    const [contextMenu, setContextMenu] = useState<{visible: boolean, x: number, y: number, fileId: string}>({ visible: false, x: 0, y: 0, fileId: '' })

    useEffect(() => {
        setFiles([])
        if (!client) return
        let canceled = false
        ;(async () => {
            const dir = await client.readDir(currentFolderPath)
            if (canceled) return
            const ff: FileItem[] = []
            for (const x of dir.dirs) {
                const pp = join(`${currentFolderPath}`, `${x.name}`)
                ff.push({
                    id: pp,
                    name: x.name,
                    isDir: true
                })
            }
            for (const x of dir.files) {
                const pp = join(`${currentFolderPath}`, `${x.name}`)
                ff.push({
                    id: pp,
                    name: x.name,
                    size: x.size,
                    timestampModified: x.mtime / 1000,
                    isDir: false
                })
            }
            setFiles(ff)
        })()
        return () => {canceled = true}
    }, [currentFolderPath, client])

    const handleContextMenu = (evt: React.MouseEvent, fileId: string) => {
        evt.preventDefault()
        const boundingRect = evt.currentTarget.parentElement?.getBoundingClientRect()
        if (!boundingRect) return
        setContextMenu({ visible: true, x: evt.clientX - boundingRect.x, y: evt.clientY - boundingRect.y, fileId });
    }

    const handleClickFile = useCallback((fileId: string) => {
        const file = files.find(x => x.id === fileId)
        if (!file) return
        const fileExt = '.' + file.name.split('.').pop()
        if ((file.isDir) && (!['.ns-asp', '.ns-ssd', '.pynapple'].includes(fileExt))) {
            const newFolder = join(currentFolderPath, file.name)
            setCurrentFolderPath(newFolder)
            return
        }
        onOpenTab(`file:${fileId}`)
        setContextMenu({ visible: false, x: 0, y: 0, fileId: '' })
    }, [onOpenTab, currentFolderPath, files, setCurrentFolderPath])

    const handleContextMenuAction = useCallback((fileId: string, action: string) => {
        if (action === 'delete') {
            // onDeleteFile(fileId)
        }
        else if (action === 'duplicate') {
            // onDuplicateFile(fileId)
        }
        else if (action === 'rename') {
            // onRenameFile(fileId)
        }
        else if (action === 'edit') {
            onOpenTab(`edit:${fileId}`)
        }
        setContextMenu({ visible: false, x: 0, y: 0, fileId: '' })
    }, [onOpenTab])

    const topBarHeight = 30
    const selectedFilesList = useMemo(() => {
        const ret: string[] = []
        for (const k in selectedFiles) {
            if (selectedFiles[k]) {
                ret.push(k)
            }
        }
        ret.sort()
        return ret
    }, [selectedFiles])

    const okayToViewFigure = useMemo(() => {
        if (selectedFilesList.length <= 1) return false
        for (const k of selectedFilesList) {
            if (selectedFiles[k]) {
                const ext = k.split('.').pop()
                if ((!ext?.startsWith('ns-')) && (ext !== 'avi') && (ext !== 'mp4')) return false
                if (ext === 'ns-fig') return false
            }
        }
        return true
    }, [selectedFiles, selectedFilesList])
    
    return (
        <div onMouseLeave={() => {setContextMenu({visible: false, x: 0, y: 0, fileId: ''})}} style={{position: 'absolute', width, height}}>
            <div style={{position: 'absolute', top: 0, left: 0, width, height: topBarHeight, backgroundColor: 'rgb(240, 240, 240)', borderBottom: 'solid 1px rgb(200, 200, 200)'}}>
                {
                    okayToViewFigure && (
                        <div style={{position: 'absolute', top: 0, left: 0, width: 100, height: topBarHeight, display: 'flex', alignItems: 'center', paddingLeft: 10}}>
                            <SmallIconButton icon={<FaPiedPiper />} onClick={() => {
                                const x = JSON.stringify(selectedFilesList.map(f => (`${currentFolderPath}/${f}`)))
                                onOpenTab(`figure:${x}`)
                            }} label={`view ${selectedFilesList.length}`} />
                        </div>
                    )
                }
            </div>
            <div style={{position: 'absolute', top: topBarHeight, left: 5, width: width - 10, height: height - topBarHeight, overflowY: 'auto'}}>
                <table className="file-browser-table">
                    <tbody>
                        <tr key=".." onClick={() => setCurrentFolderPath(join(currentFolderPath, '..'))} style={{cursor: 'pointer', userSelect: 'none'}}>
                            <td />
                            <td><FileIcon fileName=".." isDir={true} /></td>
                            <td>..</td>
                            <td></td>
                            <td></td>
                        </tr>
                        {
                            files.map(x => (
                                <tr key={x.id} onContextMenu={(evt) => handleContextMenu(evt, x.id)} style={{cursor: 'pointer', userSelect: 'none'}}>
                                    <td><Checkbox checked={!!selectedFiles[x.name]} onToggle={() => selectedFilesDispatch({type: 'toggle', fileName: x.name})} /></td>
                                    <td onClick={() => handleClickFile(x.id)}><FileIcon fileName={x.name} isDir={x.isDir} /></td>
                                    <td onClick={() => handleClickFile(x.id)}>{x.name}</td>
                                    <td onClick={() => handleClickFile(x.id)}>{timeAgoString(x.timestampModified)}</td>
                                    <td onClick={() => handleClickFile(x.id)}>{formatByteCount(x.size)}</td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>
            {
                contextMenu.visible && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        fileId={contextMenu.fileId}
                        onAction={handleContextMenuAction}
                    />
                )
            }
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

export const FileIcon: FunctionComponent<{fileName: string, isDir: boolean}> = ({fileName, isDir}) => {
    const ext = fileName.split('.').pop()

    // folder color is a dark pale blue
    const folderColor = '#80a0a0'
    if (isDir) {
        if (ext?.startsWith('ns-')) {
            return <FontAwesomeIcon icon={faFile as any} style={{color: 'darkgreen'}} />
        }
        else if (ext === 'pynapple') {
            return <FontAwesomeIcon icon={faBox as any} style={{color: 'orange'}} />
        }
        else {
            return <FontAwesomeIcon icon={faFile as any} style={{color: folderColor}} />
        }
    }

    if (ext === 'py') {
        return <FontAwesomeIcon icon={faPython} style={{color: 'darkblue'}} />
    }
    else if (ext === 'json') {
        return <FontAwesomeIcon icon={faFileText as any} style={{color: 'black'}} />
    }
    else if ((ext === 'mp4') || (ext === 'avi')) {
        return <FontAwesomeIcon icon={faVideo as any} style={{color: 'darkred'}} />
    }
    else if (ext?.startsWith('ns-')) {
        return <FontAwesomeIcon icon={faFileText as any} style={{color: 'darkgreen'}} />
    }
    else {
        return <FontAwesomeIcon icon={faFileText as any} style={{color: 'gray'}} />
    }
}

const ContextMenu: FunctionComponent<{ x: number, y: number, fileId: string, onAction: (fileId: string, a: string) => void}> = ({x, y, fileId, onAction}) => {
    const options: {
        id: string
        label: any
    }[] = []
    if (fileId.endsWith('.ns-fig')) {
        options.push({
            id: "edit",
            label: <span><SmallIconButton icon={<FaPencilAlt />} /> edit {fileId}</span>
        })
    }
    // options = options.concat([
    //     {
    //         id: "delete",
    //         label: <span><SmallIconButton icon={<Delete />} /> delete {fileId}</span>
    //     }, {
    //         id: "rename",
    //         label: <span><SmallIconButton icon={<DriveFileRenameOutline />} /> rename...</span>
    //     }, {
    //         id: "duplicate",
    //         label: <span><SmallIconButton icon={<FileCopy />} /> duplicate...</span>
    //     }
    // ])
  
    const onClick = (option: string) => {
      onAction(fileId, option)
    }
  
    return (
      <div className="file-browser-context-menu" style={{ position: 'absolute', top: y, left: x}}>
        {options.map(option => (
          <div key={option.id} onClick={() => onClick(option.id)}>{option.label}</div>
        ))}
      </div>
    )
}

function join(a: string, b: string) {
    if (b === '..') {
        const pp = a.split('/')
        pp.pop()
        return pp.join('/')
    }
    if (!a) return b
    if (!b) return a
    return `${a}/${b}`
}

export default FileBrowser