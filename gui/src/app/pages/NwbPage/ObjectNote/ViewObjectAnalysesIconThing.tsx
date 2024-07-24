import { FunctionComponent, useMemo } from "react"
import useContextAnnotations from "../NeurosiftAnnotations/useContextAnnotations"
import { SmallIconButton } from "@fi-sci/misc"
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window"
import { Assessment } from "@mui/icons-material"
import ObjectAnalysesView from "./ObjectAnalysesView"

type ViewObjectAnalysesIconThingProps = {
    objectPath?: string
    previewText?: boolean
}

const ViewObjectAnalysesIconThing: FunctionComponent<ViewObjectAnalysesIconThingProps> = ({objectPath, previewText}) => {
    const {contextAnnotations} = useContextAnnotations()
    const theseAnalyses = useMemo(() => {
        if (!contextAnnotations) return undefined
        return  contextAnnotations.filter(a => a.annotationType === 'jpfiddle' && (!objectPath || a.annotation.objectPath === objectPath))
    }, [contextAnnotations, objectPath])

    const {handleOpen: openAnalyses, handleClose: closeAnalyses, visible: analysesVisible} = useModalWindow()

    if (!contextAnnotations) return <span />
    return (
        <div>
            <span style={{color: theseAnalyses && theseAnalyses.length > 0 ? '#242' : 'gray'}}>
                <SmallIconButton
                    icon={<Assessment />}
                    title={!objectPath ? 'Open analyses' : objectPath === '/' ? 'Open top-level analyses for this file' : `Open analyses for ${objectPath}`}
                    onClick={() => {
                        openAnalyses()
                    }}
                />
            </span>
            {
                previewText && theseAnalyses && theseAnalyses[0] && <span>&nbsp;&nbsp;{theseAnalyses[0].annotation.text}</span>
            }
            <ModalWindow
                visible={analysesVisible}
                onClose={closeAnalyses}
            >
                <ObjectAnalysesView objectPath={objectPath} onClose={closeAnalyses} />
            </ModalWindow>
        </div>
    )
}

export default ViewObjectAnalysesIconThing