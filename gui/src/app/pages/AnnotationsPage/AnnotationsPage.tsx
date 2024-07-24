import { FunctionComponent, useEffect, useState } from "react";
import useNeurosiftAnnotations from "../../NeurosiftAnnotations/useNeurosiftAnnotations";
import { GetAnnotationsRequest, NeurosiftAnnotation, isGetAnnotationsResponse } from "../NwbPage/NeurosiftAnnotations/types";
import { neurosiftAnnotationsApiUrl } from "../NwbPage/NeurosiftAnnotations/useContextAnnotations";
import { timeAgoString } from "../../timeStrings";
import { FiddleAnnotationView } from "../NwbPage/ObjectNote/ObjectAnalysesView";
import { Hyperlink } from "@fi-sci/misc";
import useRoute from "../../useRoute";
import { NeurosiftAnnotationsLoginView } from "../../ApiKeysWindow/ApiKeysWindow";

type AnnotationsPageProps = {
    width: number;
    height: number;
}

const AnnotationsPage: FunctionComponent<AnnotationsPageProps> = ({ width, height }) => {
    const { neurosiftAnnotationsUserId } = useNeurosiftAnnotations()
    const { annotations } = useAnnotationsForUser(neurosiftAnnotationsUserId)
    const { setRoute } = useRoute()

    if (!neurosiftAnnotationsUserId) {
        return (
            <div style={{padding: 20}}>
                <NeurosiftAnnotationsLoginView />
            </div>
        )
    }
    if (!annotations) {
        return (
            <div>
                <p>Loading annotations...</p>
            </div>
        )
    }
    return (
        <div style={{ position: 'absolute', width, height, backgroundColor: '#fff', overflowY: 'auto' }}>
            <div style={{padding: 20}}>
                <div>
                    <NeurosiftAnnotationsLoginView />
                </div>
                <table className="nwb-table">
                    <thead>
                        <tr>
                            <th>Created</th>
                            <th>Type</th>
                            <th>Dandiset</th>
                            <th>Asset</th>
                            <th>Content</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            annotations.map((annotation) => (
                                <tr key={annotation.annotationId}>
                                    <td>{timeAgoString(annotation.timestampCreated / 1000)}</td>
                                    <td>{annotation.annotationType}</td>
                                    <td>{annotation.dandisetId && (
                                        <Hyperlink
                                            onClick={() => {
                                                setRoute({ page: 'dandiset', dandisetId: annotation.dandisetId || '', dandisetVersion: annotation.dandisetVersion || '' })
                                            }}
                                        >
                                            {annotation.dandisetId} ({annotation.dandisetVersion})
                                        </Hyperlink>
                                    )}</td>
                                    <td>{annotation.assetPath && (
                                        <Hyperlink
                                            onClick={() => {
                                                setRoute({
                                                    page: 'nwb',
                                                    dandisetId: annotation.dandisetId || '',
                                                    dandisetVersion: annotation.dandisetVersion || '',
                                                    dandiAssetId: annotation.assetId || '',
                                                    url: [urlFromAssetId(annotation.assetId || '')],
                                                    storageType: [(annotation.assetPath || '').endsWith('.json') ? 'lindi' : 'h5']
                                                })
                                            }}
                                        >
                                            {annotation.assetPath}
                                        </Hyperlink>

                                    )}</td>
                                    <td>
                                        <AnnotationContentView annotation={annotation} />
                                    </td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const useAnnotationsForUser = (userId?: string) => {
    const [annotations, setAnnotations] = useState<NeurosiftAnnotation[] | undefined>(undefined)

    useEffect(() => {
        if (!userId) {
            setAnnotations(undefined)
            return
        }
        const fetchAnnotations = async () => {
            const url = `${neurosiftAnnotationsApiUrl}/api/getAnnotations`
            const req: GetAnnotationsRequest = {
                userId
            }
            const r = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(req)
            })
            if (!r.ok) {
                console.error('Failed to fetch annotations', r)
                return
            }
            const resp = await r.json()
            if (!isGetAnnotationsResponse(resp)) {
                console.error('Unexpected response', resp)
                return
            }
            resp.annotations.sort((a, b) => b.timestampCreated - a.timestampCreated)
            setAnnotations(resp.annotations)
        }
        fetchAnnotations()
    }, [userId])

    return { annotations }
}

type AnnotationContentViewProps = {
    annotation: NeurosiftAnnotation
}

const AnnotationContentView: FunctionComponent<AnnotationContentViewProps> = ({ annotation }) => {
    if (annotation.annotationType === 'note') {
        return (
            <span>
                {abbreviate(annotation.annotation.text, 1000)}
            </span>
        )
    }
    else if (annotation.annotationType === 'jpfiddle') {
        return (
            <FiddleAnnotationView
                annotation={annotation.annotation}
                onRemove={undefined}
            />
        )
    }
    else {
        return <span>Unknown annotation type: {annotation.annotationType}</span>
    }
}

const abbreviate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) {
        return text
    }
    return text.slice(0, maxLength) + '...'
}

const urlFromAssetId = (assetId: string) => {
    if (!assetId) return ''
    return `https://api.dandiarchive.org/api/assets/${assetId}/download/`
}

export default AnnotationsPage