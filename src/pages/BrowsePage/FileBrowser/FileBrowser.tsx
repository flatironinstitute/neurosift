import { faPython } from "@fortawesome/free-brands-svg-icons";
import { faFile, faFileText, faVideo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Delete, DriveFileRenameOutline, FileCopy } from "@mui/icons-material";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import SmallIconButton from "../../../components/SmallIconButton";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import { timeAgoString } from "../../../timeStrings";
import formatByteCount from "./formatByteCount";
import "./file-browser-table.css"

type Props = {
    onOpenFile: (path: string) => void
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

const FileBrowser: FunctionComponent<Props> = ({onOpenFile, currentFolderPath, setCurrentFolderPath}) => {
    const {client} = useRtcshare()
    const [files, setFiles] = useState<FileItem[]>([])

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
        if ((file.isDir) && (!['.ns-asp'].includes(fileExt))) {
            const newFolder = join(currentFolderPath, file.name)
            setCurrentFolderPath(newFolder)
            return
        }
        onOpenFile(fileId)
        setContextMenu({ visible: false, x: 0, y: 0, fileId: '' })
    }, [onOpenFile, currentFolderPath, files, setCurrentFolderPath])

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
        setContextMenu({ visible: false, x: 0, y: 0, fileId: '' })
    }, [])
    
    return (
        <div onMouseLeave={() => {setContextMenu({visible: false, x: 0, y: 0, fileId: ''})}} style={{position: 'absolute'}}>
            <table className="file-browser-table">
                <tbody>
                    <tr key=".." onClick={() => setCurrentFolderPath(join(currentFolderPath, '..'))} style={{cursor: 'pointer'}}>
                        <td><FileIcon fileName=".." isDir={true} /></td>
                        <td>..</td>
                        <td></td>
                        <td></td>
                    </tr>
                    {
                        files.map(x => (
                            <tr key={x.id} onClick={() => handleClickFile(x.id)} onContextMenu={(evt) => handleContextMenu(evt, x.id)} style={{cursor: 'pointer'}}>
                                <td><FileIcon fileName={x.name} isDir={x.isDir} /></td>
                                <td>{x.name}</td>
                                <td>{timeAgoString(x.timestampModified)}</td>
                                <td>{formatByteCount(x.size)}</td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
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

export const FileIcon: FunctionComponent<{fileName: string, isDir: boolean}> = ({fileName, isDir}) => {
    // folder color is a dark pale blue
    const folderColor = '#80a0a0'
    if (isDir) {
        return <FontAwesomeIcon icon={faFile as any} style={{color: folderColor}} />
    }

    const ext = fileName.split('.').pop()
    if (ext === 'py') {
        return <FontAwesomeIcon icon={faPython} style={{color: 'darkblue'}} />
    }
    else if (ext === 'json') {
        return <FontAwesomeIcon icon={faFileText as any} style={{color: 'black'}} />
    }
    else if ((ext === 'mp4') || (ext === 'avi')) {
        return <FontAwesomeIcon icon={faVideo as any} style={{color: 'darkred'}} />
    }
    else {
        return <FontAwesomeIcon icon={faFileText as any} style={{color: 'gray'}} />
    }
}

const ContextMenu: FunctionComponent<{ x: number, y: number, fileId: string, onAction: (fileId: string, a: string) => void}> = ({x, y, fileId, onAction}) => {
    const options = [
        {
            id: "delete",
            label: <span><SmallIconButton icon={<Delete />} /> delete {fileId}</span>
        }, {
            id: "rename",
            label: <span><SmallIconButton icon={<DriveFileRenameOutline />} /> rename...</span>
        }, {
            id: "duplicate",
            label: <span><SmallIconButton icon={<FileCopy />} /> duplicate...</span>
        }
    ]
  
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