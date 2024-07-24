import { UnitSelection, UnitSelectionAction } from "./UnitSelectionContext";
import { SortingRule } from "./UnitSelectionTypes";
import { getVisibleUnitsOnSortUpdate } from "./UnitSelectionVisibilityFunctions";

export const resetUnitOrder = (
  s: UnitSelection,
  a: UnitSelectionAction,
): UnitSelection => {
  const { newUnitOrder } = a;
  const { orderedUnitIds } = s;
  if (!newUnitOrder || newUnitOrder.length === 0)
    throw Error("Attempt to reset unit ordering to empty set.");
  const oldUnits = new Set<number | string>(orderedUnitIds);
  if (
    oldUnits.size > 0 &&
    (newUnitOrder.length !== oldUnits.size ||
      newUnitOrder.some((id) => !oldUnits.has(id)))
  ) {
    throw Error(
      "Reordering units, but the set of units in the new and old ordering don't match.",
    );
  }
  // If nothing actually changed, return identity. Prevents infinite loops.
  if (orderedUnitIds.every((r, ii) => r === newUnitOrder[ii])) return s;
  // If pagination is active, changing the ordering should change the set of unit indices that's visible.
  const visibleUnitIds = getVisibleUnitsOnSortUpdate(s, newUnitOrder);
  return {
    ...s,
    orderedUnitIds: newUnitOrder,
    lastClickedId: undefined,
    visibleUnitIds: visibleUnitIds,
    sortRules: [], // clear these out, since we have no guarantee they determined the current sort order
  };
};

// This one tracks the sort field order and uses a callback to get the resulting sorted unit ordering.
export const updateSort = (
  s: UnitSelection,
  a: UnitSelectionAction,
): UnitSelection => {
  const { sortRules } = s;
  const { newSortField, sortCallback } = a;
  if (newSortField === undefined || sortCallback === undefined)
    throw Error(
      "Attempt to update sort fields with undefined field or callback.",
    );
  const newSortRules = addFieldToSortRules(
    sortRules || [],
    newSortField,
    a.ascending,
  );
  const newOrder = sortCallback(newSortRules);
  const newVisibleUnits = getVisibleUnitsOnSortUpdate(s, newOrder);
  return {
    ...s,
    sortRules: newSortRules,
    orderedUnitIds: newOrder,
    visibleUnitIds: newVisibleUnits,
    lastClickedId: undefined,
  };
};

export const addFieldToSortRules = (
  rules: SortingRule[],
  newField: string,
  ascending: boolean | undefined,
): SortingRule[] => {
  const lastItem = rules.pop();

  const newItemAscending =
    ascending === undefined
      ? lastItem?.columnName === newField
        ? !lastItem.sortAscending
        : true
      : ascending;
  if (lastItem && lastItem.columnName !== newField) {
    rules.push(lastItem);
  }
  const newRules = rules.filter((r) => r.columnName !== newField);
  return [
    ...newRules,
    { columnName: newField, sortAscending: newItemAscending },
  ];
};
