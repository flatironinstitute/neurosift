import { Annotation, AnnotationState } from "./AnnotationContext"

type AnnotationAction = {
    type: 'addAnnotation'
    annotation: Annotation
} | {
    type: 'removeAnnotation'
    annotationId: string
} | {
    type: 'setAnnotationLabel'
    annotationId: string
    label: string
} | {
    type: 'setAnnotationState',
    annotationState: AnnotationState
}

export default AnnotationAction