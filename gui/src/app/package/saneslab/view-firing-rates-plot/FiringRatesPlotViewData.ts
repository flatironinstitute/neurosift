/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  isArrayOf,
  isEqualTo,
  isNumber,
  isOneOf,
  isString,
  optional,
  isBoolean,
  validateObject,
} from "@fi-sci/misc";

type FRPlotData = {
  unitId: number | string;
  spikeTimesSec: number[];
};

const isFRPlotData = (x: any): x is FRPlotData => {
  return validateObject(x, {
    unitId: isOneOf([isNumber, isString]),
    spikeTimesSec: isArrayOf(isNumber),
  });
};

export type FiringRatesPlotViewData = {
  type: "saneslab.FiringRatesPlot";
  startTimeSec: number;
  endTimeSec: number;
  plots: FRPlotData[];
  hideToolbar?: boolean;
};

export const isFiringRatesPlotViewData = (
  x: any,
): x is FiringRatesPlotViewData => {
  return validateObject(x, {
    type: isEqualTo("saneslab.FiringRatesPlot"),
    startTimeSec: isNumber,
    endTimeSec: isNumber,
    plots: isArrayOf(isFRPlotData),
    hideToolbar: optional(isBoolean),
  });
};
