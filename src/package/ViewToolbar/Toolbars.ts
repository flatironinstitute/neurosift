export interface ActionItem {
    type: 'button'
    callback: () => void
    title: string
    icon: any
    selected?: boolean
    keyCode?: number
    disabled?: boolean
}

export interface DividerItem {
    type: 'divider'
}

export interface TextItem {
    type: 'text'
    title: string
    content: string | number
    contentSigFigs?: number
    contentAlwaysShowDecimal?: boolean
}
export interface ToggleableItem {
    type: 'toggle'
    subtype: ToggleableItemType
    callback: () => void
    title: string
    selected?: boolean
    keyCode?: number
    disabled?: boolean
}

export const Divider: DividerItem = { type: 'divider' }

export type ToggleableItemType = 'checkbox' | 'slider'

export type ToolbarItem = ActionItem | ToggleableItem | DividerItem | TextItem