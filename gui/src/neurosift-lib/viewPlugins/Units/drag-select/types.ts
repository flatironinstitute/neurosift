/* eslint-disable @typescript-eslint/no-explicit-any */

import { isNumber } from "@fi-sci/misc";

export type Vec2 = number[];
export const isVec2 = (x: any): x is Vec2 => {
  if (x && Array.isArray(x) && x.length === 2) {
    for (const a of x) {
      if (!isNumber(a)) return false;
    }
    return true;
  } else return false;
};

export type Vec3 = number[];
export const isVec3 = (x: any): x is Vec3 => {
  if (x && Array.isArray(x) && x.length === 3) {
    for (const a of x) {
      if (!isNumber(a)) return false;
    }
    return true;
  } else return false;
};

export type Vec4 = number[];
export const isVec4 = (x: any): x is Vec4 => {
  if (x && Array.isArray(x) && x.length === 4) {
    for (const a of x) {
      if (!isNumber(a)) return false;
    }
    return true;
  } else return false;
};
