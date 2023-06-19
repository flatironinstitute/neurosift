const ff = 255
const d8 = 216
const d9 = 217

// Split an mjpeg stream into individual frames
const splitMjpeg = (data: ArrayBuffer): ArrayBuffer[] => {
    const x = new Uint8Array(data)
    const ret: ArrayBuffer[] = []
    let i = 0
    while (i < x.length) {
        const b1 = x[i]
        const b2 = x[i + 1]
        if ((b1 === ff) && (b2 === d8)) {
            let j = i + 2
            while (j < x.length) {
                const c1 = x[j]
                const c2 = x[j + 1]
                if ((c1 == ff) && (c2 == d9)) {
                    ret.push(x.slice(i, j + 2).buffer)
                    j += 2
                    break
                }
                j += 1
            }
            i = j
        }
        else {
            i += 1
        }
    }
    return ret
}

export default splitMjpeg