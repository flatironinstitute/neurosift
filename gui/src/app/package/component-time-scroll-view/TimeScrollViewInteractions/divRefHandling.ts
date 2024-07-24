
export const divExists = (divRef: React.MutableRefObject<HTMLDivElement | null>) => {
    if (!divRef || !divRef.current || divRef.current === null) return false
    return true
}

export const setDivFocus = (divRef: React.MutableRefObject<HTMLDivElement | null>) => {
    if (!divExists(divRef)) return
    const div = divRef.current as any
    div['_hasFocus'] = true
}

export const clearDivFocus = (divRef: React.MutableRefObject<HTMLDivElement | null>) => {
    if (!divExists(divRef)) return
    const div = divRef.current as any
    div['_hasFocus'] = false
}