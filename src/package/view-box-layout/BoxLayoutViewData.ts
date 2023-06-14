import { isEqualTo, isString, validateObject, isOneOf, isBoolean, optional, isArrayOf, isNumber } from "@figurl/core-utils"

export type BoxLayoutViewData = {
    type: 'neurosift.BoxLayout'
    direction: 'horizontal' | 'vertical'
    scrollbar: boolean
    show_titles: boolean
    items: {
        view: any
        properties: {
            stretch?: number
            minSize?: number
            maxSize?: number
            title?: string
            collapsible?: boolean
        }
    }[]
}

export const isBoxLayoutViewData = (x: any): x is BoxLayoutViewData => {
    return validateObject(x, {
        type: isEqualTo('neurosift.BoxLayout'),
        direction: isOneOf([isEqualTo('horizontal'), isEqualTo('vertical')]),
        scrollbar: isBoolean,
        show_titles: isBoolean,
        items: isArrayOf(y => (validateObject(y, {
            view: () => (true),
            properties: z => (validateObject(z, {
                stretch: optional(isNumber),
                minSize: optional(isNumber),
                maxSize: optional(isNumber),
                title: optional(isString),
                collapsible: optional(isBoolean)
            }))
        })))
    })
}