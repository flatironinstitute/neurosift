import { SortingCuration } from "./SortingCurationContext";

export interface AddUnitLabelCurationAction {
  type: "ADD_UNIT_LABEL";
  unitId: number | string | (number | string)[];
  label: string;
}

export interface ToggleUnitLabelCurationAction {
  type: "TOGGLE_UNIT_LABEL";
  unitId: number | string | (number | string)[];
  label: string;
}

export interface RemoveUnitLabelCurationAction {
  type: "REMOVE_UNIT_LABEL";
  unitId: number | string | (number | string)[];
  label: string;
}

export interface MergeUnitsCurationAction {
  type: "MERGE_UNITS";
  unitIds: (number | string)[];
}

export interface UnmergeUnitsCurationAction {
  type: "UNMERGE_UNITS";
  unitIds: (number | string)[];
}

export interface SetCurationCurationAction {
  type: "SET_CURATION";
  curation: SortingCuration;
}

export interface CloseCurationCurationAction {
  type: "CLOSE_CURATION";
}

export interface ReopenCurationCurationAction {
  type: "REOPEN_CURATION";
}

type SortingCurationAction =
  | AddUnitLabelCurationAction
  | ToggleUnitLabelCurationAction
  | RemoveUnitLabelCurationAction
  | MergeUnitsCurationAction
  | UnmergeUnitsCurationAction
  | SetCurationCurationAction
  | CloseCurationCurationAction
  | ReopenCurationCurationAction;

export default SortingCurationAction;
