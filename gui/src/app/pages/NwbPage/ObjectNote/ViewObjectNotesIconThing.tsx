import { FunctionComponent, useMemo } from "react"
import useContextAnnotations from "../NeurosiftAnnotations/useContextAnnotations"
import { SmallIconButton } from "@fi-sci/misc"
import { Note } from "@mui/icons-material"
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window"
import ObjectNotesView from "./ObjectNotesView"

type ViewObjectNotesIconThingProps = {
    objectPath?: string
    previewText?: boolean
}

const ViewObjectNotesIconThing: FunctionComponent<ViewObjectNotesIconThingProps> = ({objectPath, previewText}) => {
    const {contextAnnotations} = useContextAnnotations()
    const theseNotes = useMemo(() => {
        if (!contextAnnotations) return undefined
        return  contextAnnotations.filter(a => a.annotationType === 'note' && (!objectPath || a.annotation.objectPath === objectPath))
    }, [contextAnnotations, objectPath])

    const {handleOpen: openNotes, handleClose: closeNotes, visible: notesVisible} = useModalWindow()

    if (!contextAnnotations) return <span />
    return (
        <div>
            <span style={{color: theseNotes && theseNotes.length > 0 ? '#242' : 'gray'}}>
                <SmallIconButton
                    icon={<Note />}
                    title={!objectPath ? 'Open notes' : objectPath === '/' ? 'Open top-level notes for this file' : `Open notes for ${objectPath}`}
                    onClick={() => {
                        openNotes()
                    }}
                />
            </span>
            {
                previewText && theseNotes && theseNotes[0] && <span>&nbsp;&nbsp;{theseNotes[0].annotation.text}</span>
            }
            <ModalWindow
                visible={notesVisible}
                onClose={closeNotes}
            >
                <ObjectNotesView objectPath={objectPath} onClose={closeNotes} />
            </ModalWindow>
        </div>
    )
}

export default ViewObjectNotesIconThing