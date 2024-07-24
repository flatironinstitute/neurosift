/* eslint-disable @typescript-eslint/no-explicit-any */
import { isArrayOf, isBoolean, isEqualTo, isNumber, optional, isOneOf, isString, validateObject } from "@fi-sci/misc"

export type CrossCorrelogramData = {
    unitId1: number | string
    unitId2: number | string
    binEdgesSec: number[]
    binCounts: number[]
}

export const isCrossCorrelogramData = (x: any): x is CrossCorrelogramData => {
    return validateObject(x, {
        unitId1: isOneOf([isNumber, isString]),
        unitId2: isOneOf([isNumber, isString]),
        binEdgesSec: isArrayOf(isNumber),
        binCounts: isArrayOf(isNumber)
    },)
}

export type CrossCorrelogramsViewData = {
    type: 'CrossCorrelograms'
    crossCorrelograms: CrossCorrelogramData[]
    hideUnitSelector?: boolean
}

export const isCrossCorrelogramsViewData = (x: any): x is CrossCorrelogramsViewData => {
    return validateObject(x, {
        type: isEqualTo('CrossCorrelograms'),
        crossCorrelograms: isArrayOf(isCrossCorrelogramData),
        hideUnitSelector: optional(isBoolean)
    })
}