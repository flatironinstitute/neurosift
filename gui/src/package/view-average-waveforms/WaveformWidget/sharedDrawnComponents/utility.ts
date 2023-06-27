

export const isNumber = (x: any): x is number => {
    return ((x !== null) && (x !== undefined) && (typeof(x) === 'number'))
}

export const isString = (x: any): x is string => {
    return ((x !== null) && (x !== undefined) && (typeof(x) === 'string'))
}

export const getArrayMin = (array: number[]) => {
    return array.reduce((min: number, current: number) => min <= current ? min : current, Infinity)
}

export const getArrayMax = (array: number[]) => {
    return array.reduce((max: number, current: number) => max >= current ? max : current, -Infinity)
}
