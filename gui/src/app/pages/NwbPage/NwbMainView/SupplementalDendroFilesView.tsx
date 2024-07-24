import { FunctionComponent, useCallback } from "react"
import { DendroFile } from "../../../dendro/dendro-types"
import { timeAgoString } from "../../../timeStrings"
import { Hyperlink } from "@fi-sci/misc"
import { useSupplementalDendroFiles } from "../SupplementalDendroFilesContext"

type SupplementalDendroFilesViewProps = {
    //
}

const SupplementalDendroFilesView: FunctionComponent<SupplementalDendroFilesViewProps> = () => {
    const {supplementalFiles: files, setSelectedSupplementalFileIds, selectedSupplementalFileIds} = useSupplementalDendroFiles()
    const openSupplementalFile = useCallback((file: DendroFile) => {
        if (file.content.startsWith('url:')) {
            const url0 = file.content.substring('url:'.length)
            let url = `${window.location.protocol}//${window.location.host}/?p=/nwb&url=${url0}&st=lindi`
            if (file.metadata.dandisetId) {
                url += `&dandisetId=${file.metadata.dandisetId}`
            }
            if (file.metadata.dandisetVersion) {
                url += `&dandisetVersion=${file.metadata.dandisetVersion}`
            }
            if (file.metadata.dandiAssetId) {
                url += `&dandiAssetId=${file.metadata.dandiAssetId}`
            }
            window.location.href = url
        } else {
            alert(`File content does not start with "url:": ${file.content}`)
        }
    }, [])
    return (
        <div>
            <h3>Supplemental Dendro files</h3>
            <table className="nwb-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>Project</th>
                        <th>User</th>
                        <th>File</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    {(files || []).map((file, i) => (
                        <tr key={i}>
                            <td>
                                <Checkbox checked={selectedSupplementalFileIds.includes(file.fileId)} onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedSupplementalFileIds([...selectedSupplementalFileIds, file.fileId])
                                    } else {
                                        setSelectedSupplementalFileIds(selectedSupplementalFileIds.filter(id => id !== file.fileId))
                                    }
                                }} />
                            </td>
                            <td>{file.projectId}</td>
                            <td>{file.userId}</td>
                            <td>
                                <Hyperlink
                                    onClick={() => {
                                        openSupplementalFile(file)
                                    }}
                                >
                                    {file.fileName}
                                </Hyperlink>
                            </td>
                            <td>{timeAgoString(file.timestampCreated)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

type CheckboxProps = {
    checked: boolean
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const Checkbox: FunctionComponent<CheckboxProps> = ({checked, onChange}) => {
    return (
        <input type="checkbox" checked={checked} onChange={onChange} />
    )
}

export default SupplementalDendroFilesView
