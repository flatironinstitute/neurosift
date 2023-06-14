import { randomAlphaString } from "@figurl/core-utils"
import React, { useCallback, useContext, useMemo } from "react"
import AnnotationAction from "./AnnotationAction"

export type Annotation = {
    type: 'timepoint'
    annotationId: string
    label: string
    timeSec: number
    color?: string
} | {
    type: 'time-interval'
    annotationId: string
    label: string
    timeIntervalSec: [number, number]
    fillColor?: string
    strokeColor?: string
}

export type AnnotationState = {
    annotations: Annotation[]
}

export const defaultAnnotationState: AnnotationState = {
    annotations: []
}

export const annotationReducer = (s: AnnotationState, a: AnnotationAction): AnnotationState => {
    if (a.type === 'addAnnotation') {
        return {
            ...s,
            annotations: [...s.annotations, a.annotation]
        }
    }
    else if (a.type === 'removeAnnotation') {
        return {
            ...s,
            annotations: s.annotations.filter(x => (x.annotationId !== a.annotationId))
        }
    }
    else if (a.type === 'setAnnotationLabel') {
        return {
            ...s,
            annotations: s.annotations.map(x => (x.annotationId === a.annotationId ? {...x, label: a.label} : x))
        }
    }
    else if (a.type === 'setAnnotationState') {
        return {
            ...a.annotationState
        }
    }
    else return s
}

const AnnotationContext = React.createContext<{
    annotationState?: AnnotationState,
    annotationDispatch?: (action: AnnotationAction) => void
}>({})

export const useAnnotations = () => {
    const c = useContext(AnnotationContext)
    const addAnnotation = useCallback((annotation: Annotation) => {
        if (!annotation.annotationId) {
            annotation.annotationId = randomAlphaString(10)
        }
        c.annotationDispatch && c.annotationDispatch({
            type: 'addAnnotation',
            annotation
        })
    }, [c])
    const removeAnnotation = useCallback((annotationId: string) => {
        c.annotationDispatch && c.annotationDispatch({
            type: 'removeAnnotation',
            annotationId
        })
    }, [c])
    const setAnnotationLabel = useCallback((annotationId: string, label: string) => {
        c.annotationDispatch && c.annotationDispatch({
            type: 'setAnnotationLabel',
            annotationId,
            label
        })
    }, [c])
    return useMemo(() => ({
        annotations: c.annotationState?.annotations || [],
        addAnnotation,
        removeAnnotation,
        setAnnotationLabel
    }), [c.annotationState, addAnnotation, removeAnnotation, setAnnotationLabel])
}

export default AnnotationContext