class IncomingMultipartMessageManager {
    #onMessageHandlers: ((msg: ArrayBuffer) => void)[] = []
    #incomingMultipartMessages: {[id: string]: IncomingMultipartMessage} = {}
    constructor() {

    }
    onMessage(callback: (msg: ArrayBuffer) => void) {
        this.#onMessageHandlers.push(callback)
    }
    handleMessageFromPeer(d: ArrayBuffer) {
        const multipartInitialText = '/multipart/'
        const dec = new TextDecoder()
        const initialText = dec.decode(d.slice(0, multipartInitialText.length))
        if (initialText === multipartInitialText) {
            const initialText2 = dec.decode(d.slice(0, 1000))
            const a = initialText2.split('/')
            // `/multipart/${multipartId}/${i}/${numParts}/`
            const multipartId = a[2]
            const i = parseInt(a[3])
            const numParts = parseInt(a[4])
            if (!(multipartId in this.#incomingMultipartMessages)) {
                this.#incomingMultipartMessages[multipartId] = new IncomingMultipartMessage()
            }
            const x = this.#incomingMultipartMessages[multipartId]
            const payload = d.slice((a.slice(0, 5).join('/') + '/').length)
            x.handleMessageFromPeer(i, numParts, payload)
            if (x.isComplete) {
                this.#onMessageHandlers.forEach(cb => cb(x.getConcatenatedMessage()))
                delete this.#incomingMultipartMessages[multipartId]
            }
        }
        else {
            this.#onMessageHandlers.forEach(cb => cb(d))
        }
    }
}

const concatenateArrayBuffers = (buffers: ArrayBuffer[]) => {
    let totalLength = 0
    for (let i = 0; i < buffers.length; i++) {
        totalLength += buffers[i].byteLength
    }
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (let i = 0; i < buffers.length; i++) {
        result.set(new Uint8Array(buffers[i]), offset)
        offset += buffers[i].byteLength
    }
    return result.buffer
}

class IncomingMultipartMessage {
    #numParts: number | undefined
    #parts: {[i: number]: ArrayBuffer} = {}
    #numPartsReceived = 0
    constructor() {

    }
    public get isComplete() {
        if (!this.#numParts) return false
        return this.#numPartsReceived === this.#numParts
    }
    getConcatenatedMessage() {
        if (!this.#numParts) throw Error('Unexpected')
        const buffers: ArrayBuffer[] = []
        for (let i = 0; i < this.#numParts; i++) {
            buffers.push(this.#parts[i])
        }
        return concatenateArrayBuffers(buffers)
    }
    handleMessageFromPeer(i: number, numParts: number, payload: ArrayBuffer) {
        if (this.#numParts === undefined) this.#numParts = numParts
        if (numParts !== this.#numParts) {
            console.warn('In multipart message from peer: numParts does not match')
            return
        }
        if ((i < 0) || (i >= this.#numParts)) {
            console.warn('In multipart message from peer: invalid i')
            return
        }
        if (i in this.#parts) {
            console.warn('In multipart message from peer: already received part')
            return
        }
        this.#parts[i] = payload
        this.#numPartsReceived += 1
    }
}

export default IncomingMultipartMessageManager