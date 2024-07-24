/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  isArrayOf,
  isEqualTo,
  isNumber,
  isOneOf,
  isString,
  optional,
  validateObject,
} from "@fi-sci/misc";

type UTColumn = {
  key: string;
  label: string;
  dtype: string;
};

const isUTColumn = (x: any): x is UTColumn => {
  return validateObject(x, {
    key: isString,
    label: isString,
    dtype: isString,
  });
};

type UTRow = {
  unitId: number | string;
  values: { [key: string]: any };
};

const isUTRow = (x: any): x is UTRow => {
  return validateObject(x, {
    unitId: isOneOf([isNumber, isString]),
    values: () => true,
  });
};

export type UnitsTableViewData = {
  type: "UnitsTable";
  columns: UTColumn[];
  rows: UTRow[];
  similarityScores?: {
    unitId1: number | string;
    unitId2: number | string;
    similarity: number;
  }[];
};

export const isUnitsTableViewData = (x: any): x is UnitsTableViewData => {
  return validateObject(x, {
    type: isEqualTo("UnitsTable"),
    columns: isArrayOf(isUTColumn),
    rows: isArrayOf(isUTRow),
    similarityScores: optional(
      isArrayOf((y) =>
        validateObject(y, {
          unitId1: isOneOf([isNumber, isString]),
          unitId2: isOneOf([isNumber, isString]),
          similarity: isNumber,
        }),
      ),
    ),
  });
};
