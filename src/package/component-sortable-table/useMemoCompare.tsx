import { useEffect, useRef } from 'react'

export type ComparatorFn<T> = (a: T, b: T) => boolean
// Code largely from https://usehooks.com/useMemoCompare/
export const useMemoCompare = <T, >(label: string, next: T, fallback: T, compare: ComparatorFn<T> = compareDataObject) => {
    const previousRef = useRef<T>()
    const previous = previousRef.current
    // const compareFn = compare ?? compareDataObject

    const isEqual = previous && compare(previous, next)

    useEffect(() => {
        if (!isEqual) {
            console.log(`Caught value change for ${label}`)
            previousRef.current = next
        }
    })

    return (isEqual ? previous : next) || fallback
}

const compareDataObject = (a: any, b: any): boolean => {
    // return JSONStringifyDeterministic(a) === JSONStringifyDeterministic(b)
    return stringifyDeterministicWithSortedKeys(a) === stringifyDeterministicWithSortedKeys(b)
}

// Thanks: https://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify
export const stringifyDeterministicWithSortedKeys = ( obj: {[key: string]: any} ) => {
    var allKeys: string[] = []
    JSON.stringify( obj, function( key, value ){ allKeys.push( key ); return value; } )
    allKeys.sort()
    const space = undefined
    return JSON.stringify(obj, allKeys, space)
}
// Example: stringifyDeterministicWithSortedKeys({b: 1, a: 0, d: [3, 5, {y: 1, x: 0}], c: '55'}) => `{"a":0,"b":1,"c":"55","d":[3,5,{"x":0,"y":1}]}`
