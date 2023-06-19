import pako from 'pako'

async function deserializeReturnValue(x: any): Promise<any> {
    if (!x) return x
    else if (typeof (x) === 'object') {
        if (Array.isArray(x)) {
            const ret = []
            for (const a of x) {
                ret.push(await deserializeReturnValue(a))
            }
            return ret
        }
        else if (x._type === 'ndarray') {
            const shape = x.shape
            const dtype = x.dtype
            let dataBuffer
            if (x.data_b64) {
                const data_b64 = x.data_b64
                dataBuffer = _base64ToArrayBuffer(data_b64)
                // dataBuffer = Buffer.from(data_b64, 'base64')
            }
            else if (x.data_gzip_b64) {
                const data_gzip_b64 = x.data_gzip_b64
                const aa = _base64ToArrayBuffer(data_gzip_b64)
                // const aa = Buffer.from(data_gzip_b64, 'base64')
                dataBuffer = gunzip(aa)
            }
            else {
                throw Error('Missing data_b64 or data_gzip_b64')
            }
            if (!dataBuffer) throw Error('No dataBuffer')
            // const data_b64 = x.data_b64 as string
            // const dataBuffer = _base64ToArrayBuffer(data_b64)
            if (dtype === 'float32') {
                return applyShape(new Float32Array(dataBuffer.buffer), shape)
            }
            else if (dtype === 'int32') {
                return applyShape(new Int32Array(dataBuffer.buffer), shape)
            }
            else if (dtype === 'int16') {
                return applyShape(new Int16Array(dataBuffer.buffer), shape)
            }
            else if (dtype === 'uint8') {
                return applyShape(new Uint8Array(dataBuffer.buffer), shape)
            }
            else if (dtype === 'uint32') {
                return applyShape(new Uint32Array(dataBuffer.buffer), shape)
            }
            else if (dtype === 'uint16') {
                return applyShape(new Uint16Array(dataBuffer.buffer), shape)
            }
            else if (dtype === 'float64') {
                if (shapeProduct(shape) > 100) {
                    console.info('WARNING: Using float64 array. It may be a good idea to cast the array to float32 if you do not need the full precision', shape)
                }
                return applyShape(new Float64Array(dataBuffer.buffer), shape)
            }
            else {
                throw Error(`Datatype not yet implemented for ndarray: ${dtype}`)
            }
        }
        else {
            const ret: {[key: string]: any} = {}
            for (const k in x) {
                ret[k] = await deserializeReturnValue(x[k])
            }
            return ret
        }
    }
    else return x
}
function _base64ToArrayBuffer(base64: string) {
    const binary_string = window.atob(base64)
    const bytes = new Uint8Array(binary_string.length)
    for (let i = 0; i < binary_string.length; i++) {
        bytes[i] = binary_string.charCodeAt(i)
    }
    return bytes
}
function shapeProduct(shape: number[]) {
    let ret = 1
    for (const a of shape) ret *= a
    return ret
}
function gunzip(x: Uint8Array) {
    return pako.inflate(x)
}
function applyShape(x: any, shape: number[]) {
    if (shape.length === 1) {
        if (shape[0] !== x.length) throw Error('Unexpected length of array')
        return Array.from(x)
    }
    else if (shape.length === 2) {
        const n1 = shape[0]
        const n2 = shape[1]
        if (n1 * n2 !== x.length) throw Error(`Unexpected length of array ${n1} x ${n2} <> ${x.length}`)
        const ret = []
        for (let i1 = 0; i1 < n1; i1++) {
            ret.push(Array.from(x.slice(i1 * n2, (i1 + 1) * n2)))
        }
        return ret
    }
    else if (shape.length === 3) {
        const n1 = shape[0]
        const n2 = shape[1]
        const n3 = shape[2]
        if (n1 * n2 * n3 !== x.length) throw Error('Unexpected length of array')
        const ret = []
        for (let i1 = 0; i1 < n1; i1++) {
            const A = []
            for (let i2 = 0; i2 < n2; i2++) {
                A.push(Array.from(x.slice(i1 * n2 * n3 + i2 * n3, i1 * n2 * n3 + ( i2 + 1 ) * n3)))
            }
            ret.push(A)
        }
        return ret
    }
    else if (shape.length === 4) {
        const n1 = shape[0]
        const n2 = shape[1]
        const n3 = shape[2]
        const n4 = shape[3]
        if (n1 * n2 * n3 * n4 !== x.length) throw Error('Unexpected length of array')
        const ret = []
        for (let i1 = 0; i1 < n1; i1++) {
            const A = []
            for (let i2 = 0; i2 < n2; i2++) {
                const B = []
                for (let i3 = 0; i3 < n3; i3++) {
                    B.push(Array.from(x.slice(i1 * n2 * n3 * n4 + i2 * n3 * n4 + i3 * n4, i1 * n2 * n3 * n4 + i2 * n3 * n4 + ( i3 + 1 ) * n4)))
                }
                A.push(B)
            }
            ret.push(A)
        }
        return ret
    }
    else if (shape.length === 5) {
        const n1 = shape[0]
        const n2 = shape[1]
        const n3 = shape[2]
        const n4 = shape[3]
        const n5 = shape[4]
        if (n1 * n2 * n3 * n4 * n5 !== x.length) throw Error('Unexpected length of array')
        const ret = []
        for (let i1 = 0; i1 < n1; i1++) {
            const A = []
            for (let i2 = 0; i2 < n2; i2++) {
                const B = []
                for (let i3 = 0; i3 < n3; i3++) {
                    const C = []
                    for (let i4 = 0; i4 < n4; i4++) {
                        C.push(Array.from(x.slice(i1 * n2 * n3 * n4 * n5 + i2 * n3 * n4 * n5 + i3 * n4 * n5 + i4 * n5, i1 * n2 * n3 * n4 * n5 + i2 * n3 * n4 * n5 + i3 * n4 * n5 + (i4 + 1) * n5)))
                    }
                    B.push(C)
                }
                A.push(B)
            }
            ret.push(A)
        }
        return ret
    }
    else {
        throw Error('Not yet implemented')
    }
}

export default deserializeReturnValue