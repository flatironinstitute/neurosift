import RtcshareFileSystemClient from "../../../../rtcshare/RtcshareDataManager/RtcshareFileSystemClient"

const chunkSize = 1000 * 1000 * 1 // 1MB chunks. Is this a good choice?

class JsonlClient {
    #initializing = false
    #chunks: {[chunkIndex: number]: string} = {}
    #header: number[] | undefined
    #recordPositions: number[] | undefined
    #fetchingChunks = new Set<number>()
    constructor(private uri: string, private rtcshareClient: RtcshareFileSystemClient) {

    }
    async initialize() {
        if (this.#initializing) {
            while (this.#initializing) {
                await sleepMsec(100)
            }
            return
        }
        this.#initializing = true
        try {
            let i = 0
            while (!this._haveEnoughDataToReadHeaderRecord()) {
                if (!(await this._fetchChunk(i))) {
                    throw Error('Unable to fetch chunk while trying to read header record')
                }
                i = i + 1
            }
            let headerRecordText = ''
            i = 0
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const aa = this.#chunks[i]
                if (aa.includes('\n')) {
                    headerRecordText += aa.slice(0, aa.indexOf('\n'))
                    break
                }
                else {
                    headerRecordText += aa
                }
                i += 1
            }
            this.#header = JSON.parse(headerRecordText)
            if (this.#header) {
                this.#recordPositions = []
                let pos = headerRecordText.length + 1
                for (const aa of this.#header) {
                    this.#recordPositions.push(pos)
                    pos += aa + 1
                }
                this.#recordPositions.push(pos)
            }
        }
        catch(err) {
            console.error('Error initializing annotations client', err)
        }
        finally {
            this.#initializing = false
        }
    }
    async getRecord(frameIndex: number): Promise<undefined | {[key: string]: any}> {
        await this.initialize()
        if (!this.#recordPositions) return undefined // unexpected
        if (frameIndex < 0) return undefined
        if (frameIndex + 1 >= this.#recordPositions.length) return undefined
        const d = await this._fetchData(this.#recordPositions[frameIndex], this.#recordPositions[frameIndex + 1] - 1)
        if (!d) return undefined
        return JSON.parse(d)
    }
    async getHeader() {
        await this.initialize()
        return this.#header
    }
    public get numRecords() {
        const h = this.#header
        if (!h) return 0
        return h.length
    }
    _haveEnoughDataToReadHeaderRecord() {
        let i = 0
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (this.#chunks[i]) {
                if (this.#chunks[i].includes('\n')) {
                    return true
                }
            }
            else {
                return false
            }
            i += 1
        }
    }
    async _fetchData(b1: number, b2: number) {
        const i1 = Math.floor(b1 / chunkSize)
        const i2 = Math.floor(b2 / chunkSize)
        let ret = ''
        for (let i = i1; i <= i2; i++) {
            let ch = await this._fetchChunk(i)
            if (!ch) return undefined
            if (i === i2) {
                ch = ch.slice(0, b2 - i * chunkSize)
            }
            if (i === i1) {
                ch = ch.slice(b1 - i * chunkSize)
            }
            ret += ch
        }
        // trigger getting the next chunk in advance (buffering)
        this._fetchChunk(i2 + 1)
        return ret
    }
    async _fetchChunk(i: number) {
        if (this.#chunks[i]) return this.#chunks[i]
        if (this.#fetchingChunks.has(i)) {
            while (this.#fetchingChunks.has(i)) {
                await sleepMsec(100)
            }
            return this.#chunks[i]
        }
        this.#fetchingChunks.add(i)
        try {
            const i1 = chunkSize * i
            const i2 = chunkSize * (i + 1)
            const buf = await this.rtcshareClient.readFile(this.uri.slice('rtcshare://'.length), i1, i2)
            // decode array buffer to string
            const decoder = new TextDecoder()
            const txt = decoder.decode(buf)
            // const txt = await getFileData(this.uri, () => {}, {startByte: i1, endByte: i2, responseType: 'text'})
            // const resp = await fetch(
            //     this.url,
            //     {
            //         method: 'GET',
            //         headers: {
            //             Range: `bytes=${i1}-${i2 - 1}`
            //         }
            //     }
            // )
            // const txt = await resp.text()
            if (txt) {
                this.#chunks[i] = txt
                return this.#chunks[i]
            }
            else {
                return undefined
            }
        }
        catch(err) {
            console.error('Error fetching chunk', err)
            return undefined
        }
        finally {
            this.#fetchingChunks.delete(i)
        }
    }
}

async function sleepMsec(msec: number) {
    return new Promise(resolve => {
        setTimeout(resolve, msec)
    })
}

export default JsonlClient