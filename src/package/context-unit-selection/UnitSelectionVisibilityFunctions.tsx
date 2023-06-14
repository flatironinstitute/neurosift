import { UnitSelection, UnitSelectionAction } from "./UnitSelectionContext"

export const DEFAULT_UnitS_PER_PAGE = 20

export const setVisibleUnits = (s: UnitSelection, a: UnitSelectionAction): UnitSelection => {
    // If visible Units are manually specified, just assume caller knows what they're doing.
    if (a.newVisibleUnitIds && a.newVisibleUnitIds.length > 0) return { ...s, visibleUnitIds: a.newVisibleUnitIds }

    const newWindowSize = a.unitsPerPage || s.unitsPerPage || DEFAULT_UnitS_PER_PAGE
    const newPage = a.pageNumber || s.page || 1
    
    // Degenerate case: caller didn't ask us to do anything, so return identity.
    if (newWindowSize === s.unitsPerPage && newPage === s.page) return s

    // if the new page explicitly differs from the old, use that regardless; otherwise use the page under
    // the new window size that will contain the first Unit under the old window size.
    const realizedStartingPage = newPage !== s.page
        ? newPage
        : 1 + Math.floor(((s.unitsPerPage || DEFAULT_UnitS_PER_PAGE) * (newPage - 1)) / newWindowSize)
    const windowStart = newWindowSize * (realizedStartingPage - 1)

    return {
        ...s,
        page: realizedStartingPage,
        unitsPerPage: newWindowSize,
        visibleUnitIds: s.orderedUnitIds.slice(windowStart, windowStart + newWindowSize)
    }
}

export const setRestrictedUnits = (s: UnitSelection, a: UnitSelectionAction): UnitSelection => {
    return {
        ...s,
        restrictedUnitIds: a.newRestrictedUnitIds,
        selectedUnitIds: a.newRestrictedUnitIds !== undefined && (s.selectedUnitIds !== undefined) ? (
            new Set([...s.selectedUnitIds].filter(id => ((!a.newRestrictedUnitIds) || (a.newRestrictedUnitIds.includes(id)))))
        ) : s.selectedUnitIds
    }
}

export const getVisibleUnitsOnSortUpdate = (s: UnitSelection, newOrder: (number | string)[]) => {
    const windowStart = (s.unitsPerPage || DEFAULT_UnitS_PER_PAGE) * ((s.page || 1) - 1)
    return (s.visibleUnitIds && s.visibleUnitIds.length > 0)
        ? newOrder.slice(windowStart, windowStart + (s.unitsPerPage || DEFAULT_UnitS_PER_PAGE))
        : undefined
}
