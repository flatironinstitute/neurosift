import { Editor } from "@monaco-editor/react";
import { Refresh, Save } from "@mui/icons-material";
import { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useState } from "react";
import Hyperlink from "../../../../components/Hyperlink";
import SmallIconButton from "../../../../components/SmallIconButton";

type Monaco = typeof monaco

type Props = {
    defaultText?: string
    text: string | undefined
    onSaveText: (text: string) => void
    editedText?: string
    onSetEditedText: (text: string) => void
    language: string
    readOnly?: boolean
    wordWrap?: boolean
    onReload?: () => void
    toolbarItems?: ToolbarItem[]
    label: string
    width: number
    height: number
}

export type ToolbarItem = {
    tooltip?: string
    label?: string
    icon?: any
    onClick?: () => void
    color?: string
}

const TextEditor: FunctionComponent<Props> = ({defaultText, text, onSaveText, editedText, onSetEditedText, readOnly, wordWrap, onReload, toolbarItems, language, label, width, height}) => {
    const handleChange = useCallback((value: string | undefined) => {
        onSetEditedText(value || '')
    }, [onSetEditedText])
    const handleSave = useCallback(() => {
        onSaveText(editedText || '')
    }, [editedText, onSaveText])

    //////////////////////////////////////////////////
    // Seems that it is important to set the initial value of the editor
    // this way rather than using defaultValue. The defaultValue approach
    // worked okay until I navigated away and then back to the editors
    // and then everything was blank, and I couldn't figure out what
    // was causing this. But I think this method is more flexible anyway
    // is it gives us access to the editor instance.
    const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | undefined>(undefined)
    useEffect(() => {
        if (!editor) return
        if (editedText === undefined) return
        if (editor.getValue() === editedText) return
        editor.setValue(editedText || defaultText || '')
    }, [editedText, editor, defaultText])
    const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
        (async () => {
            setEditor(editor)
        })()
    }, [])
    /////////////////////////////////////////////////

    // Can't do this in the usual way with monaco editor:
    // See: https://github.com/microsoft/monaco-editor/issues/2947
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault()
            if (!readOnly) {
                handleSave()
            }
        }
    }, [handleSave, readOnly])

    const toolbarHeight = 25
    return (
        <div style={{position: 'absolute', width, height, overflow: 'hidden'}} onKeyDown={handleKeyDown}>
            <NotSelectable>
                <div style={{position: 'absolute', paddingLeft: 20, paddingTop: 3, width: width - 50, height: toolbarHeight, backgroundColor: 'lightgray', overflow: 'hidden'}}>
                    {label}
                    &nbsp;&nbsp;&nbsp;
                    {!readOnly && (
                        <SmallIconButton onClick={handleSave} icon={<Save />} title="Save file" disabled={text === editedText} label="save" />
                    )}
                    &nbsp;&nbsp;&nbsp;
                    {
                        editedText !== text && (
                            <span style={{color: '#a33', fontSize: 12}}>edited</span>
                        )
                    }
                    &nbsp;&nbsp;&nbsp;
                    {readOnly && <span style={{color: 'gray'}}>read only</span>}
                    &nbsp;&nbsp;&nbsp;
                    {onReload && <LowerABit numPixels={2}><Hyperlink onClick={onReload} color="black"><Refresh style={{fontSize: 14}} /></Hyperlink></LowerABit>}
                    &nbsp;&nbsp;&nbsp;
                    {toolbarItems && toolbarItems.map((item, i) => (
                        <ToolbarItemComponent key={i} item={item} />
                    ))}
                </div>
            </NotSelectable>
            <div style={{position: 'absolute', top: toolbarHeight, width, height: height - toolbarHeight}}>
                <Editor
                    width={width}
                    height={height - toolbarHeight}
                    defaultLanguage={language}
                    onChange={handleChange}
                    onMount={handleEditorDidMount}
                    options={{
                        readOnly,
                        domReadOnly: readOnly,
                        wordWrap: wordWrap ? 'on' : 'off',
                        theme: 'vs-stan' // unfortunately we cannot do this on a per-editor basis - it's a global setting
                    }}
                />
            </div>
        </div>
    )
}

const ToolbarItemComponent: FunctionComponent<{item: ToolbarItem}> = ({item}) => {
    const {onClick, color, label, tooltip, icon} = item
    if (icon) {
        return (
            <span>
            <SmallIconButton
                onClick={onClick}
                icon={icon}
                title={tooltip}
                label={label}
            />
            &nbsp;&nbsp;&nbsp;
            </span>
        )
    }
    else {
        if (!onClick) {
            return <span style={{color: color || 'gray'}}>{label}&nbsp;&nbsp;&nbsp;</span>
        }
        return (
            <span>
                <Hyperlink onClick={onClick} color={color || 'gray'}>
                    {label}
                </Hyperlink>
                &nbsp;&nbsp;&nbsp;
            </span>
        )
    }
}

const LowerABit: FunctionComponent<PropsWithChildren<{numPixels: number}>> = ({children, numPixels}) => {
    return (
        <span style={{position: 'relative', top: numPixels}}>
            {children}
        </span>
    )
}

const NotSelectable: FunctionComponent<PropsWithChildren> = ({children}) => {
    return (
        <div style={{userSelect: 'none'}}>
            {children}
        </div>
    )
}


export default TextEditor