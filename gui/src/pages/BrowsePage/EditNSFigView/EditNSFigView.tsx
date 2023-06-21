import yaml from 'js-yaml';
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import Splitter from '../../../components/Splitter';
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import { directoryOfFile } from '../FileView/NSFigFileView';
import NSFigView from '../FileView/NSFigView/NSFigView';
import { isNSFigViewData, NSFigLayout, NSFigViewData } from "../FileView/NSFigView/NSFigViewData";
import TextEditor from '../FileView/TextEditor/TextEditor';

type Props = {
    width: number
    height: number
    filePath: string
}

const EditNSFigView: FunctionComponent<Props> = ({width, height, filePath}) => {
    const [yamlText, setYamlText] = useState<string | undefined>(undefined)
    const [editedYamlText, setEditedYamlText] = useState<string | undefined>(undefined)
    useEffect(() => {
        setEditedYamlText(yamlText)
    }, [yamlText])

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
            setYamlText(txt)
        })()
        return () => {canceled = true}
    }, [client, filePath])

    const [viewData, setViewData] = useState<NSFigViewData | undefined>(undefined)

    useEffect(() => {
        if (!editedYamlText) {
            setViewData(undefined)
            return
        }
        try {
            const d = yaml.load(editedYamlText)
            if (!isNSFigViewData(d)) {
                console.warn(d)
                console.warn('Invalid nsfig view data')
                setViewData(undefined)
                return
            }
            setViewData(d)
        }
        catch (err) {
            console.warn(err)
            console.warn('Error parsing yaml')
            setViewData(undefined)
            return
        }
    }, [editedYamlText])

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

    return (
        <Splitter
            width={width}
            height={height}
            initialPosition={Math.min(1200, Math.max(200, width / 2))}
        >
            <TextEditor
                text={yamlText}
                onSaveText={() => {}}
                editedText={editedYamlText}
                onSetEditedText={setEditedYamlText}
                language="yaml"
                readOnly={false}
                wordWrap={false}
                label={filePath.slice(directoryOfFile(filePath).length + 1)}
                fontSize={13}
                width={0}
                height={0}
            />
            <NSFigView
                path={directoryOfFile(filePath)}
                data={viewData2}
                width={0}
                height={0}
            />
        </Splitter>
    )
}

export default EditNSFigView