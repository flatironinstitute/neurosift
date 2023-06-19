export type SortingRule = {
    columnName: string,
    sortAscending: boolean
}

export type SortingCallback = (rules: SortingRule[]) => (number | string)[]