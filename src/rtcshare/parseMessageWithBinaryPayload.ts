const parseMessageWithBinaryPayload = (m: ArrayBuffer): {message: any, binaryPayload?: ArrayBuffer | undefined} => {
    const view = new Uint8Array(m)
    const ii = view.indexOf('\n'.charCodeAt(0))
    if (ii >= 0) {
        const dec = new TextDecoder('utf-8')
        const message = JSON.parse(dec.decode(m.slice(0, ii)))
        const binaryPayload = m.slice(ii + 1)
        return {message, binaryPayload}
    }
    else {
        const dec = new TextDecoder('utf-8')
        return {message: JSON.parse(dec.decode(m))}
    }
}

export default parseMessageWithBinaryPayload