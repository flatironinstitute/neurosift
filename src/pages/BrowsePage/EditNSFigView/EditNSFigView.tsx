import yaml from 'js-yaml';
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import { directoryOfFile } from '../FileView/NSFigFileView';
import NSFigView from '../FileView/NSFigView/NSFigView';
import { isNSFigViewData, NSFigLayout, NSFigViewData } from "../FileView/NSFigView/NSFigViewData";

type Props = {
    width: number
    height: number
    filePath: string
}

const EditNSFigView: FunctionComponent<Props> = ({width, height, filePath}) => {
    const [text, setText] = useState<string | undefined>(undefined)

    const {client} = useRtcshare()

    useEffect(() => {
        let canceled = false
        if (!client) return
        ; (async () => {
            const buf = await client.readFile(filePath)
            if (canceled) return
            // array buffer to text
            const decoder = new TextDecoder('utf-8')
            const txt = decoder.decode(buf)
            setText(txt)
        })()
        return () => {canceled = true}
    }, [client, filePath])

    const [viewData, setViewData] = useState<NSFigViewData | undefined>(undefined)

    useEffect(() => {
        if (!text) return
        // parse yaml text
        const d = yaml.load(text)
        if (!isNSFigViewData(d)) {
            console.warn(d)
            console.warn('Invalid nsfig view data')
            return
        }
        setViewData(d)
    }, [text])

    const viewData2: NSFigViewData | undefined = useMemo(() => {
        if (!viewData) return undefined
        const adjustLayout = (layout: NSFigLayout | string): NSFigLayout | string => {
            if (typeof (layout) === 'string') return layout
            if (layout.type === 'Box') {
                return {
                    ...layout,
                    items: layout.items.map(item => ({
                        ...item,
                        view: adjustLayout(item.view)
                    })),
                    editNSFigMode: true
                }
            }
            else if (layout.type === 'Splitter') {
                return {
                    ...layout,
                    item1: {
                        ...layout.item1,
                        view: adjustLayout(layout.item1.view)
                    },
                    item2: {
                        ...layout.item2,
                        view: adjustLayout(layout.item2.view)
                    },
                    editNSFigMode: true
                }
            }
            else return layout
        }
        return {
            ...viewData,
            layout: adjustLayout(viewData.layout) as NSFigLayout,
            views: viewData.views.map(v => ({
                type: 'EditNSFigViewItem',
                name: v.name,
                view: v
            }))
        }
    }, [viewData])

    if (!viewData2) {
        return <div>...</div>
    }

    return (
        <NSFigView
            path={directoryOfFile(filePath)}
            data={viewData2}
            width={width}
            height={height}
        />
    )
}

export default EditNSFigView