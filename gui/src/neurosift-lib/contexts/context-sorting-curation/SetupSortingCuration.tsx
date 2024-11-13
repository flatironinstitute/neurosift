import {
  FunctionComponent,
  KeyboardEventHandler,
  PropsWithChildren,
  useCallback,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useSelectedUnitIds } from "../../contexts/context-unit-selection";
import SortingCurationContext, {
  sortingCurationReducer,
} from "./SortingCurationContext";

type Props = {};

const SetupSortingCuration: FunctionComponent<PropsWithChildren<Props>> = ({
  children,
}) => {
  const [sortingCuration, sortingCurationDispatch] = useReducer(
    sortingCurationReducer,
    {},
  );
  const [labelChoices, setLabelChoices] = useState<string[]>();
  const value = useMemo(
    () => ({
      sortingCuration,
      sortingCurationDispatch,
      labelChoices,
      setLabelChoices,
    }),
    [sortingCuration, sortingCurationDispatch, labelChoices],
  );

  const { selectedUnitIds } = useSelectedUnitIds();

  const handleKeyDown: KeyboardEventHandler = useCallback(
    (e) => {
      if (!e.shiftKey) return;
      if (selectedUnitIds.size === 0) return;
      let num = -1;
      if (e.key === "!")
        num = 1; // 1
      else if (e.key === "@") num = 2;
      else if (e.key === "#") num = 3;
      else if (e.key === "$") num = 4;
      else if (e.key === "%") num = 5;
      else if (e.key === "^") num = 6;
      else if (e.key === "&") num = 7;
      else if (e.key === "*") num = 8;
      else if (e.key === "(") num = 9;
      else if (e.key === ")") num = 10;
      if (num >= 0) {
        if (num - 1 < (labelChoices || []).length) {
          sortingCurationDispatch({
            type: "TOGGLE_UNIT_LABEL",
            label: (labelChoices || [])[num - 1],
            unitId: [...selectedUnitIds],
          });
        }
      }
    },
    [selectedUnitIds, labelChoices],
  );

  return (
    <SortingCurationContext.Provider value={value}>
      <div tabIndex={0} onKeyDown={handleKeyDown}>
        {children}
      </div>
    </SortingCurationContext.Provider>
  );
};

export default SetupSortingCuration;
