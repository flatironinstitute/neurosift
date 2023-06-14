export const idToNum = (a: any): number => {
    if (typeof(a) === 'number') return a
    else if (typeof(a) === 'string') {
        const b = stripLeadingNonNumeric(a)
        try {
            const x = parseFloat(b)
            if (!isNaN(x)) return x
            else return 0
        }
        catch {
            return 0
        }
    }
    else return 0
}

const stripLeadingNonNumeric = (a: string) => {
    let i = 0
    while ((i < a.length) && (isNonNumeric(a[i]))) {
        i ++
    }
    return a.slice(i)
}

const isNonNumeric = (a: string) => {
    return isNaN(parseFloat(a))
}