import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  COPY_STATE,
  defaultUnitSelection,
  getCheckboxClickHandlerGenerator,
  unitSelectionReducer,
  useSelectedUnitIds,
} from "../context-unit-selection";

// In practice we freeze the controls when the local selection is being used, but this component could theoretically support a separate selector.
const useLocalSelectedUnitIds = () => {
  const [selectionLocked, setSelectionLocked] = useState<boolean>(false);
  const toggleSelectionLocked = useCallback(() => {
    setSelectionLocked((a) => !a);
  }, []);
  const {
    selectedUnitIds,
    currentUnitId,
    orderedUnitIds,
    visibleUnitIds,
    primarySortRule,
    checkboxClickHandlerGenerator,
    unitIdSelectionDispatch,
    currentState,
  } = useSelectedUnitIds();
  const [localSelectedUnitIds, localUnitIdSelectionDispatch] = useReducer(
    unitSelectionReducer,
    defaultUnitSelection,
  );

  useEffect(() => {
    if (!selectionLocked) {
      localUnitIdSelectionDispatch({
        type: COPY_STATE,
        sourceState: currentState,
      });
    }
  }, [currentState, selectionLocked]);

  const generator = useMemo(() => {
    return selectionLocked
      ? getCheckboxClickHandlerGenerator(localUnitIdSelectionDispatch)
      : checkboxClickHandlerGenerator;
  }, [selectionLocked, checkboxClickHandlerGenerator]);

  const realizedPrimarySortRule = useMemo(() => {
    const localRule =
      localSelectedUnitIds.sortRules &&
      localSelectedUnitIds.sortRules.length > 0
        ? localSelectedUnitIds.sortRules[
            localSelectedUnitIds.sortRules.length - 1
          ]
        : undefined;
    return selectionLocked ? localRule : primarySortRule;
  }, [selectionLocked, primarySortRule, localSelectedUnitIds]);

  return {
    selectedUnitIds: selectionLocked
      ? localSelectedUnitIds.selectedUnitIds
      : selectedUnitIds,
    currentUnitId: selectionLocked
      ? localSelectedUnitIds.currentUnitId
      : currentUnitId,
    orderedUnitIds: selectionLocked
      ? localSelectedUnitIds.orderedUnitIds
      : orderedUnitIds,
    visibleUnitIds: selectionLocked
      ? localSelectedUnitIds.visibleUnitIds
      : visibleUnitIds,
    unitIdSelectionDispatch: selectionLocked
      ? localUnitIdSelectionDispatch
      : unitIdSelectionDispatch,
    primarySortRule: realizedPrimarySortRule,
    checkboxClickHandlerGenerator: generator,
    selectionLocked,
    toggleSelectionLocked,
  };
};

export default useLocalSelectedUnitIds;
