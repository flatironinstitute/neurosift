const formatByteCount = (a: number | undefined) => {
    if (a === undefined) return ''
    if (a < 10000) {
        return `${a} bytes`
    }
    else if (a < 100 * 1000) {
        return `${formatNum(a / 1000)} KiB`
    }
    else if (a < 100 * 1000 * 1000) {
        return `${formatNum(a / (1000 * 1000))} MiB`
    }
    else if (a < 100 * 1000 * 1000 * 1000) {
        return `${formatNum(a / (1000 * 1000 * 1000))} GiB`
    }
    else {
        return `${formatNum(a / (1000 * 1000 * 1000))} GiB`
    }
}

export const formatGiBCount = (a: number) => {
    return formatByteCount(a * 1000 * 1000 * 1000)
}

const formatNum = (a: number) => {
    const b = a.toFixed(2)
    if (Number(b) - Math.floor(Number(b)) === 0) {
        return a.toFixed(0)
    }
    else return b
}

export default formatByteCount